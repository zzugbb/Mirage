import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  createReview,
  reviewTransition,
  reviewLayers,
  reviewHistory,
} from "./review-model";
import type { ReviewMetric, ReviewShot } from "./review-model";
import type { Action, Level } from "./domain";
import { entityById, getPath, presentationKey } from "./domain";
import { spatialSnapshot, selectedReading } from "./spatial";
import { devices, deviceById } from "./installation";
import {
  partsForDevice,
  subpartsForDevice,
  modelForDevice,
  unitLabel,
} from "./catalog";
import {
  qualityNames,
  lifecycleNames,
  signalFor,
  signalStyles,
  signalText,
} from "./status";
import type { PresentationPhase, SceneFeedback } from "./mechanics";
import { ResourceNavigator } from "./components/ResourceNavigator";
import { ResourceActions } from "./components/ResourceActions";
import { ReviewAlerts } from "./components/ReviewAlerts";
import { resourceCatalog, resourceOpenLabel } from "./review-resources";
import { ReviewScene } from "./components/ReviewScene";
import { ReviewTrend } from "./components/ReviewTrend";
import "./design-review.css";
import "./resource-navigation.css";
import "./review-polish.css";

const shots: { id: ReviewShot; name: string; note: string }[] = [
  { id: "overview", name: "机房浏览", note: "材质、定位与状态的主次关系" },
  { id: "environment", name: "温度分布", note: "同一空间，切换温度观察" },
  { id: "assembly", name: "部件展开", note: "结构操作与数据图层共存" },
  { id: "time", name: "运行回看", note: "曲线、事件与三维共用时间" },
];
const temperatureText = (value: number | null | undefined) =>
  value == null ? "—" : value.toFixed(1);
const powerText = (value: number | null | undefined) =>
  value == null
    ? "—"
    : value >= 1000
      ? (value / 1000).toFixed(2)
      : value.toFixed(1);

export function DesignReview() {
  const [review, control] = useReducer(
    reviewTransition,
    undefined,
    createReview,
  );
  const { scene: state, layer } = review;
  const [shot, setShot] = useState<ReviewShot>("overview");
  const [shotRevision, setShotRevision] = useState(0);
  const [phase, setPhase] = useState<PresentationPhase>("closed");
  const [navigation, setNavigation] = useState(false);
  const [inspectorMode, setInspectorMode] = useState<
    "auto" | "open" | "closed"
  >("auto");
  const [feedback, setFeedback] = useState<SceneFeedback | null>(null);
  const ready =
    !review.pendingId &&
    !!feedback?.settled &&
    feedback.key === presentationKey(state);
  useEffect(() => {
    if (
      review.pendingId &&
      feedback?.settled &&
      feedback.key === presentationKey(state)
    )
      control({ type: "navigation-ready", key: feedback.key });
  }, [review.pendingId, feedback, state]);
  const selectedId = review.selectedId ?? state.selected;
  const inspectorOpen =
    inspectorMode === "open" ||
    (inspectorMode === "auto" && selectedId !== "room-01");
  const inspected = { ...state, selected: selectedId };
  const resource = resourceCatalog(state.deviceId).find(
    (item) => item.id === selectedId,
  );
  const preview = selectedId !== state.selected;
  const [metricChoice, setMetricChoice] = useState<ReviewMetric>("temperature");
  const spatial = useMemo(
    () => spatialSnapshot(state.time, state.replayCycle, state.deviceId),
    [state.time, state.replayCycle, state.deviceId],
  );
  const reading = selectedReading(inspected, spatial.readings);
  const room = spatial.readings.get("room-01")!;
  const entity = entityById(selectedId)!;
  const component = entity.kind === "part";
  const signal = signalStyles[signalFor(reading)];
  const readingStatus =
    !component && reading?.alarm
      ? `温度告警 · ${signal.label}`
      : component && reading?.quality === "valid"
        ? `模型评估 · ${signal.label}`
        : signalText(reading);
  const metric: ReviewMetric =
    layer === "power"
      ? "power"
      : layer === "environment"
        ? "temperature"
        : metricChoice;
  const series = useMemo(
    () => reviewHistory(selectedId, state.deviceId, metric),
    [selectedId, state.deviceId, metric],
  );
  const dispatch = useCallback((action: Action) => {
    control({ type: "scene", action });
    if (action.type === "locate" || action.type === "navigate")
      setNavigation(false);
  }, []);
  useEffect(() => {
    const previous = document.title;
    document.title = "Mirage · 浮城 — 工作区设计评审";
    return () => {
      document.title = previous;
    };
  }, []);
  const pick = useCallback((id: string) => control({ type: "pick", id }), []);
  const openResource = useCallback((id: string) => {
    control({ type: "open-resource", id });
    setNavigation(false);
    requestAnimationFrame(() => {
      const center = document.querySelector<HTMLElement>(".review-center");
      center?.focus({ preventScroll: true });
      if (matchMedia("(max-width: 600px)").matches)
        center?.scrollIntoView({ block: "start" });
    });
  }, []);
  const focusResource = useCallback(
    (id: string) => control({ type: "focus-resource", id }),
    [],
  );
  const select = useCallback(
    (id: string, enter = false) => {
      if (enter) openResource(id);
      else pick(id);
    },
    [openResource, pick],
  );
  useEffect(() => {
    if (!state.playing) return;
    const timer = setInterval(() => {
      if (!document.hidden) dispatch({ type: "tick" });
    }, 1000);
    return () => clearInterval(timer);
  }, [state.playing, dispatch]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const popup = document.querySelector<HTMLDetailsElement>(
          ".review-presets[open], .review-about[open], .review-view-explanation[open], .review-scene-tools details[open]",
        );
        if (popup) {
          event.preventDefault();
          popup.open = false;
          popup.querySelector("summary")?.focus();
          return;
        }
      }
      if (event.key === "Escape" && navigation) {
        event.preventDefault();
        setNavigation(false);
        return;
      }
      if (
        (event.target as HTMLElement).matches(
          "input,select,textarea,[contenteditable=true]",
        )
      )
        return;
      if (event.key === "Escape") {
        dispatch({ type: "back" });
      }
      if (event.key.toLowerCase() === "f") focusResource(selectedId);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [navigation, dispatch, focusResource, selectedId]);
  const loadShot = (next: ReviewShot) => {
    setInspectorMode("auto");
    setShot(next);
    setShotRevision((value) => value + 1);
    control({ type: "shot", shot: next });
    setNavigation(false);
  };
  const showInspector = (open: boolean) => {
    setInspectorMode(open ? "open" : "closed");
    requestAnimationFrame(() => {
      if (!matchMedia("(max-width: 600px)").matches) return;
      document
        .querySelector<HTMLElement>(
          open ? ".review-inspector" : ".review-center",
        )
        ?.scrollIntoView({
          block: "start",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
    });
  };
  const parts = [
    ...partsForDevice(state.deviceId),
    ...subpartsForDevice(state.deviceId),
  ];
  const scopeDevices =
    entity.kind === "facility"
      ? []
      : devices.filter((d) =>
          entity.kind === "room" || entity.kind === "rack"
            ? entity.kind === "room" || d.rackId === entity.id
            : d.id === (entity.kind === "device" ? selectedId : state.deviceId),
        );
  const events = scopeDevices
    .flatMap((d) =>
      spatial.readings.get(d.id)?.quality === "valid"
        ? spatial.samples
            .get(d.id)!
            .events.map((e) => ({ ...e, deviceId: d.id }))
        : [],
    )
    .sort((a, b) => b.time - a.time || a.deviceId.localeCompare(b.deviceId));
  const currentLayer = reviewLayers.find((l) => l.id === layer)!;
  const currentValue =
    metric === "temperature" ? reading?.temperature : reading?.power;
  const unit =
    metric === "temperature"
      ? "°C"
      : (reading?.power ?? 0) >= 1000
        ? "kW"
        : "W";
  const coverage =
    metric === "temperature"
      ? reading?.coverageTemperature
      : reading?.coveragePower;
  const metricLabel =
    metric === "temperature" ? reading?.temperatureLabel : reading?.powerLabel;
  return (
    <div
      className="design-review"
      data-time={state.time}
      data-selection={selectedId}
      data-scene-level={state.level}
      data-scene-device={state.deviceId}
      data-focus-revision={state.focusRevision}
      data-explosion={state.explosion}
      data-cover-open={state.coverOpen}
      data-layer={layer}
      data-analysis={review.analysis}
    >
      <header className="review-header">
        <a
          className="review-brand"
          href="?review"
          aria-label="Mirage 浮城设计评审首页"
        >
          Mirage<span>浮城</span>
        </a>
        <div className="review-location">
          <button
            className="review-nav-toggle"
            aria-expanded={navigation}
            onClick={() => setNavigation((v) => !v)}
          >
            资源导航 {navigation ? "−" : "+"}
          </button>
          <nav aria-label="空间路径">
            {getPath(state).map((id, i) => (
              <span key={id}>
                {i > 0 && <i>/</i>}
                <button
                  aria-current={id === state.selected ? "location" : undefined}
                  onClick={() =>
                    entityById(id)?.kind === "part"
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
          </nav>
          {state.level !== "room" && (
            <button onClick={() => dispatch({ type: "back" })}>
              ← 返回上级
            </button>
          )}
        </div>
        <div className="review-header-actions">
          <span className="review-simulation">确定性模拟 · 120s</span>
          <details className="review-presets">
            <summary>演示</summary>
            <nav aria-label="载入评审画面">
              {shots.map((s, i) => (
                <button
                  key={s.id}
                  aria-label={`载入${s.name}`}
                  aria-pressed={shot === s.id}
                  title={`${s.note}；载入预设将重置选择与时间`}
                  onClick={(e) => {
                    loadShot(s.id);
                    e.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                >
                  <small>0{i + 1}</small>
                  {s.name}
                </button>
              ))}
              <p>载入示例将重置对象、时间和结构。</p>
            </nav>
          </details>
          <details className="review-about">
            <summary>关于</summary>
            <div>
              <strong>场景与设计边界</strong>
              <p>
                原创演示空间，所有运行数据由统一的 120
                秒确定性脚本生成。设备测点为模拟，部件温度与功耗为模型推导，无真实管理接口或
                CFD。
              </p>
              <p>
                本入口是可交互设计稿，复用已有模型与逻辑。温度切片、气流、湿度/露点、空间容量和连接视图尚未实施。
              </p>
              <a href="./">打开当前原型 ↗</a>
            </div>
          </details>
        </div>
      </header>
      <div
        className={`review-workspace ${navigation ? "navigation-open" : ""}`}
        role="main"
        aria-label="设计评审工作区"
      >
        <ResourceNavigator
          state={state}
          selected={selectedId}
          readings={spatial.readings}
          ready={ready}
          onPick={pick}
          onOpen={openResource}
          onFocus={focusResource}
          onBack={() => dispatch({ type: "back" })}
        />
        <section
          className="review-center"
          aria-label="连续工作区"
          tabIndex={-1}
        >
          <div className="review-layerbar">
            <div className="review-layers" aria-label="观察视图">
              {reviewLayers.map((l) => (
                <button
                  key={l.id}
                  aria-pressed={layer === l.id}
                  title={l.description}
                  onClick={() => control({ type: "layer", layer: l.id })}
                >
                  {l.name}
                  {l.id === "alarms" && (
                    <small className="review-view-count">
                      {room.alarmCount}
                    </small>
                  )}
                </button>
              ))}
            </div>
            <button
              className="review-inspector-toggle"
              aria-expanded={inspectorOpen}
              onClick={() => showInspector(!inspectorOpen)}
            >
              {inspectorOpen ? "收起对象详情" : "对象详情"}
            </button>
          </div>
          <ReviewScene
            shotRevision={shotRevision}
            state={state}
            layer={layer}
            readings={spatial.readings}
            onSelect={select}
            onFocus={() => focusResource(selectedId)}
            onPhase={setPhase}
            onFeedback={setFeedback}
          />
          {layer === "alarms" && !review.analysis && (
            <ReviewAlerts
              readings={spatial.readings}
              selected={selectedId}
              time={state.time}
              onPick={pick}
              onLocate={focusResource}
            />
          )}
          <ResourceActions
            state={state}
            selected={selectedId}
            ready={ready}
            phase={phase}
            dispatch={dispatch}
            onOpen={openResource}
            onExtract={(id) => control({ type: "extract-resource", id })}
          />
          <div className="review-clock">
            <button
              onClick={() => dispatch({ type: "play" })}
              aria-label={state.playing ? "暂停模拟" : "播放模拟"}
            >
              {state.playing ? "Ⅱ" : "▷"}
            </button>
            <time>
              {String(Math.floor(state.time / 60)).padStart(2, "0")}:
              {String(state.time % 60).padStart(2, "0")}
            </time>
            <input
              aria-label="共享模拟时间"
              type="range"
              min="0"
              max="120"
              step="1"
              value={state.time}
              onChange={(e) =>
                dispatch({ type: "seek", time: Number(e.target.value) })
              }
            />
            <span>02:00</span>
            <button
              aria-expanded={review.analysis}
              onClick={() =>
                control({ type: "analysis", value: !review.analysis })
              }
            >
              {review.analysis ? "收起分析 ↓" : "时间分析 ↑"}
            </button>
          </div>
          {review.analysis && (
            <section className="review-analysis" aria-label="时间分析">
              <div className="review-analysis-head">
                <strong>
                  {entity.name} <small>{metricLabel}</small>
                </strong>
                <span>回看 t+{state.time}s</span>
                <button
                  aria-label="关闭时间分析"
                  onClick={() => control({ type: "analysis", value: false })}
                >
                  ×
                </button>
              </div>
              <div className="review-analysis-body">
                <div>
                  <ReviewTrend
                    series={series}
                    metric={metric}
                    time={state.time}
                    onSeek={(time) => dispatch({ type: "seek", time })}
                  />
                  <div className="review-playback">
                    <button onClick={() => dispatch({ type: "replay" })}>
                      重新播放
                    </button>
                    <label>
                      速度{" "}
                      <select
                        aria-label="评审播放速度"
                        value={state.playbackRate}
                        onChange={(e) =>
                          dispatch({
                            type: "rate",
                            rate: Number(e.target.value) as 1 | 2 | 4,
                          })
                        }
                      >
                        {[1, 2, 4].map((rate) => (
                          <option key={rate} value={rate}>
                            {rate}×
                          </option>
                        ))}
                      </select>
                    </label>
                    <small>空缺保留 · 曲线仅显示至当前时间</small>
                  </div>
                </div>
                <div className="review-events">
                  <h3>
                    已发生事件 <span>{events.length}</span>
                  </h3>
                  {events.length ? (
                    events.map((event) => (
                      <button
                        key={`${event.deviceId}:${event.id}`}
                        onClick={() =>
                          dispatch({ type: "seek", time: event.time })
                        }
                      >
                        <time>{event.time}s</time>
                        <span>
                          {event.title}
                          <small>{event.deviceId.toUpperCase()}</small>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p>当前范围没有已发生事件</p>
                  )}
                </div>
              </div>
            </section>
          )}
        </section>
        <aside
          className="review-inspector"
          aria-label="所选对象概览"
          hidden={!inspectorOpen}
        >
          <div className="review-inspector-title">
            <span>所选对象</span>
            <button
              aria-label="收起对象详情"
              onClick={() => showInspector(false)}
            >
              ×
            </button>
            <span>
              {entity.kind === "part"
                ? "部件"
                : entity.kind === "device"
                  ? "设备"
                  : entity.kind === "rack"
                    ? "机柜"
                    : entity.kind === "room"
                      ? "机房"
                      : "设施"}
            </span>
          </div>
          <div className="review-identity">
            <small>
              {entity.kind === "device"
                ? modelForDevice(selectedId).name
                : component
                  ? `${state.deviceId.toUpperCase()} / 部件模型`
                  : "MIRAGE / 浮城"}
            </small>
            <h1>{resource?.name ?? entity.name}</h1>
            {resource && (
              <p className="review-resource-location">{resource.location}</p>
            )}
            {preview && (
              <div className="review-resource-preview">
                <p>正在预览其他位置的资源</p>
                <button
                  disabled={!ready}
                  onClick={() => openResource(selectedId)}
                >
                  {resourceOpenLabel(state, selectedId)} ↗
                </button>
              </div>
            )}
            <span className="review-signal" style={{ color: signal.color }}>
              {signal.icon} {readingStatus}
            </span>
          </div>
          {reading ? (
            <>
              <div className="review-primary-metric">
                <span>{metricLabel}</span>
                <strong>
                  {metric === "temperature"
                    ? temperatureText(currentValue)
                    : powerText(currentValue)}
                  <small>{unit}</small>
                </strong>
                <div>
                  <span>
                    {reading.quality !== "valid"
                      ? qualityNames[reading.quality]
                      : component
                        ? "模型推导 · 无独立测点"
                        : `有效覆盖 ${coverage}/${reading.count}`}
                  </span>
                  <time>
                    {reading.observedAt == null
                      ? "无观测时间"
                      : `t+${reading.observedAt}s`}
                  </time>
                </div>
                {layer === "power" && (
                  <p className="review-budget">
                    {reading.budget !== null &&
                    reading.budget > 0 &&
                    reading.power !== null
                      ? `预算 ${powerText(reading.budget)} ${reading.budget >= 1000 ? "kW" : "W"} · 当前占比 ${((reading.power / reading.budget) * 100).toFixed(1)}%`
                      : "未定义有效预算 · 不计算占比"}
                  </p>
                )}
              </div>
              <div className="review-secondary-metrics">
                <div>
                  <span>
                    {metric === "temperature"
                      ? component
                        ? "部件功耗分配"
                        : "输入功耗"
                      : component
                        ? "模型表面温度"
                        : reading.count > 1
                          ? "最高进风温度"
                          : "设备进风温度"}
                  </span>
                  <b>
                    {metric === "temperature"
                      ? powerText(reading.power)
                      : temperatureText(reading.temperature)}
                    <small>
                      {metric === "temperature"
                        ? reading.power !== null && reading.power >= 1000
                          ? "kW"
                          : "W"
                        : "°C"}
                    </small>
                  </b>
                </div>
                <div>
                  <span>{component ? "整机告警" : "告警设备"}</span>
                  <button
                    onClick={() => control({ type: "layer", layer: "alarms" })}
                  >
                    {component
                      ? spatial.readings.get(state.deviceId)!.alarmCount
                      : reading.alarmCount}
                    <small>台 ↗</small>
                  </button>
                </div>
              </div>
              <section className="review-mini-trend">
                <div>
                  <h2>对象趋势</h2>
                  {layer === "overview" ? (
                    <div>
                      {(["temperature", "power"] as const).map((m) => (
                        <button
                          key={m}
                          aria-pressed={metric === m}
                          onClick={() => setMetricChoice(m)}
                        >
                          {m === "temperature" ? "温度" : "功耗"}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <small>{currentLayer.name}</small>
                  )}
                </div>
                <ReviewTrend
                  series={series}
                  metric={metric}
                  time={state.time}
                  compact
                />
                <button
                  className="review-expand-trend"
                  onClick={() => control({ type: "analysis", value: true })}
                >
                  展开曲线与事件 <span>↗</span>
                </button>
              </section>
            </>
          ) : (
            <p className="review-empty-data">该设施尚未定义遥测数据。</p>
          )}
          {state.level === "device" && (
            <label className="review-part-select">
              选择部件
              <select
                aria-label="评审选择部件"
                value={parts.some((p) => p.id === selectedId) ? selectedId : ""}
                onChange={(e) => select(e.target.value || state.deviceId)}
              >
                <option value="">整台设备</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.slot}
                  </option>
                ))}
              </select>
            </label>
          )}
          <details className="review-detail">
            <summary>配置与数据详情</summary>
            {reading && (
              <div className="review-quality">
                <span>
                  {reading.count > 1
                    ? `${reading.lifecycleCounts.running} 运行 · ${reading.lifecycleCounts.maintenance} 维护 · ${reading.lifecycleCounts.stopped} 停机`
                    : lifecycleNames[reading.lifecycle]}
                </span>
                <span>
                  {reading.count > 1
                    ? `${reading.qualityCounts.offline} 离线 · ${reading.qualityCounts.stale} 过期 · ${reading.qualityCounts.missing} 未配置`
                    : `数据${qualityNames[reading.quality]}`}
                </span>
              </div>
            )}
            <p>{entity.description}</p>
            {deviceById(selectedId) && (
              <p>
                {unitLabel(selectedId)} · {modelForDevice(selectedId).name} ·{" "}
                {modelForDevice(selectedId).category === "server"
                  ? "贡献几何与适配部件"
                  : "简化参数化结构，内部精度待补齐"}
              </p>
            )}
            {component && (
              <p>
                代表表面温度来自进风加温升假设，功耗按部件分配。没有环境湿度或独立遥测。
              </p>
            )}
            {reading && (
              <>
                <p>{reading.source}</p>
                <p>
                  温度覆盖 {reading.coverageTemperature}/{reading.count}
                  ；功耗覆盖 {reading.coveragePower}/{reading.count}
                  。过期读数不进入当前汇总，停机零功耗为有效值。
                </p>
              </>
            )}
          </details>
        </aside>
      </div>
    </div>
  );
}
