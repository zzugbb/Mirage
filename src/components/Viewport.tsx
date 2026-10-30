import { useEffect, useRef, useState } from "react";
import { SceneEngine } from "../scene/engine";
import type { AppState } from "../domain";
import type { View } from "../scene/engine";
import { phaseLabels } from "../mechanics";
import type { PresentationPhase, SceneFeedback } from "../mechanics";

export function Viewport({
  state,
  onSelect,
  phase,
  onPhase,
  onFeedback,
  onManualControl,
  onError,
  paused,
  tourShot,
}: {
  state: AppState;
  onSelect: (id: string, enter?: boolean) => void;
  phase: PresentationPhase;
  onPhase: (phase: PresentationPhase) => void;
  onFeedback: (feedback: SceneFeedback) => void;
  onManualControl: () => void;
  onError: () => void;
  paused: boolean;
  tourShot: { revision: number; view: View; focus: boolean } | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<SceneEngine | null>(null);
  const latestSelect = useRef(onSelect);
  latestSelect.current = onSelect;
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<View>(
    state.level === "room" ? "interior" : "iso",
  );
  const anchors = useRef<HTMLDivElement>(null);
  const axes = useRef<HTMLDivElement>(null);
  const [detailShadows, setDetailShadows] = useState(true);
  const [shadowSupport, setShadowSupport] = useState(false);
  const [orbiting, setOrbiting] = useState(
    () => !matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [assetStatus, setAssetStatus] = useState("增强模型载入中…");
  const initial = useRef(state);
  const previousLevel = useRef<string | null>(null);
  const runtime = useRef({
    onError,
    onPhase,
    onFeedback,
    orbiting,
    detailShadows,
  });
  runtime.current = { onError, onPhase, onFeedback, orbiting, detailShadows };
  // 引擎仅在挂载或重试时创建；事件读取最新回调，模拟时钟更新不重建 WebGL。
  useEffect(() => {
    let active: SceneEngine | null = null;
    try {
      active = new SceneEngine(
        host.current!,
        initial.current,
        (id, enter) => latestSelect.current(id, enter),
        (message) => {
          setError(message);
          runtime.current.onError();
        },
        (nextPhase) => runtime.current.onPhase(nextPhase),
        (nextFeedback) => runtime.current.onFeedback(nextFeedback),
      );
      engine.current = active;
      active.autoOrbit = runtime.current.orbiting;
      active.onAssets = setAssetStatus;
      active.pipeline.enabled = runtime.current.detailShadows;
      setShadowSupport(active.pipeline.available);
      if (anchors.current) active.bindAnchors(anchors.current);
      if (axes.current) active.bindAxes(axes.current);
    } catch {
      runtime.current.onError();
      setError(
        "三维场景启动失败。请确认浏览器支持 WebGL 2，并已开启硬件加速。",
      );
    }
    return () => {
      active?.dispose();
      engine.current = null;
    };
  }, [revision]);
  useEffect(() => {
    engine.current?.update(state);
  }, [state]);
  useEffect(() => {
    if (engine.current) engine.current.paused = paused;
  }, [paused, revision]);
  useEffect(() => {
    setView(
      state.level === "room" && previousLevel.current !== state.level
        ? "interior"
        : "iso",
    );
    previousLevel.current = state.level;
  }, [state.level, state.focusRevision]);
  useEffect(() => {
    const active = engine.current;
    if (!active) return;
    if (tourShot) {
      setView(tourShot.view);
      active.view(tourShot.view, tourShot.focus);
    }
  }, [tourShot, revision]);
  useEffect(() => {
    if (engine.current) engine.current.autoOrbit = orbiting && !tourShot?.focus;
  }, [orbiting, tourShot?.focus, revision]);
  const takeControl = () => {
    // 原生 OrbitControls 在当前指针事件内响应；同步解除定格再交给它。
    if (engine.current) engine.current.paused = false;
    onManualControl();
  };
  const setCamera = (next: View) => {
    takeControl();
    setView(next);
    engine.current?.view(next);
  };
  return (
    <section className="viewport" aria-label="三维工作区">
      <div
        className="canvas-host"
        ref={host}
        onPointerDownCapture={takeControl}
        onWheelCapture={takeControl}
      />
      <div className="scene-anchors" ref={anchors}>
        {[
          ["rack-a01", "A01"],
          ["cooling-01", "制冷单元"],
          ["power-01", "配电柜"],
          ["cpu-01", "散热器"],
          ["memory-01", "内存模组"],
          ["fans-01", "风扇模组"],
          ["psu-02", "电源"],
        ].map(([id, label]) => (
          <button
            hidden
            key={id}
            data-anchor={id}
            className={`scene-anchor ${state.selected === id ? "selected" : ""}`}
            onClick={() => onSelect(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="scene-heading">
        <span className="overline">空间与结构探索</span>
        <h1>
          {state.level === "room"
            ? "01号机房"
            : state.level === "rack"
              ? "A01 机柜"
              : "SRV-01"}
        </h1>
        <p>
          {state.level === "room"
            ? "8 × 6 m · 机柜与设施"
            : state.level === "rack"
              ? "42U · 一台代表性设备"
              : phase === "device-ready"
                ? "2U 服务器 · 模组结构"
                : phaseLabels[phase]}
        </p>
      </div>
      <div className="view-switch" aria-label="标准视角">
        {(
          [
            ...(state.level === "room"
              ? ([["interior", "室内"]] as const)
              : []),
            ["iso", "等轴"],
            ["top", "俯视"],
            ["front", "前视"],
            ["right", "右视"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            aria-pressed={view === key}
            onClick={() => setCamera(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="model-status"
        role="status"
        hidden={assetStatus === "贡献模型 · 已载入"}
      >
        {assetStatus}
      </div>
      <div className="scene-index">
        <span>
          {state.level === "room" ? "01" : state.level === "rack" ? "02" : "03"}
        </span>
        <small>
          /
          {state.level === "room"
            ? "机房空间"
            : state.level === "rack"
              ? "机柜结构"
              : "设备结构"}
        </small>
      </div>
      <div className="axis" aria-hidden="true" ref={axes}>
        <i className="axis-y" data-axis="y">
          <span>Y</span>
        </i>
        <i className="axis-x" data-axis="x">
          <span>X</span>
        </i>
        <i className="axis-z" data-axis="z">
          <span>Z</span>
        </i>
      </div>
      <div className="canvas-toolbar">
        <button
          onClick={() => {
            takeControl();
            setView("iso");
            engine.current?.view("iso", true);
          }}
        >
          <span className="tool-symbol">⌖</span>聚焦选择
        </button>
        <span className="divider" />
        <button
          onClick={() => {
            takeControl();
            engine.current?.zoom(0.8);
          }}
          aria-label="放大"
        >
          ＋
        </button>
        <button
          onClick={() => {
            takeControl();
            engine.current?.zoom(1.25);
          }}
          aria-label="缩小"
        >
          −
        </button>
        <span className="divider" />
        <button
          onClick={() => setCamera(state.level === "room" ? "interior" : "iso")}
        >
          <span className="tool-symbol">↺</span>复位视角
        </button>
      </div>
      <button
        className="quality-button"
        aria-pressed={detailShadows && shadowSupport}
        disabled={!shadowSupport}
        title={
          shadowSupport
            ? "增强缝隙与接触处的阴影；可关闭以使用标准画质"
            : "当前浏览器使用标准阴影"
        }
        onClick={() => {
          const next = !detailShadows;
          setDetailShadows(next);
          if (engine.current) engine.current.pipeline.enabled = next;
        }}
      >
        细节阴影
      </button>
      <button
        className="orbit-button"
        aria-pressed={orbiting}
        onClick={() => {
          const next = !orbiting;
          setOrbiting(next);
          if (engine.current) {
            engine.current.autoOrbit = next && !tourShot?.focus;
            engine.current.controls.autoRotateSpeed = 0.35;
          }
        }}
      >
        {orbiting ? "Ⅱ 停止环绕" : "◌ 自动环绕"}
      </button>
      {error && (
        <div className="scene-error" role="alert">
          <h2>场景暂不可用</h2>
          <p>{error}</p>
          <button
            onClick={() => {
              setError("");
              initial.current = state;
              setRevision((value) => value + 1);
            }}
          >
            重新加载
          </button>
        </div>
      )}
    </section>
  );
}
