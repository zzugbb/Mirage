import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { PresentationPhase, SceneFeedback } from "./mechanics";
import { entityById, getPath } from "./domain";
import type { Action, Level } from "./domain";
import { createExperience, experienceTransition, tourSteps } from "./tour";
import { Viewport } from "./components/Viewport";
import { ObjectTree } from "./components/ObjectTree";
import { Inspector } from "./components/Inspector";
import { TourControls } from "./components/TourControls";
import { simulate } from "./simulation";
import type { InspectionView } from "./components/ReplayPanel";

export function App() {
  const [experience, control] = useReducer(
    experienceTransition,
    undefined,
    () =>
      createExperience(!matchMedia("(prefers-reduced-motion: reduce)").matches),
  );
  const { scene: state, tour } = experience;
  const sample = useMemo(
    () => simulate(state.time, state.replayCycle),
    [state.time, state.replayCycle],
  );
  const [inspectionView, setInspectionView] =
    useState<InspectionView>("object");
  const [showCooling, setShowCooling] = useState(true);
  const dispatch = useCallback((action: Action) => {
    control({ type: "scene", action });
    if (action.type === "locate" && matchMedia("(max-width: 580px)").matches)
      requestAnimationFrame(() =>
        document.querySelector(".viewport")?.scrollIntoView({ block: "start" }),
      );
  }, []);
  const [phase, setPhase] = useState<PresentationPhase>("closed");
  const [feedback, setFeedback] = useState<SceneFeedback | null>(null);
  const latestFeedback = useRef(feedback);
  latestFeedback.current = feedback;
  const [hidden, setHidden] = useState(() => document.hidden);
  const takeover = useCallback(() => control({ type: "takeover" }), []);
  const pauseTour = useCallback(() => control({ type: "tour-pause" }), []);
  const inspect = useCallback((view: InspectionView) => {
    control({ type: "takeover" });
    setInspectionView(view);
  }, []);
  const manual = tour.mode === "manual";
  const tourShot = useMemo(
    () =>
      manual
        ? null
        : {
            revision: tour.revision,
            view: tourSteps[tour.step].view,
            focus: !!tourSteps[tour.step].focus,
          },
    [manual, tour.revision, tour.step],
  );
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (tour.mode !== "playing" || hidden) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = (now - previous) / 1000;
      previous = now;
      if (!document.hidden)
        control({ type: "tour-tick", delta, feedback: latestFeedback.current });
    }, 100);
    return () => clearInterval(timer);
  }, [tour.mode, hidden]);
  useEffect(() => {
    if (!state.playing) return;
    const timer = window.setInterval(
      () => control({ type: "simulation-tick" }),
      1000,
    );
    return () => clearInterval(timer);
  }, [state.playing]);
  const select = useCallback(
    (id: string, enter = false) => {
      const entity = entityById(id);
      if (!entity) return;
      setInspectionView("object");
      if (enter && ["room", "rack", "device"].includes(entity.kind))
        dispatch({ type: "navigate", level: entity.kind as Level });
      else if (
        (state.level === "device" &&
          entity.kind !== "device" &&
          entity.kind !== "part") ||
        (state.level === "rack" && entity.kind === "facility")
      ) {
        dispatch({
          type: "navigate",
          level: entity.kind === "rack" ? "rack" : "room",
        });
        dispatch({ type: "select", id });
      } else dispatch({ type: "select", id });
    },
    [state.level, dispatch],
  );
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dispatch({ type: "back" });
        return;
      }
      if (
        (event.target as HTMLElement).matches(
          "input, textarea, select, [contenteditable=true]",
        )
      )
        return;
      if (event.key.toLowerCase() === "f") dispatch({ type: "focus" });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [dispatch]);
  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="./" aria-label="Mirage 浮城首页">
          <span className="brand-mark" aria-hidden="true" />
          <b>
            Mirage <span>浮城</span>
          </b>
        </a>
        <span className="header-divider" />
        <span className="header-current">空间探索</span>
        <button
          className={`data-source replay-entry status-${sample.alarm?.active ? sample.alarm.severity : "normal"}`}
          onClick={() =>
            inspect(sample.alarm?.active ? "alarms" : "temperature")
          }
          aria-label={`运行回放，模拟进风温度${sample.temperatureStatus}`}
        >
          <i className="status-dot" />
          模拟 · 温度{sample.temperatureStatus}
          <span>运行回放 ↗</span>
        </button>
      </header>
      <div className="breadcrumb">
        <button onClick={() => dispatch({ type: "reset" })}>示意园区</button>
        {getPath(state).map((id, index) => (
          <span key={id}>
            {" "}
            /{" "}
            <button
              aria-current={
                index === getPath(state).length - 1 ? "page" : undefined
              }
              onClick={() =>
                entityById(id)!.kind === "part"
                  ? dispatch({ type: "select", id })
                  : dispatch({
                      type: "navigate",
                      level: entityById(id)!.kind as Level,
                    })
              }
            >
              {entityById(id)!.name}
            </button>
          </span>
        ))}
        {state.level !== "room" && (
          <button
            className="back-button"
            onClick={() => dispatch({ type: "back" })}
          >
            ← 返回上级
          </button>
        )}
      </div>
      <TourControls
        experience={experience}
        feedback={feedback}
        hidden={hidden}
        dispatch={control}
      />
      <main
        className={inspectionView !== "object" ? "has-telemetry" : undefined}
      >
        <ObjectTree state={state} onSelect={select} sample={sample} />
        <Viewport
          state={state}
          phase={phase}
          onPhase={setPhase}
          onSelect={select}
          onFeedback={setFeedback}
          onManualControl={takeover}
          onError={pauseTour}
          paused={tour.mode === "paused" || hidden}
          tourShot={tourShot}
          sample={sample}
          showCooling={showCooling}
        />
        <Inspector
          state={state}
          phase={phase}
          dispatch={dispatch}
          sample={sample}
          view={inspectionView}
          onViewChange={inspect}
          showCooling={showCooling}
          onCoolingChange={setShowCooling}
        />
      </main>
      <footer className="app-footer">
        <span>
          <i className="status-dot" />
          原创场景 · 授权模型 <span className="footer-muted">· 单位 m</span>
        </span>
        <span className="interaction-hint">
          拖动旋转 <b>·</b> 滚轮缩放 <b>·</b> 双击进入 <b>·</b> F 聚焦 / Esc
          返回
        </span>
        <span className="prototype-label">原型 0.1</span>
      </footer>
    </div>
  );
}
