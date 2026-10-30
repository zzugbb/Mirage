import { signalText } from "./status";
import { spatialSnapshot } from "./spatial";
import { rackForDevice } from "./installation";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { PresentationPhase, SceneFeedback } from "./mechanics";
import { entityById, getPath, subparts } from "./domain";
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
    () => {
      const initial = createExperience(
        !matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      initial.scene.time = 60;
      return initial;
    },
  );
  const { scene: state, tour } = experience;
  const sample = useMemo(
    () => simulate(state.time, state.replayCycle, state.deviceId),
    [state.time, state.replayCycle, state.deviceId],
  );
  const scope = useMemo(
    () =>
      spatialSnapshot(
        state.time,
        state.replayCycle,
        state.deviceId,
      ).readings.get(
        state.level === "room"
          ? "room-01"
          : state.level === "rack"
            ? rackForDevice(state.deviceId).id
            : state.deviceId,
      )!,
    [state.time, state.replayCycle, state.deviceId, state.level],
  );
  const [inspectionView, setInspectionView] =
    useState<InspectionView>("status");
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
      if (entity.kind === "part" && state.level !== "device") {
        dispatch({ type: "locate", id });
        dispatch({ type: "explode", amount: 1 });
      } else if (enter && ["room", "rack", "device"].includes(entity.kind))
        dispatch({ type: "navigate", level: entity.kind as Level, id });
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
      } else {
        dispatch({ type: "select", id });
        if (subparts.some((part) => part.id === id) && state.explosion === 0)
          dispatch({ type: "explode", amount: 1 });
      }
    },
    [state.level, state.explosion, dispatch],
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
        <TourControls
          experience={experience}
          feedback={feedback}
          hidden={hidden}
          dispatch={control}
        />
        <span className="header-divider" />
        <span className="header-current">空间探索</span>
        <button
          className={`data-source replay-entry status-${scope.alarm === 2 ? "critical" : scope.alarm === 1 ? "warning" : "normal"}`}
          onClick={() => inspect("status")}
          aria-label={`运行状态，${signalText(scope)}，模拟告警 ${scope.alarmCount} 台设备`}
        >
          <i className="status-dot" />
          {signalText(scope)} {scope.alarmCount ? `${scope.alarmCount} 台` : ""}
          <span>运行概览 ↗</span>
        </button>
        <details className="source-info">
          <summary aria-label="关于场景">ⓘ</summary>
          <div>
            <strong>关于浮城</strong>
            <p>
              原创演示空间与通用设备配置。运行数据由确定性脚本生成，部件温度与分项功耗来自模型分配；没有真实管理接口、部件传感器或
              CFD 结果。
            </p>
            <p>
              结构以维护部件为粒度。未安装的选配件不占用槽位。资产来源与许可见项目说明。
            </p>
          </div>
        </details>
      </header>
      <div className="breadcrumb">
        <button onClick={() => dispatch({ type: "reset" })}>园区</button>
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
                      id,
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
      <main
        className={inspectionView !== "object" ? "has-telemetry" : undefined}
      >
        <ObjectTree state={state} onSelect={select} sample={sample} />
        <Viewport
          state={state}
          onPhase={setPhase}
          onSelect={select}
          onFeedback={setFeedback}
          onManualControl={takeover}
          onError={pauseTour}
          paused={tour.mode === "paused" || hidden}
          tourShot={tourShot}
          sample={sample}
          showCooling={showCooling}
          inspectionView={inspectionView}
          onViewChange={inspect}
          dispatch={dispatch}
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
          单位 m
        </span>
        <span className="interaction-hint">
          拖动旋转 <b>·</b> 滚轮缩放 <b>·</b> 双击进入 <b>·</b> F 聚焦 / Esc
          返回
        </span>
        <span className="prototype-label">MIRAGE · 浮城</span>
      </footer>
    </div>
  );
}
