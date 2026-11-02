import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  sliceSettings,
  sliceRackRows,
  temperatureSlice,
  verticalTemperatureSlice,
} from "../temperature-slice";
import type { SliceOrientation } from "../temperature-slice";
import { TemperatureSliceGeometry } from "../scene/temperature-slice";
import { airflowSnapshot, airflowVisualTime } from "../airflow";
import { AirflowGeometry } from "../scene/airflow";

const initialSliceControls = () => ({
  orientation: "horizontal" as SliceOrientation,
  height: sliceSettings.height.initial,
  rowId: sliceRackRows[0].id,
  distance: sliceSettings.vertical.distance.initial,
});

export function ReviewScene({
  state,
  layer,
  readings,
  selectedId,
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
  selectedId: string;
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
  const sliceGeometry = useRef<TemperatureSliceGeometry | null>(null);
  const airflowGeometry = useRef<AirflowGeometry | null>(null);
  const clockEpoch = useRef(performance.now());
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
  const [sliceControls, setSliceControls] = useState(initialSliceControls);
  const slice = useMemo(
    () =>
      layer === "environment" && state.level === "room"
        ? sliceControls.orientation === "horizontal"
          ? temperatureSlice(readings, sliceControls.height)
          : verticalTemperatureSlice(
              readings,
              sliceControls.rowId,
              sliceControls.distance,
            )
        : null,
    [readings, sliceControls, layer, state.level],
  );
  const sliceRow = sliceRackRows.find((row) => row.id === slice?.rowId);
  const airflow = useMemo(
    () =>
      layer === "environment" && state.level === "room"
        ? airflowSnapshot(
            state.time,
            readings,
            selectedId,
            state.deviceId,
            slice?.rowId,
          )
        : null,
    [
      layer,
      state.level,
      state.time,
      state.deviceId,
      readings,
      selectedId,
      slice?.rowId,
    ],
  );
  useEffect(() => {
    clockEpoch.current = performance.now();
  }, [state.time, state.playing, state.playbackRate]);
  const positionSettings =
    slice?.orientation === "vertical"
      ? sliceSettings.vertical.distance
      : sliceSettings.height;
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
      const thermal = new TemperatureSliceGeometry();
      active.models.root.add(thermal.root);
      sliceGeometry.current = thermal;
      const flow = new AirflowGeometry();
      active.models.root.add(flow.root);
      airflowGeometry.current = flow;
      active.onRenderFrame = (now, roomReady) => {
        flow.animate(
          airflowVisualTime(
            currentState.current,
            now - clockEpoch.current,
            active!.paused || active!.reducedMotion,
          ),
          active!.reducedMotion,
          roomReady,
        );
      };
      active.onAssets = setAssets;
      engine.current = active;
      setSupported(active.pipeline.available);
    } catch {
      active?.dispose();
      setError("三维场景启动失败，请检查 WebGL 2 与硬件加速。");
    }
    const visibility = () => {
      clockEpoch.current = performance.now();
      if (active) active.paused = document.hidden;
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      dataGeometry.current?.dispose();
      dataGeometry.current = null;
      sliceGeometry.current?.dispose();
      sliceGeometry.current = null;
      airflowGeometry.current?.dispose();
      airflowGeometry.current = null;
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
    setSliceControls(initialSliceControls());
    engine.current?.view(next);
    setView(next);
  }, [shotRevision, retry]);
  useEffect(() => {
    if (engine.current) {
      engine.current.telemetry.mode = presentation.mode;
      // 旧遥测关系线与新的布置路径分开，避免重复叠加。
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
  useEffect(() => {
    sliceGeometry.current?.update(slice);
  }, [slice, retry]);
  useEffect(() => {
    airflowGeometry.current?.update(airflow);
  }, [airflow, retry]);
  const scope = readings.get(
    state.level === "room" ? "room-01" : rackForDevice(state.deviceId).id,
  )!;
  const candidates =
    state.level === "room"
      ? sliceRow
        ? racks.filter((rack) => sliceRow.rackIds.includes(rack.id))
        : racks
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
            ? (slice
                ? (slice.rackEstimates.get(b.id) ?? -Infinity)
                : (readings.get(b.id)?.temperature ?? -Infinity)) -
              (slice
                ? (slice.rackEstimates.get(a.id) ?? -Infinity)
                : (readings.get(a.id)?.temperature ?? -Infinity))
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
    <div
      className="review-scene"
      aria-label="三维场景"
      data-slice-height={slice?.height}
      data-slice-orientation={slice?.orientation}
      data-slice-row={slice?.rowId}
      data-slice-position={slice ? (slice.height ?? slice.distance) : undefined}
      data-airflow-targets={airflow?.routes
        .map((route) => route.deviceId)
        .join(",")}
      data-airflow-input={airflow?.coolingCapacity}
    >
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
            ? sliceRow
              ? `${sliceRow.name} / ${sliceRow.rackIds.length} 机柜 · ${devices.filter((device) => sliceRow.rackIds.includes(device.rackId)).length} 设备`
              : "01 号机房 / 8 机柜 · 84 设备"
            : state.level === "rack"
              ? `${rackForDevice(state.deviceId).name} / 42U`
              : `${model.name} / ${representation}`}
        </span>
        <strong>
          {slice
            ? slice.orientation === "horizontal"
              ? "进风温度水平切片 · 局部插值"
              : `进风温度垂直切片 · ${sliceRow!.name}`
            : presentation.title}
        </strong>
        {state.level !== "device" && !airflow && (
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
        {airflow && (
          <div className="review-airflow-caption" aria-label="气流路径示意">
            <p>
              气流示意 · 冷却输入 <b>{airflow.coolingCapacity}%</b>
            </p>
            <div>
              <span className="flow-supply">→ 送风</span>
              <span className="flow-through">⇢ 穿柜</span>
              <span className="flow-return">⇢ 回风假设</span>
            </div>
            <small>{airflow.label}</small>
          </div>
        )}
        <details className="review-view-explanation">
          <summary>读图说明</summary>
          <p>
            {slice
              ? `${slice.orientation === "horizontal" ? "水平切片估计当前高度的进风温度。" : `垂直切片显示${sliceRow!.name}正面 ${sliceSettings.height.min.toFixed(2)}–${sliceSettings.height.max.toFixed(2)} 米高度的进风差异，滑杆调整离柜距离；标签取切面纵向最高估计。俯视时切面呈侧边，可切到前视观察。`}色条仍对应逐台设备。输入为同一时间的有效模拟读数；代表位置按U位中心假设，非独立环境测点。最近位置离线、过期或超出插值范围时留空；不推断机柜排风或整间机房温度。`
              : presentation.description}
            {airflow &&
              " 气流只示意已登记冷却关系的代表路径，当前同向布置不构成封闭冷热通道。端点为制冷单元逻辑代表位置，穿柜方向为配置假设；线条明暗对照冷却输入，不代表风量、风速或排风温度。选中对象可查看对应路径，停机或数据无效对象仅保留静态方向。"}
          </p>
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
                      ? slice
                        ? slice.rackEstimates.get(item.id) == null
                          ? slice.orientation === "horizontal"
                            ? "本层无估计"
                            : "切面无估计"
                          : `${slice.orientation === "horizontal" ? "本层约" : "切面最高约"} ${slice.rackEstimates.get(item.id)!.toFixed(1)} °C`
                        : reading.temperature === null
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
      <div
        className={`review-legend ${slice ? "review-slice-legend" : ""}`}
        aria-label="当前图层图例"
      >
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
            <span className={slice ? "review-slice-heading" : undefined}>
              {slice ? (
                <>
                  <span>进风温度</span>
                  <select
                    aria-label="温度切片方向"
                    value={sliceControls.orientation}
                    onChange={(event) => {
                      onTakeover();
                      setSliceControls((current) => ({
                        ...current,
                        orientation: event.target.value as SliceOrientation,
                      }));
                    }}
                  >
                    <option value="horizontal">水平切片</option>
                    <option value="vertical">垂直切片</option>
                  </select>
                  {slice.orientation === "vertical" && (
                    <select
                      aria-label="温度切片机柜排"
                      value={sliceControls.rowId}
                      onChange={(event) => {
                        onTakeover();
                        setSliceControls((current) => ({
                          ...current,
                          rowId: event.target.value,
                        }));
                      }}
                    >
                      {sliceRackRows.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              ) : (
                <>
                  {layer === "environment"
                    ? state.level === "device"
                      ? "表面温度 · °C · 模型推导"
                      : "U 位色条 · 设备进风温度"
                    : "机柜标尺 · 功耗 / 预算占比"}
                </>
              )}
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
            {slice && (
              <div className="review-slice-controls" aria-label="温度切片控制">
                <label htmlFor="temperature-slice-position">
                  {slice.orientation === "horizontal"
                    ? "切片高度"
                    : "距机柜正面"}{" "}
                  <output htmlFor="temperature-slice-position">
                    {(slice.height ?? slice.distance).toFixed(2)} m
                  </output>
                </label>
                <input
                  id="temperature-slice-position"
                  type="range"
                  aria-label={
                    slice.orientation === "horizontal"
                      ? "温度切片高度"
                      : "垂直切片离柜距离"
                  }
                  aria-valuetext={`${(slice.height ?? slice.distance).toFixed(2)} 米`}
                  min={positionSettings.min}
                  max={positionSettings.max}
                  step={positionSettings.step}
                  value={slice.height ?? slice.distance}
                  onChange={(event) => {
                    onTakeover();
                    const value = Number(event.target.value);
                    setSliceControls((current) =>
                      slice.orientation === "horizontal"
                        ? { ...current, height: value }
                        : { ...current, distance: value },
                    );
                  }}
                />
                <span
                  className="review-slice-stats"
                  role="img"
                  aria-label={`${slice.orientation === "horizontal" ? "当前高度" : sliceRow!.name}有效输入 ${slice.validInputs}/${slice.totalInputs} 台设备；切片估计${slice.min === null ? "无有效值" : `${slice.min.toFixed(1)} 至 ${slice.max!.toFixed(1)} 摄氏度`}`}
                >
                  <span>
                    {slice.orientation === "horizontal" ? "本层" : "本排"}有效{" "}
                    {slice.validInputs}/{slice.totalInputs} 台
                  </span>
                  <span>
                    {slice.min === null
                      ? "无有效估计"
                      : `${slice.min.toFixed(1)}–${slice.max!.toFixed(1)} °C`}
                  </span>
                </span>
                <small>
                  {slice.orientation === "horizontal"
                    ? "局部插值示意 · 空白无估计"
                    : `高 ${sliceSettings.height.min.toFixed(2)}–${sliceSettings.height.max.toFixed(2)} m · 插值示意 · 空白无估计`}
                </small>
              </div>
            )}
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
