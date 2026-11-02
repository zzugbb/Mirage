import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  createReview,
  createWorkspace,
  reviewTransition,
  reviewLayers,
  reviewHistories,
  reviewEvents,
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
import { ReviewAnalysis } from "./components/ReviewAnalysis";
import { tourSteps } from "./tour";
import "./design-review.css";
import "./resource-navigation.css";
import "./review-polish.css";
import "./workspace-layout.css";

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

export function Workspace({ reviewMode = false }: { reviewMode?: boolean }) {
  const [review, control] = useReducer(
    reviewTransition,
    reviewMode,
    (paused) =>
      paused
        ? createReview()
        : createWorkspace(
            matchMedia("(prefers-reduced-motion: reduce)").matches,
          ),
  );
  const { scene: state, layer, tour } = review;
  const [shot, setShot] = useState<ReviewShot>("overview");
  const [shotRevision, setShotRevision] = useState(0);
  const [phase, setPhase] = useState<PresentationPhase>("closed");
  const [navigation, setNavigation] = useState(
    () => matchMedia("(min-width: 1001px)").matches,
  );
  const closeNavigation = useCallback(() => {
    setNavigation(false);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>(".review-resource-toggle")
        ?.focus(),
    );
  }, []);
  const toggleNavigation = () => {
    takeover();
    if (navigation) closeNavigation();
    else {
      setNavigation(true);
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLInputElement>(".resource-search input")
          ?.focus(),
      );
    }
  };
  const [inspectorMode, setInspectorMode] = useState<
    "auto" | "open" | "closed"
  >("auto");
  const [feedback, setFeedback] = useState<SceneFeedback | null>(null);
  const latestFeedback = useRef(feedback);
  latestFeedback.current = feedback;
  const [hidden, setHidden] = useState(() => document.hidden);
  const takeover = useCallback(() => control({ type: "takeover" }), []);
  const tourShot = useMemo(
    () =>
      tour.mode === "manual"
        ? null
        : {
            revision: tour.revision,
            view: tourSteps[tour.step].view,
            focus: !!tourSteps[tour.step].focus,
          },
    [tour.mode, tour.revision, tour.step],
  );
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (tour.mode !== "playing" || hidden) return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (!document.hidden)
        control({
          type: "tour-tick",
          delta: (now - previous) / 1000,
          feedback: latestFeedback.current,
        });
      previous = now;
    }, 250);
    return () => clearInterval(timer);
  }, [tour.mode, hidden]);
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
  const histories = useMemo(
    () => reviewHistories(selectedId, state.deviceId),
    [selectedId, state.deviceId],
  );
  const series = histories[metric];
  const dispatch = useCallback((action: Action) => {
    control({ type: "scene", action });
    if (
      (action.type === "locate" || action.type === "navigate") &&
      matchMedia("(max-width: 1000px)").matches
    )
      setNavigation(false);
  }, []);
  useEffect(() => {
    const previous = document.title;
    document.title = reviewMode
      ? "Mirage · 浮城 — 工作区设计评审"
      : "Mirage · 浮城 — 三维工作区";
    return () => {
      document.title = previous;
    };
  }, [reviewMode]);
  const pick = useCallback((id: string) => control({ type: "pick", id }), []);
  const openResource = useCallback((id: string) => {
    control({ type: "open-resource", id });
    if (matchMedia("(max-width: 1000px)").matches) setNavigation(false);
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
        closeNavigation();
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
  }, [navigation, dispatch, focusResource, selectedId, closeNavigation]);
  const loadShot = (next: ReviewShot) => {
    setInspectorMode("auto");
    setShot(next);
    setShotRevision((value) => value + 1);
    control({ type: "shot", shot: next });
    setNavigation(false);
  };
  const showInspector = (open: boolean) => {
    takeover();
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
  const events = review.analysis
    ? reviewEvents(
        scopeDevices.map((device) => device.id),
        state.time,
        state.replayCycle,
      )
    : [];
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
      data-tour={tour.mode}
      data-tour-step={tour.step}
      data-tour-pending={review.pendingTour}
    >
      <header className="review-header">
        <a
          className="review-brand"
          href={reviewMode ? "?review" : "./"}
          aria-label="Mirage 浮城首页"
        >
          Mirage<span>浮城</span>
        </a>
        <div className="review-location">
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
          <details className="review-presets">
            <summary>
              {tour.mode === "playing" ? "巡游中 · 演示" : "演示"}
            </summary>
            <nav aria-label="载入演示画面">
              <button
                className="workspace-tour-toggle"
                disabled={
                  review.pendingTour || (tour.mode === "manual" && !ready)
                }
                aria-label={
                  review.pendingTour
                    ? "正在准备巡游"
                    : tour.mode === "playing"
                      ? "暂停巡游"
                      : tour.mode === "paused"
                        ? "继续巡游"
                        : "开始巡游"
                }
                title={
                  tour.mode === "manual"
                    ? "从机房开始巡游，保留当前模拟时间"
                    : `${tourSteps[tour.step].title} · ${tour.step + 1}/${tourSteps.length}`
                }
                onClick={() =>
                  control({
                    type:
                      tour.mode === "playing" ? "tour-pause" : "tour-resume",
                  })
                }
              >
                {review.pendingTour
                  ? "准备巡游…"
                  : tour.mode === "playing"
                    ? "暂停巡游"
                    : tour.mode === "paused"
                      ? "继续巡游"
                      : "开始巡游"}
                {tour.mode !== "manual" && (
                  <small>
                    {tour.step + 1}/{tourSteps.length}
                  </small>
                )}
              </button>

              {shots.map((s, i) => (
                <button
                  key={s.id}
                  aria-label={`载入${s.name}`}
                  aria-pressed={shot === s.id}
                  title={`${s.note}；载入预设将重置对象、时间、结构与切片设置`}
                  onClick={(e) => {
                    loadShot(s.id);
                    e.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                >
                  <small>0{i + 1}</small>
                  {s.name}
                </button>
              ))}
              <p>载入示例将重置对象、时间、结构与切片设置。</p>
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
                机房温度切片按设备进风代表位置作局部插值，气流路径按当前布置与前进后出假设绘制，均非环境实测或
                CFD
                结果。门禁读卡器、烟感和环境探头仅作布置示意，尚未接入监测；湿度/露点、空间容量和连接视图尚未实施。
              </p>
              <a href="?prototype">打开原型对照 ↗</a>
            </div>
          </details>
        </div>
      </header>
      <div
        className={`review-workspace ${navigation ? "navigation-open" : ""}`}
        role="main"
        aria-label={reviewMode ? "交互评审工作区" : "三维工作区"}
      >
        <ResourceNavigator
          onClose={closeNavigation}
          state={state}
          selected={selectedId}
          readings={spatial.readings}
          ready={ready}
          onPick={pick}
          onOpen={openResource}
          onFocus={focusResource}
          onBack={() => dispatch({ type: "back" })}
          onInteract={takeover}
        />
        <section
          className="review-center"
          aria-label="连续工作区"
          tabIndex={-1}
        >
          <div className="review-layerbar">
            <button
              className="review-resource-toggle"
              aria-label={navigation ? "收起资源导航" : "展开资源导航"}
              aria-expanded={navigation}
              aria-controls="workspace-resources"
              onClick={toggleNavigation}
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              >
                <rect x="2.5" y="3" width="15" height="14" rx="1.5" />
                <path d="M7.5 3v14M4.5 6h1M4.5 9h1" />
              </svg>
              <span>资源</span>
            </button>
            <div className="review-layers" aria-label="观察视图">
              {reviewLayers.map((l) => (
                <button
                  key={l.id}
                  aria-pressed={layer === l.id}
                  title={l.description}
                  onClick={() => control({ type: "layer", layer: l.id })}
                >
                  {l.name}
                </button>
              ))}
            </div>
            <button
              className="review-inspector-toggle"
              aria-label={inspectorOpen ? "收起对象详情" : "展开对象详情"}
              aria-expanded={inspectorOpen}
              onClick={() => showInspector(!inspectorOpen)}
            >
              {inspectorOpen
                ? "收起详情"
                : selectedId === "room-01"
                  ? "机房概览"
                  : "所选详情"}
            </button>
          </div>
          <ReviewScene
            selectedId={selectedId}
            tourShot={tourShot}
            onTakeover={takeover}
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
            <span className="clock-mode">模拟回放</span>
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
            <span className="clock-duration">/ 02:00</span>
            <button
              aria-expanded={review.analysis}
              onClick={() =>
                control({ type: "analysis", value: !review.analysis })
              }
            >
              {review.analysis ? "收起分析" : "曲线与事件"}
            </button>
          </div>
          {review.analysis && (
            <ReviewAnalysis
              key={`${selectedId}:${state.deviceId}`}
              title={resource?.name ?? entity.name}
              labels={{
                temperature: reading?.temperatureLabel ?? "温度",
                power: reading?.powerLabel ?? "功耗",
              }}
              histories={histories}
              events={events}
              time={state.time}
              playbackRate={state.playbackRate}
              component={component}
              onSeek={(time) => dispatch({ type: "seek", time })}
              onReplay={() => dispatch({ type: "replay" })}
              onRate={(rate) => dispatch({ type: "rate", rate })}
              onClose={() => control({ type: "analysis", value: false })}
            />
          )}
        </section>
        <aside
          className="review-inspector"
          aria-label="所选对象概览"
          hidden={!inspectorOpen}
          onPointerDownCapture={takeover}
          onKeyDownCapture={takeover}
          onFocusCapture={takeover}
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
                aria-label="选择设备部件"
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
