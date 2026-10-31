import { useEffect, useRef, useState } from "react";
import type { AppState } from "../domain";
import type { PresentationPhase, SceneFeedback } from "../mechanics";
import { SceneEngine } from "../scene/engine";
import type { View } from "../scene/engine";
import { devices, racks, rackForDevice } from "../installation";
import type { SpatialReading } from "../spatial";
import type { ReviewLayer } from "../review-model";
import { reviewPresentation } from "../review-model";
import { partsForDevice, modelForDevice } from "../catalog";
import { reviewSpatialMarks } from "../review-spatial";
import { ReviewDataGeometry } from "../scene/review-data";
import { signalFor, signalStyles } from "../status";

export function ReviewScene({
  state,
  layer,
  readings,
  onSelect,
  onFocus,
  onPhase,
  onFeedback,
  shotRevision,
  tourShot,
  onTakeover,
}: {
  state: AppState;
  layer: ReviewLayer;
  readings: Map<string, SpatialReading>;
  onSelect: (id: string, enter?: boolean) => void;
  onFocus: () => void;
  onPhase: (phase: PresentationPhase) => void;
  onFeedback: (feedback: SceneFeedback) => void;
  shotRevision: number;
  tourShot: { revision: number; view: View; focus: boolean } | null;
  onTakeover: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const anchors = useRef<HTMLDivElement>(null);
  const engine = useRef<SceneEngine | null>(null);
  const initial = useRef(state);
  const dataGeometry = useRef<ReviewDataGeometry | null>(null);
  const previousScene = useRef(state);
  const currentState = useRef(state);
  currentState.current = state;
  const callbacks = useRef({ onSelect, onPhase, onFeedback });
  callbacks.current = { onSelect, onPhase, onFeedback };
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [assets, setAssets] = useState("loading");
  const [view, setView] = useState<View>("interior");
  const [quality, setQuality] = useState(true);
  const [supported, setSupported] = useState(false);
  const [orbit, setOrbit] = useState(false);
  const presentation = reviewPresentation(layer, state.level);
  const model = modelForDevice(state.deviceId);
  const representation =
    model.category === "server"
      ? state.explosion > 0
        ? "部件展开"
        : state.coverOpen
          ? "内部装配 · 上盖已移开"
          : "完整装配 · 可单独开盖"
      : assets !== "ready"
        ? "内部配置示意 · 外观模型尚未就绪"
        : state.explosion === 0
          ? "外观模型 · 展开可看配置示意"
          : "内部配置示意";
  useEffect(() => {
    let active: SceneEngine | null = null;
    setAssets("loading");
    try {
      active = new SceneEngine(
        host.current!,
        initial.current,
        (id, enter) => callbacks.current.onSelect(id, enter),
        setError,
        (phase) => callbacks.current.onPhase(phase),
        (feedback) => callbacks.current.onFeedback(feedback),
      );
      active.autoOrbit = false;
      active.retainMaterials = true;
      const overlay = new ReviewDataGeometry();
      active.models.root.add(overlay.root);
      dataGeometry.current = overlay;
      active.onAssets = setAssets;
      engine.current = active;
      setSupported(active.pipeline.available);
    } catch {
      active?.dispose();
      setError("三维场景启动失败，请检查 WebGL 2 与硬件加速。");
    }
    const visibility = () => {
      if (active) active.paused = document.hidden;
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      dataGeometry.current?.dispose();
      dataGeometry.current = null;
      active?.dispose();
      engine.current = null;
    };
  }, [retry]);
  useEffect(() => {
    const active = engine.current;
    active?.update(state);
    const rackLabel = active?.models.rack.getObjectByName("rack-label");
    if (rackLabel) rackLabel.visible = state.level === "room";
    if (
      active &&
      state.level === "rack" &&
      state.focusRevision !== previousScene.current.focusRevision
    ) {
      // 资源定位保留机柜上下文，避免自动贴到封闭设备内部。
      active.view("iso", false);
      if (
        previousScene.current.level === "rack" &&
        previousScene.current.deviceId !== state.deviceId
      ) {
        active.camera.position.copy(active.targetPosition);
        active.controls.target.copy(active.targetLook);
        active.controls.update();
        active.moving = false;
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
          host.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 220,
            easing: "ease-out",
          });
      }
    }
    previousScene.current = state;
  }, [state, retry]);
  useEffect(() => {
    // 评审预设使用相同的空间构图，便于直接比较图层；普通操作不触发。
    const next = currentState.current.level === "room" ? "interior" : "iso";
    engine.current?.view(next);
    setView(next);
  }, [shotRevision, retry]);
  useEffect(() => {
    if (engine.current) {
      engine.current.telemetry.mode = presentation.mode;
      // 评审只展示已有设备测点，不把预设冷却关系冒充气流。
      engine.current.telemetry.enabled = false;
      engine.current.telemetry.root.visible = false;
      engine.current.showLabels = true;
    }
  }, [presentation.mode, retry]);
  useEffect(() => {
    if (engine.current) engine.current.pipeline.enabled = quality;
  }, [quality, retry]);
  useEffect(() => {
    if (engine.current) engine.current.autoOrbit = orbit;
  }, [orbit, retry]);
  useEffect(() => {
    setView(state.level === "room" ? "interior" : "iso");
  }, [state.level]);
  useEffect(() => {
    if (!tourShot) return;
    engine.current?.view(tourShot.view, tourShot.focus);
    setView(tourShot.view);
  }, [tourShot?.revision, retry]);
  useEffect(() => {
    dataGeometry.current?.update(reviewSpatialMarks(state, layer, readings));
  }, [state, layer, readings, retry]);
  const scope = readings.get(
    state.level === "room" ? "room-01" : rackForDevice(state.deviceId).id,
  )!;
  const candidates =
    state.level === "room"
      ? racks
      : state.level === "rack"
        ? devices.filter((d) => d.rackId === rackForDevice(state.deviceId).id)
        : partsForDevice(state.deviceId).filter(
            (p) => !["lid", "duct", "cable"].includes(p.node),
          );
  const labels = [...candidates]
    .filter(
      (item) => layer !== "alarms" || (readings.get(item.id)?.alarm ?? 0) > 0,
    )
    .sort(
      (a, b) =>
        Number(b.id === state.selected) - Number(a.id === state.selected) ||
        (layer === "overview" || layer === "alarms"
          ? (readings.get(b.id)?.alarm ?? 0) - (readings.get(a.id)?.alarm ?? 0)
          : layer === "environment"
            ? (readings.get(b.id)?.temperature ?? -Infinity) -
              (readings.get(a.id)?.temperature ?? -Infinity)
            : (readings.get(b.id)?.power ?? -Infinity) -
              (readings.get(a.id)?.power ?? -Infinity)),
    )
    .slice(0, state.level === "room" ? 6 : 3);
  const labelKey = labels.map((r) => r.id).join(":");
  useEffect(() => {
    if (anchors.current) engine.current?.bindAnchors(anchors.current);
    // 投影先由引擎完成；按选择和异常优先级移除碰撞标签。
    let frame = 0;
    const declutter = () => {
      const sceneRect = host.current?.parentElement?.getBoundingClientRect();
      const accepted = [
        ...(host.current
          ?.closest(".review-workspace")
          ?.querySelectorAll<HTMLElement>(
            ".review-scene-caption, .review-camera, .review-legend, .review-scene-tools, .review-loading, .review-inspector:not([hidden]), .review-object-actions",
          ) ?? []),
      ].map((element) => element.getBoundingClientRect());
      for (const label of anchors.current?.querySelectorAll<HTMLElement>(
        "button",
      ) ?? []) {
        label.style.visibility = "";
        if (label.hidden) continue;
        const rect = label.getBoundingClientRect();
        if (
          (sceneRect &&
            (rect.left < sceneRect.left + 8 ||
              rect.right > sceneRect.right - 8 ||
              rect.top < sceneRect.top + 8 ||
              rect.bottom > sceneRect.bottom - 8)) ||
          accepted.some(
            (r) =>
              rect.left < r.right + 8 &&
              rect.right > r.left - 8 &&
              rect.top < r.bottom + 8 &&
              rect.bottom > r.top - 8,
          )
        )
          label.style.visibility = "hidden";
        else accepted.push(rect);
      }
      frame = requestAnimationFrame(declutter);
    };
    frame = requestAnimationFrame(declutter);
    return () => cancelAnimationFrame(frame);
  }, [labelKey, retry]);
  const camera = (next: View) => {
    onTakeover();
    setOrbit(false);
    setView(next);
    engine.current?.view(next);
  };
  return (
    <div className="review-scene" aria-label="三维场景">
      <div
        className="review-canvas"
        ref={host}
        onPointerDownCapture={() => {
          setOrbit(false);
          onTakeover();
        }}
        onWheelCapture={() => {
          setOrbit(false);
          onTakeover();
        }}
      />
      <div className="review-scene-caption">
        <span>
          {state.level === "room"
            ? "01 号机房 / 8 机柜 · 84 设备"
            : state.level === "rack"
              ? `${rackForDevice(state.deviceId).name} / 42U`
              : `${model.name} / ${representation}`}
        </span>
        <strong>{presentation.title}</strong>
        {state.level !== "device" && (
          <div className="review-scene-readings" aria-label="场景运行读数">
            <span>
              <b>{scope.lifecycleCounts.running}</b>
              <small>运行设备</small>
            </span>
            <span>
              <b>
                {scope.power === null ? "—" : (scope.power / 1000).toFixed(2)}
                <i>kW</i>
              </b>
              <small>已知输入功耗</small>
            </span>
            <span>
              <b>
                {scope.temperature?.toFixed(1) ?? "—"}
                <i>°C</i>
              </b>
              <small>
                最高进风 · {scope.coverageTemperature}/{scope.count}
              </small>
            </span>
          </div>
        )}
        <details className="review-view-explanation">
          <summary>读图说明</summary>
          <p>{presentation.description}</p>
        </details>
      </div>
      <div className="review-camera" aria-label="标准视角">
        {(
          [
            ["interior", "全景"],
            ["iso", "等轴"],
            ["top", "俯视"],
            ["front", "前视"],
          ] as const
        )
          .filter(([id]) => state.level === "room" || id !== "interior")
          .map(([id, text]) => (
            <button
              key={id}
              aria-pressed={view === id}
              onClick={() => camera(id)}
            >
              {text}
            </button>
          ))}
      </div>
      <div className="review-anchors" ref={anchors}>
        {labels.map((item) => {
          const reading = readings.get(item.id)!;
          const signal = signalStyles[signalFor(reading)];
          return (
            <button
              hidden
              key={item.id}
              data-anchor={item.id}
              data-anchor-kind={
                state.level === "room"
                  ? "rack"
                  : state.level === "rack"
                    ? "device"
                    : "part"
              }
              className={`review-anchor ${item.id === state.selected ? "selected" : ""}`}
              onClick={() => onSelect(item.id)}
              onDoubleClick={() => onSelect(item.id, true)}
            >
              <b>
                {state.level === "device" ? item.name : item.name.split(" ")[0]}
              </b>
              {layer !== "overview" && layer !== "alarms" && (
                <span>
                  {reading.quality !== "valid"
                    ? reading.quality === "stale"
                      ? "数据过期"
                      : "无有效数据"
                    : layer === "environment"
                      ? reading.temperature === null
                        ? "—"
                        : `${reading.count > 1 ? "最高 " : ""}${reading.temperature.toFixed(1)} °C`
                      : reading.power === null
                        ? "—"
                        : reading.power >= 1000
                          ? `${(reading.power / 1000).toFixed(2)} kW`
                          : `${reading.power.toFixed(0)} W`}
                </span>
              )}
              {layer === "power" &&
                reading.quality === "valid" &&
                reading.power !== null &&
                reading.budget !== null &&
                reading.budget > 0 && (
                  <em>
                    {((reading.power / reading.budget) * 100).toFixed(0)}% 预算
                  </em>
                )}
              {(layer === "overview" || layer === "alarms") && (
                <em style={{ color: signal.color }}>
                  {reading.alarmCount > 0
                    ? `${signal.icon} 告警 ${reading.alarmCount}台`
                    : `${signal.icon} ${state.level === "device" ? "模型" : ""}${signal.label}`}
                </em>
              )}
            </button>
          );
        })}
      </div>
      {assets !== "ready" && !error && (
        <div className="review-loading" role="status">
          {assets === "loading"
            ? "详细模型加载中 · 可继续浏览"
            : "部分模型不可用 · 已使用简化结构"}
        </div>
      )}
      <div
        className="review-scene-tools"
        onPointerDownCapture={onTakeover}
        onKeyDownCapture={onTakeover}
      >
        <button onClick={onFocus}>
          聚焦选择 <kbd>F</kbd>
        </button>
        <details>
          <summary>画面</summary>
          <div>
            <label>
              <input
                type="checkbox"
                checked={orbit}
                onChange={(e) => setOrbit(e.target.checked)}
              />
              镜头环绕
            </label>
            <label>
              <input
                type="checkbox"
                checked={quality && supported}
                disabled={!supported}
                onChange={(e) => setQuality(e.target.checked)}
              />
              细节阴影
            </label>
          </div>
        </details>
      </div>
      <div className="review-legend" aria-label="当前图层图例">
        {layer === "overview" || layer === "alarms" ? (
          <div className="review-status-key">
            {state.level === "device" && (
              <small>部件模型评估 · 非独立告警</small>
            )}
            {layer !== "alarms" && (
              <span className="legend-normal">● 正常</span>
            )}
            <span className="legend-warning">▲ 预警</span>
            <span className="legend-critical">◆ 严重</span>
            {layer !== "alarms" && <span>⊘ 离线</span>}
          </div>
        ) : (
          <>
            <span>
              {layer === "environment"
                ? state.level === "device"
                  ? "表面温度 · °C · 模型推导"
                  : "U 位色条 · 设备进风温度"
                : "机柜标尺 · 功耗 / 预算占比"}
            </span>
            <i className={`review-scale ${layer}`} />
            <div>
              <span>{layer === "environment" ? "20 °C" : "0%"}</span>
              <span>
                {layer === "environment"
                  ? state.level === "device"
                    ? "80 °C"
                    : "45 °C"
                  : "100%"}
              </span>
            </div>
            <small>
              {layer === "environment"
                ? "蓝色低温 → 暖色高温"
                : "蓝色低占比 → 暖色高占比"}
            </small>
            {layer === "power" && <small>灰色：数据或预算未定义</small>}
          </>
        )}
      </div>
      {error && (
        <div className="review-error" role="alert">
          <h2>场景暂不可用</h2>
          <p>{error}</p>
          <button
            onClick={() => {
              setError("");
              initial.current = state;
              setRetry((r) => r + 1);
            }}
          >
            重新加载场景
          </button>
        </div>
      )}
    </div>
  );
}
