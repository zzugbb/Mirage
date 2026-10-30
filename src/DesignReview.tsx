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
  reviewTransition,
  reviewLayers,
  reviewHistory,
} from "./review-model";
import type { ReviewMetric, ReviewShot } from "./review-model";
import type { Action, Level } from "./domain";
import { entityById, getPath } from "./domain";
import { spatialSnapshot, selectedReading } from "./spatial";
import { devices, deviceById, rackForDevice } from "./installation";
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
import { phaseLabels } from "./mechanics";
import type { PresentationPhase } from "./mechanics";
import { ObjectTree } from "./components/ObjectTree";
import { ReviewScene } from "./components/ReviewScene";
import { ReviewTrend } from "./components/ReviewTrend";
import "./design-review.css";

const shots: { id: ReviewShot; name: string; note: string }[] = [
  { id: "overview", name: "总览", note: "材质、定位与状态的主次关系" },
  { id: "environment", name: "环境", note: "同一空间，切换温度观察" },
  { id: "assembly", name: "设备展开", note: "结构操作与数据图层共存" },
  { id: "time", name: "时间分析", note: "曲线、事件与三维共用时间" },
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
  const [alarmPanel, setAlarmPanel] = useState(false);
  const alarmEntry = useRef<HTMLButtonElement>(null);
  const alarmClose = useRef<HTMLButtonElement>(null);
  const wasAlarmOpen = useRef(false);
  useEffect(() => {
    if (alarmPanel) alarmClose.current?.focus();
    else if (wasAlarmOpen.current) alarmEntry.current?.focus();
    wasAlarmOpen.current = alarmPanel;
  }, [alarmPanel]);
  const [alarmFilter, setAlarmFilter] = useState("all");
  const [metricChoice, setMetricChoice] = useState<ReviewMetric>("temperature");
  const spatial = useMemo(
    () => spatialSnapshot(state.time, state.replayCycle, state.deviceId),
    [state.time, state.replayCycle, state.deviceId],
  );
  const reading = selectedReading(state, spatial.readings);
  const room = spatial.readings.get("room-01")!;
  const sample = spatial.samples.get(state.deviceId)!;
  const entity = entityById(state.selected)!;
  const component = entity.kind === "part";
  const signal = signalStyles[signalFor(reading)];
  const metric: ReviewMetric =
    layer === "power"
      ? "power"
      : layer === "environment"
        ? "temperature"
        : metricChoice;
  const series = useMemo(
    () => reviewHistory(state.selected, state.deviceId, metric),
    [state.selected, state.deviceId, metric],
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
  const select = useCallback(
    (id: string, enter = false) => {
      const target = entityById(id);
      if (!target) return;
      if (target.kind === "part") {
        dispatch({ type: "select", id });
        if (
          subpartsForDevice(state.deviceId).some((part) => part.id === id) &&
          state.explosion === 0
        )
          dispatch({ type: "explode", amount: 1 });
      } else if (enter && ["room", "rack", "device"].includes(target.kind))
        dispatch({ type: "navigate", level: target.kind as Level, id });
      else if (
        (state.level === "device" && target.kind !== "device") ||
        (state.level === "rack" && target.kind === "facility")
      )
        dispatch({ type: "locate", id });
      else dispatch({ type: "select", id });
      if (enter) setNavigation(false);
    },
    [dispatch, state.deviceId, state.explosion, state.level],
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
      if (event.key === "Escape" && (alarmPanel || navigation)) {
        event.preventDefault();
        if (alarmPanel) setAlarmPanel(false);
        else setNavigation(false);
        return;
      }
      if (
        (event.target as HTMLElement).matches(
          "input,select,textarea,[contenteditable=true]",
        )
      )
        return;
      if (event.key === "Escape") {
        if (alarmPanel) setAlarmPanel(false);
        else if (navigation) setNavigation(false);
        else dispatch({ type: "back" });
      }
      if (event.key.toLowerCase() === "f") dispatch({ type: "focus" });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [alarmPanel, navigation, dispatch]);
  const loadShot = (next: ReviewShot) => {
    setShot(next);
    setShotRevision((value) => value + 1);
    control({ type: "shot", shot: next });
    setAlarmPanel(false);
    setNavigation(false);
  };
  const alarms = devices
    .map((d) => spatial.readings.get(d.id)!)
    .filter((r) => r.alarm > 0)
    .sort((a, b) => b.alarm - a.alarm || a.name.localeCompare(b.name));
  const parts = [
    ...partsForDevice(state.deviceId),
    ...subpartsForDevice(state.deviceId),
  ];
  const scopeDevices = devices.filter((d) =>
    entity.kind === "room" || entity.kind === "rack"
      ? entity.kind === "room" || d.rackId === entity.id
      : d.id === state.deviceId,
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
      data-selection={state.selected}
      data-explosion={state.explosion}
      data-layer={layer}
    >
      <header className="review-header">
        <a
          className="review-brand"
          href="?review"
          aria-label="Mirage 浮城设计评审首页"
        >
          Mirage<span>浮城</span>
        </a>
        <span className="review-edition">
          连续三维工作区 <i /> 交互评审 01
        </span>
        <div className="review-header-actions">
          <span className="review-simulation">确定性模拟 · 120s</span>
          <button
            className="review-alarm-entry"
            ref={alarmEntry}
            aria-expanded={alarmPanel}
            onClick={() => setAlarmPanel((v) => !v)}
          >
            ◆ 告警 <b>{room.alarmCount}</b>
          </button>
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
      <div className="review-location">
        <button
          className="review-nav-toggle"
          aria-expanded={navigation}
          onClick={() => setNavigation((v) => !v)}
        >
          对象导航 {navigation ? "−" : "+"}
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
        <span className="review-location-note">
          {state.level === "room"
            ? "14 × 12 m · 8 机柜"
            : "结构姿态与运行时间独立"}
        </span>
        {state.level !== "room" && (
          <button onClick={() => dispatch({ type: "back" })}>← 返回上级</button>
        )}
      </div>
      <div
        className={`review-workspace ${navigation ? "navigation-open" : ""}`}
        role="main"
        aria-label="设计评审工作区"
      >
        <ObjectTree state={state} sample={sample} onSelect={select} />
        <section className="review-center" aria-label="连续工作区">
          <div className="review-layerbar">
            <div className="review-layers" aria-label="数据图层">
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
            <div className="review-layer-options">
              <label title="关闭数据着色以查看原始模型">
                <input
                  type="checkbox"
                  checked={review.data}
                  onChange={(e) =>
                    control({ type: "data", value: e.target.checked })
                  }
                />
                数据
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={review.alarms}
                  onChange={(e) =>
                    control({ type: "alarms", value: e.target.checked })
                  }
                />
                告警叠加
              </label>
            </div>
          </div>
          <ReviewScene
            shotRevision={shotRevision}
            state={state}
            layer={layer}
            data={review.data}
            alarms={review.alarms}
            readings={spatial.readings}
            dispatch={dispatch}
            onSelect={select}
            onPhase={setPhase}
          />
          <div className="review-object-actions" aria-label="对象操作">
            <span>对象操作</span>
            {state.level === "room" ? (
              <>
                <strong>{entity.name}</strong>
                <button
                  onClick={() =>
                    dispatch(
                      entity.kind === "facility"
                        ? { type: "focus" }
                        : {
                            type: "locate",
                            id:
                              entity.kind === "rack" || entity.kind === "device"
                                ? entity.id
                                : "rack-a01",
                          },
                    )
                  }
                >
                  {entity.kind === "facility"
                    ? "聚焦设施"
                    : entity.kind === "device"
                      ? "进入设备"
                      : entity.kind === "room"
                        ? "进入 A01 机柜"
                        : "进入机柜"}{" "}
                  ↗
                </button>
              </>
            ) : state.level === "rack" ? (
              <>
                <button
                  aria-pressed={state.doorOpen}
                  onClick={() =>
                    dispatch({ type: "door", open: !state.doorOpen })
                  }
                >
                  {state.doorOpen ? "关闭柜门" : "打开柜门"}
                </button>
                <button
                  disabled={
                    modelForDevice(state.deviceId).category === "switch"
                  }
                  aria-pressed={state.trayExtended}
                  onClick={() =>
                    dispatch({ type: "tray", extended: !state.trayExtended })
                  }
                >
                  {state.trayExtended ? "推回设备" : "抽出设备"}
                </button>
                <button
                  onClick={() =>
                    dispatch({
                      type: "navigate",
                      level: "device",
                      id: state.deviceId,
                    })
                  }
                >
                  探索设备 ↗
                </button>
              </>
            ) : (
              <>
                <button
                  aria-pressed={state.explosion > 0}
                  onClick={() => dispatch({ type: "explode", amount: 1 })}
                >
                  展开部件
                </button>
                <button
                  onClick={() => dispatch({ type: "explode", amount: 0 })}
                >
                  复原装配
                </button>
                <label className="review-explode-label">
                  展开{" "}
                  <input
                    aria-label="评审部件展开进度"
                    type="range"
                    min="0"
                    max="100"
                    value={state.explosion * 100}
                    onChange={(e) =>
                      dispatch({
                        type: "explode",
                        amount: Number(e.target.value) / 100,
                      })
                    }
                  />
                  <output>{Math.round(state.explosion * 100)}%</output>
                </label>
              </>
            )}
            {state.level !== "room" && (
              <small role="status">{phaseLabels[phase]}</small>
            )}
          </div>
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
        <aside className="review-inspector" aria-label="所选对象概览">
          <div className="review-inspector-title">
            <span>所选对象</span>
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
              {state.level === "device"
                ? `${rackForDevice(state.deviceId).name} / ${state.deviceId.toUpperCase()}`
                : "MIRAGE / 浮城"}
            </small>
            <h1>{entity.name}</h1>
            <span className="review-signal" style={{ color: signal.color }}>
              {signal.icon} {signalText(reading)}
            </span>
            {component && (
              <p className="review-model-note">
                模型推导 · 无独立测点与部件告警
              </p>
            )}
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
                      : `有效覆盖 ${coverage}/${reading.count}`}
                  </span>
                  <time>
                    {reading.observedAt == null
                      ? "无观测时间"
                      : `t+${reading.observedAt}s`}
                  </time>
                </div>
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
                  <button onClick={() => setAlarmPanel(true)}>
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
            </>
          ) : (
            <p className="review-empty-data">该设施尚未定义遥测数据。</p>
          )}
          {state.level === "device" && (
            <label className="review-part-select">
              定位部件
              <select
                aria-label="评审选择部件"
                value={
                  parts.some((p) => p.id === state.selected)
                    ? state.selected
                    : ""
                }
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
            <p>{entity.description}</p>
            {deviceById(state.selected) && (
              <p>
                {unitLabel(state.selected)} ·{" "}
                {modelForDevice(state.selected).name}
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
        {alarmPanel && (
          <aside className="review-alarm-panel" aria-label="独立告警列表">
            <div>
              <h2>
                当前告警 <small>{alarms.length} 台设备</small>
              </h2>
              <button
                ref={alarmClose}
                aria-label="关闭告警列表"
                onClick={() => setAlarmPanel(false)}
              >
                ×
              </button>
            </div>
            <p>温度告警 · t+{state.time}s · 全机房</p>
            <div className="review-alarm-filter">
              {[
                ["all", "全部"],
                ["2", "◆ 严重"],
                ["1", "▲ 预警"],
              ].map(([id, name]) => (
                <button
                  key={id}
                  aria-pressed={alarmFilter === id}
                  onClick={() => setAlarmFilter(id)}
                >
                  {name}
                </button>
              ))}
            </div>
            <label className="review-alarm-overlay">
              <input
                type="checkbox"
                checked={review.alarms}
                onChange={(e) =>
                  control({ type: "alarms", value: e.target.checked })
                }
              />
              在当前图层叠加告警标记
            </label>
            <div className="review-alarm-list">
              {alarms
                .filter(
                  (a) =>
                    alarmFilter === "all" || a.alarm === Number(alarmFilter),
                )
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      dispatch({ type: "locate", id: a.id });
                      setAlarmPanel(false);
                    }}
                  >
                    <span style={{ color: signalStyles[signalFor(a)].color }}>
                      {signalStyles[signalFor(a)].icon}
                    </span>
                    <span>
                      <b>{a.name}</b>
                      <small>
                        {rackForDevice(a.id).name} · {a.temperature?.toFixed(1)}{" "}
                        °C
                      </small>
                    </span>
                    <span>定位 ↗</span>
                  </button>
                ))}
              {!alarms.filter(
                (a) => alarmFilter === "all" || a.alarm === Number(alarmFilter),
              ).length && <p>当前筛选下没有告警</p>}
            </div>
          </aside>
        )}
      </div>
      <footer className="review-rail">
        <span>设计评审</span>
        <nav aria-label="载入评审画面">
          {shots.map((s, i) => (
            <button
              key={s.id}
              aria-pressed={shot === s.id}
              title={`${s.note}；载入预设将重置选择与时间`}
              onClick={() => loadShot(s.id)}
            >
              <small>0{i + 1}</small>
              {s.name}
            </button>
          ))}
        </nav>
        <details className="review-decisions">
          <summary>设计取舍</summary>
          <div>
            <strong>对象 × 数据图层 × 时间</strong>
            <p>
              左侧定位，中间观察与操作，右侧只服务所选对象。结构操作独立于图层；时间分析按需展开。评审画面按钮载入固定预设，会重置对象和时间。
            </p>
            <p>
              建议主入口顺序：总览 → 环境 → 电力 → 空间容量 →
              连接。“空间容量”明确为可安装 U
              位；“连接”只呈现已定义端点。后两项尚未实现，不占用主导航。
            </p>
            <p>
              温度色阶表示读数，电力色阶表示功耗/预算；严重与预警使用 ◆ / ▲
              和文字。数据关闭仅关闭三维着色。告警可独立定位或叠加。
            </p>
            <p>
              本轮未增加切片、气流、湿度或连接视图。独立开盖动作、粒子和时间曲线对比待后续实现。
            </p>
            <a href="./">与当前原型对照 ↗</a>
          </div>
        </details>
      </footer>
    </div>
  );
}
