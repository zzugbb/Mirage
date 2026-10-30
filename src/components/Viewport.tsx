import { modelForDevice } from "../catalog";
import { qualityNames } from "../status";
import { observationColor } from "../scene/metric-color";
import { racks, devices, rackForDevice } from "../installation";
import { spatialSnapshot } from "../spatial";
import { signalStyles, signalFor } from "../status";
import { useEffect, useMemo, useRef, useState } from "react";
import { SceneEngine } from "../scene/engine";
import type { Action, AppState } from "../domain";
import type { View } from "../scene/engine";
import type { PresentationPhase, SceneFeedback } from "../mechanics";
import { ObservationTabs } from "./ObservationTabs";
import { ObservationDock } from "./ObservationDock";
import type { InspectionView } from "./ReplayPanel";
import type { SimulationSnapshot } from "../simulation";

export function Viewport({
  state,
  onSelect,
  onPhase,
  onFeedback,
  onManualControl,
  onError,
  paused,
  tourShot,
  sample,
  showCooling,
  inspectionView,
  onViewChange,
  dispatch,
}: {
  state: AppState;
  onSelect: (id: string, enter?: boolean) => void;
  onPhase: (phase: PresentationPhase) => void;
  onFeedback: (feedback: SceneFeedback) => void;
  onManualControl: () => void;
  onError: () => void;
  paused: boolean;
  tourShot: { revision: number; view: View; focus: boolean } | null;
  sample: SimulationSnapshot;
  showCooling: boolean;
  inspectionView: InspectionView;
  onViewChange: (view: InspectionView) => void;
  dispatch: React.Dispatch<Action>;
}) {
  const spatial = useMemo(
    () => spatialSnapshot(state.time, state.replayCycle, state.deviceId),
    [state.time, state.replayCycle, state.deviceId],
  );
  const currentReading = spatial.readings.get(state.deviceId)!;
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
  const [chartExpanded, setChartExpanded] = useState(false);
  const [labels, setLabels] = useState(false);
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
    if (engine.current) {
      engine.current.telemetry.enabled = showCooling;
      engine.current.telemetry.mode = inspectionView;
      engine.current.showLabels = labels;
    }
  }, [showCooling, inspectionView, labels, revision]);
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
    if (engine.current) engine.current.autoOrbit = false;
    setOrbiting(false);
    onManualControl();
  };
  const setCamera = (next: View) => {
    takeControl();
    setView(next);
    engine.current?.view(next);
  };
  return (
    <section
      className={`viewport observation-${inspectionView} ${chartExpanded ? "chart-expanded" : ""}`}
      aria-label="三维工作区"
    >
      <div className="workspace-bar">
        <h1>
          {state.level === "room"
            ? "01号机房"
            : state.level === "rack"
              ? rackForDevice(state.deviceId).name
              : state.deviceId.toUpperCase()}
        </h1>
        <ObservationTabs view={inspectionView} onChange={onViewChange} />
      </div>
      <div
        id="observation-content"
        role="tabpanel"
        aria-labelledby={`inspection-${inspectionView}`}
        className="scene-stage"
      >
        <div
          className="canvas-host"
          ref={host}
          onPointerDownCapture={takeControl}
          onWheelCapture={takeControl}
        />
        <div
          className="scene-anchors"
          ref={anchors}
          onPointerDown={takeControl}
        >
          <button
            hidden
            data-anchor="srv-01"
            className={`scene-anchor metric-anchor status-${currentReading.alarm === 2 ? "critical" : currentReading.alarm === 1 ? "warning" : "normal"}`}
            onClick={() => dispatch({ type: "locate", id: state.deviceId })}
            title="定位运行观察设备（模拟）"
          >
            {inspectionView === "power"
              ? currentReading.power === null
                ? `数据${qualityNames[currentReading.quality]}`
                : `${currentReading.power.toFixed(1)} W · 整机输入`
              : inspectionView === "alarms"
                ? `温度${sample.temperatureStatus} · ${sample.temperature.toFixed(1)} °C`
                : currentReading.temperature === null
                  ? `数据${qualityNames[currentReading.quality]}`
                  : `进风 ${currentReading.temperature.toFixed(1)} °C`}{" "}
            <small>
              {currentReading.quality === "stale"
                ? `过期 · t+${currentReading.observedAt}s`
                : ""}
            </small>
          </button>
          {racks.map((rack) => {
            const reading = spatial.readings.get(rack.id)!;
            const signal = signalFor(reading);
            return (
              <button
                hidden
                key={rack.id}
                data-anchor={rack.id}
                data-anchor-kind="rack"
                className={`scene-anchor signal-anchor ${state.selected === rack.id ? "selected" : ""}`}
                style={
                  {
                    "--marker": observationColor(
                      reading,
                      inspectionView,
                    ).getStyle(),
                  } as React.CSSProperties
                }
                onClick={() => onSelect(rack.id)}
                onDoubleClick={() => onSelect(rack.id, true)}
                title={`${rack.name} · ${signalStyles[signal].label} · ${reading.alarmCount} 台告警（模拟）`}
              >
                <b>{rack.name.slice(0, 3)}</b>
                <span>
                  {inspectionView === "temperature" ? (
                    reading.temperature === null ? (
                      "—"
                    ) : (
                      `${reading.temperature.toFixed(1)}°`
                    )
                  ) : inspectionView === "power" ? (
                    reading.power === null ? (
                      "—"
                    ) : (
                      `${(reading.power / 1000).toFixed(1)}kW`
                    )
                  ) : (
                    <>
                      {signalStyles[signal].icon}
                      {reading.alarmCount || ""}
                    </>
                  )}
                </span>
              </button>
            );
          })}
          {devices.map((device) => {
            const reading = spatial.readings.get(device.id)!;
            const signal = signalFor(reading);
            const metric =
              reading.quality !== "valid"
                ? qualityNames[reading.quality]
                : inspectionView === "temperature"
                  ? reading.temperature === null
                    ? "—"
                    : `${reading.temperature.toFixed(1)}°C`
                  : inspectionView === "power"
                    ? reading.power === null
                      ? "—"
                      : `${reading.power.toFixed(0)}W`
                    : signalStyles[signal].label;
            return (
              <button
                hidden
                key={device.id}
                data-anchor={device.id}
                data-anchor-kind="device"
                className="scene-anchor device-signal-anchor"
                style={
                  {
                    "--marker": observationColor(
                      reading,
                      inspectionView,
                    ).getStyle(),
                  } as React.CSSProperties
                }
                onPointerDown={takeControl}
                onClick={() => onSelect(device.id)}
                onDoubleClick={() => onSelect(device.id, true)}
                title={`${device.name} · ${signalStyles[signal].label} · 模拟`}
              >
                <b>{device.id.toUpperCase()}</b>
                <span>{metric}</span>
              </button>
            );
          })}
          {[
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
        {inspectionView === "temperature" &&
          showCooling &&
          state.level === "room" && (
            <div className="relation-legend">
              <i />
              冷却关联 · {sample.coolingCapacity}%
            </div>
          )}
        {inspectionView === "status" && (
          <div className="scene-overview">
            <span className="scene-overview-kicker">MIRAGE / 浮城</span>
            <strong>
              {state.level === "room"
                ? `${racks.length} 机柜 · ${devices.length} 设备`
                : state.level === "rack"
                  ? `42U · ${devices.filter((device) => device.rackId === rackForDevice(state.deviceId).id).length} 台设备`
                  : `${modelForDevice(state.deviceId).name} / ${state.deviceId.toUpperCase()}`}
            </strong>
            <p>
              <i style={{ background: signalStyles.normal.color }} />
              正常 <i style={{ background: signalStyles.warning.color }} />
              预警 <i style={{ background: signalStyles.critical.color }} />
              严重 <i style={{ background: signalStyles.offline.color }} />
              离线 / 未配置
            </p>
          </div>
        )}
        <div className="view-switch" aria-label="标准视角">
          {(
            [
              ...(state.level === "room"
                ? ([["interior", "总览"]] as const)
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
            {state.level === "room"
              ? "01"
              : state.level === "rack"
                ? "02"
                : "03"}
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
            onClick={() =>
              setCamera(state.level === "room" ? "interior" : "iso")
            }
          >
            <span className="tool-symbol">↺</span>复位视角
          </button>
        </div>
        <details className="scene-settings">
          <summary>画面设置</summary>
          <div>
            <button
              className="labels-button"
              aria-pressed={labels}
              onClick={() => setLabels((value) => !value)}
            >
              结构标签
            </button>
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
          </div>
        </details>
      </div>
      {
        <ObservationDock
          state={state}
          sample={sample}
          view={inspectionView === "object" ? "status" : inspectionView}
          dispatch={dispatch}
          expanded={chartExpanded}
          onExpanded={setChartExpanded}
        />
      }
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
