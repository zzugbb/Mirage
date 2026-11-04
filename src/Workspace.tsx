import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { rackBlankingUnits, unitRanges } from "./rack-blanking";
import { fixtureById } from "./fixtures";
import { powerContextIncludes } from "./power-trace";
import { leakRelations } from "./leak-detection";
import { FixtureDetails, FixtureRelations } from "./components/FixtureDetails";
import { entityById, getPath, presentationKey } from "./domain";
import type { Action } from "./domain";
import {
  createWorkspace,
  reviewTransition,
  reviewLayers,
  reviewHistories,
  reviewCoolingHistories,
  reviewEvents,
} from "./review-model";
import type { ReviewAction, ResourceAction, ReviewState } from "./review-model";
import { spatialSnapshot, selectedReading } from "./spatial";
import { signalFor, signalStyles, signalText } from "./status";
import {
  findResources,
  resourceCatalog,
  resourceOpenLabel,
  canSelectInScene,
  componentGroups,
} from "./review-resources";
import type { ResourceFilter } from "./review-resources";
import { devices, rackForDevice } from "./installation";
import { maintenanceAreas } from "./maintenance";
import { isPowerFacility, pduById, powerDeviceIds } from "./power-config";
import { PowerConnections } from "./components/PowerConnections";
import { NetworkConnections } from "./components/NetworkConnections";
import { networkContextIncludes } from "./network";
import { CoolingConnections } from "./components/CoolingConnections";
import {
  coolingSource,
  isCoolingSource,
  coolingDeviceIds,
  coolingSummary,
} from "./cooling";
import { coolingCapacityAt } from "./simulation";
import { ResourceActions } from "./components/ResourceActions";
import { ReviewScene } from "./components/ReviewScene";
import { ReviewTrend } from "./components/ReviewTrend";
import { ReviewAnalysis } from "./components/ReviewAnalysis";
import type { PresentationPhase, SceneFeedback } from "./mechanics";
import {
  workspacePreset,
  workspaceShots,
  visibleResourceRows,
  resourceRowText,
} from "./workspace-presets";
import type { WorkspaceShot } from "./workspace-presets";
import { tourSteps } from "./tour";
import "./scene-ui.css";
import "./workspace-ui.css";

const clock = (time: number) =>
  `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;
const temperature = (value: number | null | undefined) =>
  value == null ? "—" : value.toFixed(1);
const power = (value: number | null | undefined) =>
  value == null
    ? "—"
    : value >= 1000
      ? (value / 1000).toFixed(2)
      : value.toFixed(1);
function reducer(
  state: ReviewState,
  action:
    | ReviewAction
    | ResourceAction
    | { type: "workspace-shot"; shot: WorkspaceShot },
) {
  return action.type === "workspace-shot"
    ? workspacePreset(state, action.shot)
    : reviewTransition(state, action);
}

export function Workspace() {
  const [review, control] = useReducer(reducer, undefined, () =>
    createWorkspace(matchMedia("(prefers-reduced-motion: reduce)").matches),
  );
  const { scene: state, layer, tour } = review;
  const selected = review.selectedId ?? state.selected;
  const [shot, setShot] = useState<WorkspaceShot>("overview");
  const [revision, setRevision] = useState(0);
  const [phase, setPhase] = useState<PresentationPhase>("closed");
  const [feedback, setFeedback] = useState<SceneFeedback | null>(null);
  const latestFeedback = useRef(feedback);
  latestFeedback.current = feedback;
  const [hidden, setHidden] = useState(() => document.hidden);
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
  const [nav, setNav] = useState(
    () => matchMedia("(min-width: 1100px)").matches,
  );
  const navigationRef = useRef<HTMLElement>(null);
  const navigationOpenerRef = useRef<HTMLButtonElement>(null);
  const previousNav = useRef(nav);
  useEffect(() => {
    if (previousNav.current === nav) return;
    previousNav.current = nav;
    if (nav) navigationRef.current?.querySelector("input")?.focus();
    else if (navigationRef.current?.contains(document.activeElement))
      navigationOpenerRef.current?.focus();
  }, [nav]);
  const [inspector, setInspector] = useState(false);
  const [networkLinkId, setNetworkLinkId] = useState<string | null>(null);
  const [powerLinkId, setPowerLinkId] = useState<string | null>(null);
  const activePowerLink = powerContextIncludes(
    selected,
    state.deviceId,
    powerLinkId,
  )
    ? powerLinkId
    : null;
  const activeNetworkLink =
    layer === "overview" &&
    networkContextIncludes(selected, state.deviceId, networkLinkId)
      ? networkLinkId
      : null;
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [filter, setFilter] = useState<ResourceFilter>("all");
  const [onlyAlarms, setOnlyAlarms] = useState(false);
  const [metric, setMetric] = useState<"temperature" | "power">("temperature");
  const spatial = useMemo(
    () => spatialSnapshot(state.time, state.replayCycle, state.deviceId),
    [state.time, state.replayCycle, state.deviceId],
  );
  const reading = selectedReading({ ...state, selected }, spatial.readings);
  const room = spatial.readings.get("room-01")!;
  const resource = resourceCatalog(state.deviceId).find(
    (r) => r.id === selected,
  )!;
  const entity = entityById(selected)!;
  const fixture = fixtureById(selected);
  const maintenance = useMemo(() => maintenanceAreas(selected), [selected]);
  const component = entity.kind === "part";
  const powerFacility = isPowerFacility(selected);
  const coolingFacility = isCoolingSource(selected);
  const associatedDevices = useMemo(
    () =>
      new Set(
        coolingFacility ? coolingDeviceIds(selected) : powerDeviceIds(selected),
      ),
    [selected],
  );
  const ready =
    !review.pendingId &&
    !!feedback?.settled &&
    feedback.key === presentationKey(state);
  const rows = useMemo(
    () =>
      visibleResourceRows(
        findResources(state, query, filter),
        spatial.readings,
        onlyAlarms && state.level !== "device",
      ),
    [state, query, filter, onlyAlarms, spatial],
  );
  const browsingParts =
    state.level === "device" && !query.trim() && filter === "all";
  const visibleRows = browsingParts
    ? rows
        .filter((row) => !row.parent)
        .flatMap((row) => [
          row,
          ...(expanded.includes(row.id)
            ? rows.filter((child) => child.parent === row.id)
            : []),
        ])
    : rows;
  const coolingHistories = useMemo(
    () => (coolingFacility ? reviewCoolingHistories() : null),
    [coolingFacility],
  );
  const coolingRange = coolingFacility
    ? coolingSummary([...associatedDevices], spatial.readings)
    : null;
  const histories = useMemo(
    () =>
      fixture
        ? { temperature: [], power: [] }
        : coolingHistories
          ? { temperature: coolingHistories.temperature, power: [] }
          : reviewHistories(selected, state.deviceId),
    [selected, state.deviceId, coolingHistories, fixture],
  );
  const scope = devices.filter(
    (d) =>
      (powerFacility || coolingFacility
        ? associatedDevices.has(d.id)
        : entity.kind === "room") ||
      (entity.kind === "rack" && d.rackId === selected) ||
      d.id === (component ? state.deviceId : selected),
  );
  const events = useMemo(
    () =>
      reviewEvents(
        scope.map((d) => d.id),
        state.time,
        state.replayCycle,
      ),
    [selected, state.deviceId, state.time, state.replayCycle],
  );
  const signal = signalStyles[signalFor(reading)];
  const dispatch = useCallback(
    (action: Action) => control({ type: "scene", action }),
    [],
  );
  const takeover = useCallback(() => control({ type: "takeover" }), []);
  const pick = useCallback(
    (id: string, enter = false) => {
      setPowerLinkId((current) =>
        powerContextIncludes(id, state.deviceId, current) ? current : null,
      );
      setNetworkLinkId((current) =>
        networkContextIncludes(id, state.deviceId, current) ? current : null,
      );
      control({ type: enter ? "open-resource" : "pick", id });
      setInspector(true);
      if (matchMedia("(max-width: 1099px)").matches) setNav(false);
      if (enter && !fixtureById(id)) {
        setQuery("");
        setFilter("all");
      }
    },
    [state.deviceId],
  );
  const focus = (id: string) => {
    setNetworkLinkId((current) =>
      networkContextIncludes(id, state.deviceId, current) ? current : null,
    );
    setPowerLinkId((current) =>
      powerContextIncludes(id, state.deviceId, current) ? current : null,
    );
    control({ type: "focus-resource", id });
    setInspector(true);
    if (matchMedia("(max-width: 1099px)").matches) setNav(false);
  };
  const analyze = () => {
    control({ type: "analysis", value: true });
    setInspector(true);
    if (matchMedia("(max-width: 1099px)").matches) setNav(false);
  };
  const showAirflow = () => {
    control({ type: "layer", layer: "environment" });
    if (state.level !== "room") pick(coolingSource.id, true);
  };
  useEffect(() => {
    if (
      review.pendingId &&
      feedback?.settled &&
      feedback.key === presentationKey(state)
    )
      control({ type: "navigation-ready", key: feedback.key });
  }, [review.pendingId, feedback, state]);
  useEffect(() => {
    if (!state.playing) return;
    const timer = setInterval(() => {
      if (!document.hidden) dispatch({ type: "tick" });
    }, 1000);
    return () => clearInterval(timer);
  }, [state.playing, dispatch]);
  useEffect(() => {
    document.title = "Mirage · 浮城 — 三维工作区";
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (query) {
          setQuery("");
          return;
        }
        const popup = document.querySelector<HTMLDetailsElement>(
          ".workspace-ui details[open]",
        );
        if (popup) {
          popup.open = false;
          popup.querySelector("summary")?.focus();
        } else if (review.analysis) control({ type: "analysis", value: false });
        else if (inspector) setInspector(false);
        else if (nav && matchMedia("(max-width: 1099px)").matches)
          setNav(false);
        else dispatch({ type: "back" });
      }
      if ((event.target as HTMLElement).closest("input,select,textarea"))
        return;
      if (event.key.toLowerCase() === "f") {
        control({ type: "focus-resource", id: selected });
        setInspector(true);
        if (matchMedia("(max-width: 1099px)").matches) setNav(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [selected, review.analysis, nav, inspector, query, dispatch]);
  const load = (next: WorkspaceShot) => {
    setPowerLinkId(null);
    setNetworkLinkId(null);
    setExpanded([]);
    setShot(next);
    setRevision((n) => n + 1);
    setQuery("");
    setFilter("all");
    setOnlyAlarms(next === "alarms");
    setInspector(next !== "overview");
    if (next === "time" && matchMedia("(max-width: 1099px)").matches)
      setNav(false);
    control({ type: "workspace-shot", shot: next });
  };
  const groupOf = (row: (typeof rows)[number]) =>
    browsingParts
      ? (row.group ?? "其他部件")
      : state.level === "room" && !query.trim() && filter === "all"
        ? row.kind === "rack"
          ? `${row.name[0]} 排机柜`
          : (row.group ?? "机房设施")
        : state.level === "rack" && !query.trim() && filter === "all"
          ? pduById(row.id)
            ? "供电附件 · 后置 0U"
            : `${rackForDevice(state.deviceId).name} · 设备`
          : "搜索结果";
  const groups = [...new Set(rows.map(groupOf))].sort((a, b) =>
    state.level === "device"
      ? componentGroups.indexOf(a) - componentGroups.indexOf(b)
      : 0,
  );
  const mainMetric = powerFacility ? "power" : metric;
  return (
    <div
      className="mirage-workspace workspace-ui"
      data-analysis={review.analysis}
      data-layer={layer}
      data-scene-level={state.level}
      data-selection={selected}
      data-time={state.time}
      data-playing={state.playing}
      data-tour={tour.mode}
      data-tour-step={tour.step}
      data-tour-pending={review.pendingTour}
      data-scene-device={state.deviceId}
      data-focus-revision={state.focusRevision}
      data-cover-open={state.coverOpen}
      data-explosion={state.explosion}
    >
      <header className="study-header">
        <a className="study-brand" href="./" aria-label="Mirage 浮城首页">
          Mirage <span>浮城</span>
        </a>
        <nav className="study-path" aria-label="空间路径">
          {getPath(state).map((item, i) => (
            <span key={item}>
              {i > 0 && <i>/</i>}
              <button onClick={() => pick(item, true)}>
                {entityById(item)?.name ?? item}
              </button>
            </span>
          ))}
        </nav>
        <div className="study-clock">
          <button
            aria-label={state.playing ? "暂停模拟" : "播放模拟"}
            title={state.playing ? "暂停模拟" : "播放模拟"}
            onClick={() => dispatch({ type: "play" })}
          >
            {state.playing ? "Ⅱ" : "▷"}
          </button>
          <button
            onClick={analyze}
            aria-label="打开时间分析"
            aria-pressed={review.analysis}
            title="查看所选对象的曲线与事件，回看同步更新场景"
          >
            <span>模拟</span>
            <time>{clock(state.time)}</time>
            <span className="study-clock-action">分析</span>
          </button>
        </div>
        <details className="workspace-shots">
          <summary>
            演示{" "}
            <span>
              {tour.mode === "playing"
                ? "巡游中"
                : tour.mode === "paused"
                  ? "巡游暂停"
                  : "自由浏览"}
            </span>
          </summary>
          <nav aria-label="演示画面与巡游">
            <button
              className="study-tour-control"
              disabled={
                review.pendingTour || (tour.mode === "manual" && !ready)
              }
              onClick={() => {
                setOnlyAlarms(false);
                control({
                  type: tour.mode === "playing" ? "tour-pause" : "tour-resume",
                });
              }}
              title={
                tour.mode === "manual"
                  ? "从机房开始巡游，保留当前模拟时间"
                  : tourSteps[tour.step].title
              }
            >
              {review.pendingTour
                ? "正在准备巡游"
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
            {workspaceShots.map((s, i) => (
              <button
                key={s.id}
                aria-pressed={shot === s.id}
                onClick={(e) => {
                  load(s.id);
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                <small>0{i + 1}</small>
                {s.name}
              </button>
            ))}
            <p>载入固定画面将重置对象与时间。</p>
            <details className="study-about">
              <summary>场景与数据说明</summary>
              <div>
                <p>
                  原创演示空间，运行数据来自统一的 120
                  秒确定性模拟。设备读数为模拟，部件读数为模型推导，无真实管理接口或
                  CFD。
                </p>
                <p>
                  温度切片由设备进风代表位置局部插值；气流是按当前布置与风向假设绘制的路径，均非环境实测。门禁、烟感与环境探头仅作布置示意。
                </p>
                <p>
                  交换机、存储内部仍为配置示意；湿度/露点、容量、完整连接与园区入口尚未实施。
                </p>
              </div>
            </details>
          </nav>
        </details>
      </header>
      <main
        className={`study-workspace ${nav ? "has-nav" : ""} ${inspector ? "has-inspector" : ""} ${review.analysis ? "has-analysis" : ""}`}
      >
        <aside
          ref={navigationRef}
          className="study-navigation"
          hidden={!nav}
          aria-label="资源导航"
          onPointerDownCapture={takeover}
          onKeyDownCapture={takeover}
        >
          <div className="study-panel-heading">
            <h2>
              {layer === "alarms" && state.level !== "device"
                ? "告警资源"
                : "资源"}
            </h2>
            <span>
              {state.level === "room"
                ? "机房"
                : state.level === "rack"
                  ? "机柜"
                  : "部件"}
            </span>
            <button aria-label="收起资源导航" onClick={() => setNav(false)}>
              ×
            </button>
          </div>
          <label className="study-search">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="查找资源"
              placeholder="名称、编号或 U 位"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="清除搜索" onClick={() => setQuery("")}>
                ×
              </button>
            )}
          </label>
          <div className="study-filters">
            <select
              aria-label="资源类型"
              value={filter}
              onChange={(e) => setFilter(e.target.value as ResourceFilter)}
            >
              <option value="all">全部类型</option>
              <option value="server">服务器</option>
              <option value="switch">交换机</option>
              <option value="storage">存储</option>
              <option value="facility">设施</option>
            </select>
            {layer === "alarms" && state.level !== "device" && (
              <button
                aria-label="仅看告警"
                aria-pressed={onlyAlarms}
                onClick={() => setOnlyAlarms((v) => !v)}
              >
                <span aria-hidden="true">{onlyAlarms ? "✓ " : ""}</span>仅看告警
              </button>
            )}
          </div>
          {state.level !== "room" && (
            <button
              className="study-parent"
              onClick={() => dispatch({ type: "back" })}
            >
              ←{" "}
              {state.level === "device"
                ? rackForDevice(state.deviceId).name
                : "01号机房"}
            </button>
          )}
          <div
            className={`study-resource-list ${query.trim() || filter !== "all" ? "is-search" : ""}`}
            key={`${state.level}:${state.deviceId}`}
          >
            {groups.map((group) => (
              <section key={group}>
                <h3>
                  {group}
                  <span>
                    {
                      rows.filter(
                        (r) =>
                          groupOf(r) === group && (!browsingParts || !r.parent),
                      ).length
                    }
                  </span>
                </h3>
                {visibleRows
                  .filter((r) => groupOf(r) === group)
                  .map((row) => {
                    const text = resourceRowText(
                        row,
                        !!query.trim() || filter !== "all",
                      ),
                      data = spatial.readings.get(row.id),
                      style = signalStyles[signalFor(data)];
                    const rowStatus = data
                      ? signalText(data)
                      : isCoolingSource(row.id)
                        ? "模拟输入"
                        : "未接入数据";
                    const locateOnly =
                      row.kind === "part" ||
                      row.kind === "facility" ||
                      (state.level === "device" && row.id === state.deviceId);
                    return (
                      <div
                        className={`study-resource ${row.parent ? "is-child" : ""} ${selected === row.id ? "selected" : ""}`}
                        key={row.id}
                      >
                        <button
                          className="study-resource-text"
                          aria-pressed={selected === row.id}
                          title={`${row.name} · ${row.location} · ${rowStatus}`}
                          aria-label={`${row.name}，${rowStatus}`}
                          onClick={() => pick(row.id)}
                        >
                          <span className="study-resource-title">
                            <strong>{text.title}</strong>
                            <span
                              className="study-row-status"
                              style={{ color: style.color }}
                              title={rowStatus}
                            >
                              {data
                                ? style.icon
                                : isCoolingSource(row.id)
                                  ? "◇"
                                  : "—"}
                            </span>
                          </span>
                          <small>{text.detail}</small>
                        </button>
                        <div
                          className="study-row-actions"
                          aria-label={`${row.name}操作`}
                        >
                          <button
                            disabled={
                              !ready ||
                              (!locateOnly && !canSelectInScene(state, row.id))
                            }
                            aria-label={`定位 ${row.name}`}
                            onClick={() =>
                              locateOnly ? pick(row.id, true) : focus(row.id)
                            }
                          >
                            定位
                          </button>
                          {row.kind === "part" &&
                            rows.some((child) => child.parent === row.id) && (
                              <button
                                aria-label={`${expanded.includes(row.id) ? "收起" : "展开"}${row.name}子件`}
                                aria-expanded={expanded.includes(row.id)}
                                onClick={() =>
                                  setExpanded((current) =>
                                    current.includes(row.id)
                                      ? current.filter((id) => id !== row.id)
                                      : [...current, row.id],
                                  )
                                }
                              >
                                子件
                              </button>
                            )}
                          {!locateOnly && (
                            <button
                              disabled={!ready}
                              aria-label={`${resourceOpenLabel(state, row.id)} · ${row.name}`}
                              onClick={() => pick(row.id, true)}
                            >
                              进入
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </section>
            ))}
            {!rows.length && (
              <p className="study-empty">
                {onlyAlarms
                  ? query.trim() || filter !== "all"
                    ? "没有匹配的告警资源"
                    : "当前范围没有活动告警"
                  : "没有匹配的资源"}
                <button
                  onClick={() => {
                    setOnlyAlarms(false);
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  查看全部资源
                </button>
              </p>
            )}
          </div>
          <footer className="study-nav-caption">
            {state.level === "device"
              ? "部件状态为模型评估，非独立告警"
              : "单击选择 · 定位聚焦 · 进入下一级"}
          </footer>
        </aside>
        <section className="study-stage" aria-label="三维工作区">
          <div className="study-layer-control">
            {!nav && (
              <button
                ref={navigationOpenerRef}
                aria-label="展开资源导航"
                onClick={() => {
                  takeover();
                  setNav(true);
                }}
              >
                资源
              </button>
            )}
            <nav aria-label="观察视图">
              {reviewLayers.map((l) => (
                <button
                  key={l.id}
                  aria-pressed={layer === l.id}
                  onClick={() => {
                    control({ type: "layer", layer: l.id });
                    setOnlyAlarms(l.id === "alarms");
                    setMetric(l.id === "power" ? "power" : "temperature");
                  }}
                >
                  {l.name}
                </button>
              ))}
            </nav>
          </div>
          <ReviewScene
            state={state}
            layer={layer}
            readings={spatial.readings}
            selectedId={selected}
            networkLinkId={activeNetworkLink}
            powerLinkId={activePowerLink}
            onClearPower={() => {
              takeover();
              setPowerLinkId(null);
            }}
            onClearNetwork={() => {
              takeover();
              setNetworkLinkId(null);
            }}
            onSelect={pick}
            onFocus={() => focus(selected)}
            onPhase={setPhase}
            onFeedback={setFeedback}
            shotRevision={revision}
            tourShot={tourShot}
            onTakeover={takeover}
            compactTools
            controls={
              state.level !== "room" ? (
                <ResourceActions
                  state={state}
                  selected={selected}
                  ready={ready}
                  phase={phase}
                  dispatch={dispatch}
                  onOpen={(id) => pick(id, true)}
                  onExtract={(id) => control({ type: "extract-resource", id })}
                />
              ) : null
            }
          />
          {state.level === "room" &&
            layer === "overview" &&
            maintenance.length === 0 &&
            !fixture &&
            !coolingFacility &&
            !powerFacility &&
            !activeNetworkLink && (
              <div className="study-room-summary">
                <span>01 号机房</span>
                <h1>运行概览</h1>
                <div>
                  <p>
                    <strong>
                      {room.lifecycleCounts.running}
                      <small>台</small>
                    </strong>
                    <span>运行设备</span>
                  </p>
                  <p>
                    <strong>
                      {power(room.power)}
                      <small>kW</small>
                    </strong>
                    <span>已知输入功耗</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    pick("room-01");
                  }}
                >
                  查看机房详情
                </button>
              </div>
            )}
          {layer === "alarms" && state.level === "room" && (
            <div className="study-alert-caption">
              <span>当前异常</span>
              <strong>
                {room.alarmCount}
                <small>台设备</small>
              </strong>
              <p>点击空间标记查看对应对象</p>
            </div>
          )}
          {!inspector && (
            <button
              className="study-show-detail"
              onClick={() => {
                takeover();
                setInspector(true);
              }}
            >
              对象详情
            </button>
          )}
        </section>
        {inspector && (
          <aside
            className={`study-inspector ${review.analysis ? "is-analysis" : ""}`}
            key={`${selected}:${review.analysis}`}
            aria-label={review.analysis ? "时间分析面板" : "对象详情"}
          >
            <div className="study-panel-heading">
              <h2>{review.analysis ? "时间分析" : "对象详情"}</h2>
              {review.analysis && (
                <button
                  className="study-return-detail"
                  aria-label="返回对象详情"
                  onClick={() => control({ type: "analysis", value: false })}
                >
                  详情
                </button>
              )}
              <button
                aria-label="收起详情面板"
                onClick={() => {
                  setInspector(false);
                  control({ type: "analysis", value: false });
                }}
              >
                ×
              </button>
            </div>
            <div className="study-identity">
              <small>{resource?.location}</small>
              <h1>{resource?.name ?? entity.name}</h1>
              <span
                style={{
                  color:
                    powerFacility || coolingFacility || fixture
                      ? "#9caebc"
                      : signal.color,
                }}
              >
                {fixture ? (
                  fixture.dataStatus === "not-applicable" ? (
                    "— 结构布置 · 无运行数据"
                  ) : (
                    "— 布置示意 · 未接入数据"
                  )
                ) : coolingFacility ? (
                  "◇ 冷却输入 · 模拟"
                ) : powerFacility ? (
                  "◇ 连接示意 · 未计量"
                ) : (
                  <>
                    {signal.icon} {component ? "模型评估 · " : ""}
                    {component ? signal.label : signalText(reading)}
                  </>
                )}
              </span>
            </div>
            {review.analysis ? (
              <>
                <div className="study-time-control">
                  <button onClick={() => dispatch({ type: "play" })}>
                    {state.playing ? "暂停" : "播放"}
                  </button>
                  <time>{clock(state.time)}</time>
                  <span>/ 02:00</span>
                  <small>
                    {state.playing ? "播放中" : "已暂停"} · 场景同步
                  </small>
                  <input
                    aria-label="共享模拟时间"
                    type="range"
                    min="0"
                    max="120"
                    value={state.time}
                    onChange={(e) =>
                      dispatch({ type: "seek", time: Number(e.target.value) })
                    }
                  />
                </div>
                {fixture ? (
                  <FixtureDetails
                    fixture={fixture}
                    analysis
                    onPreview={pick}
                    onLocate={focus}
                  />
                ) : (
                  <ReviewAnalysis
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
                    powerOnly={powerFacility}
                    cooling={coolingHistories?.cooling}
                    onSeek={(time) => dispatch({ type: "seek", time })}
                    onReplay={() => dispatch({ type: "replay" })}
                    onRate={(rate) => dispatch({ type: "rate", rate })}
                    onClose={() => control({ type: "analysis", value: false })}
                  />
                )}
              </>
            ) : (
              <>
                {!!reading?.alarm && !component && (
                  <section className="study-alarm-detail">
                    <h2>进风温度异常</h2>
                    <p>
                      {reading.count > 1
                        ? `${reading.alarmCount} 台设备存在温度告警，可从资源目录逐层定位。`
                        : "设备进风温度持续超限。回看曲线与事件，检查异常发生过程。"}
                    </p>
                    <button onClick={analyze}>回看告警过程</button>
                  </section>
                )}
                {fixture ? (
                  <FixtureDetails
                    fixture={fixture}
                    onPreview={pick}
                    onLocate={focus}
                  />
                ) : coolingRange && coolingHistories ? (
                  <>
                    <div className="study-metrics cooling-metrics">
                      <div>
                        <span>演示冷却输入</span>
                        <strong>
                          {Math.round(coolingCapacityAt(state.time))}
                          <small>%</small>
                        </strong>
                        <small>模拟驱动 · 非风量或制冷量</small>
                      </div>
                      <div>
                        <span>关联设备最高进风</span>
                        <strong>
                          {temperature(coolingRange.maximum)}
                          <small>°C</small>
                        </strong>
                        <small>
                          有效覆盖 {coolingRange.coverage}/{coolingRange.count}
                        </small>
                      </div>
                    </div>
                    <div className="cooling-response-summary">
                      {coolingRange.hottestId && (
                        <button onClick={() => pick(coolingRange.hottestId!)}>
                          预览最高进风设备{" "}
                          {coolingRange.hottestId.toUpperCase()} ↗
                        </button>
                      )}
                      <p>
                        关联设备 {coolingRange.alarmIds.length} 台当前告警 ·
                        制冷单元未定义独立告警
                      </p>
                      <p>
                        过期 {coolingRange.quality.stale} · 离线{" "}
                        {coolingRange.quality.offline} · 缺失{" "}
                        {coolingRange.quality.missing} · 停机{" "}
                        {coolingRange.lifecycle.stopped}（无当前进风）
                      </p>
                    </div>
                    <section className="study-trend">
                      <div>
                        <h2>关联进风趋势</h2>
                      </div>
                      <ReviewTrend
                        series={coolingHistories.temperature}
                        metric="temperature"
                        time={state.time}
                        compact
                      />
                      <button onClick={analyze}>
                        对照冷却输入与温度响应 <span>↗</span>
                      </button>
                    </section>
                    <CoolingConnections
                      onInteract={takeover}
                      state={state}
                      selectedId={selected}
                      readings={spatial.readings}
                      ready={ready}
                      airflowVisible={
                        layer === "environment" && state.level === "room"
                      }
                      onSelect={pick}
                      onLocateSource={() => pick(coolingSource.id, true)}
                      onViewAirflow={showAirflow}
                    />
                    <FixtureRelations
                      title="邻近检漏设施"
                      relations={leakRelations(selected)}
                      onPreview={pick}
                      onLocate={focus}
                    />
                  </>
                ) : reading ? (
                  <>
                    <div
                      className={`study-metrics ${powerFacility ? "is-associated-power" : ""}`}
                    >
                      {!powerFacility && (
                        <div>
                          <span>{reading.temperatureLabel}</span>
                          <strong>
                            {temperature(reading.temperature)}
                            <small>°C</small>
                          </strong>
                          {(reading.count > 1 ||
                            reading.coverageTemperature !== 1) && (
                            <small>
                              有效覆盖 {reading.coverageTemperature}/
                              {reading.count}
                            </small>
                          )}
                        </div>
                      )}
                      <div>
                        <span>{reading.powerLabel}</span>
                        <strong>
                          {power(reading.power)}
                          <small>
                            {(reading.power ?? 0) >= 1000 ? "kW" : "W"}
                          </small>
                        </strong>
                        {(reading.count > 1 || reading.coveragePower !== 1) && (
                          <small>
                            有效覆盖 {reading.coveragePower}/{reading.count}
                          </small>
                        )}
                        {powerFacility && (
                          <small>关联设备汇总 · 非设施或支路计量</small>
                        )}
                      </div>
                    </div>
                    <section className="study-trend">
                      <div>
                        <h2>{powerFacility ? "关联输入趋势" : "变化趋势"}</h2>
                        {!powerFacility && (
                          <button
                            aria-pressed={mainMetric === "temperature"}
                            onClick={() => setMetric("temperature")}
                          >
                            温度
                          </button>
                        )}
                        {!powerFacility && (
                          <button
                            aria-pressed={mainMetric === "power"}
                            onClick={() => setMetric("power")}
                          >
                            功耗
                          </button>
                        )}
                      </div>
                      <ReviewTrend
                        series={histories[mainMetric]}
                        metric={mainMetric}
                        time={state.time}
                        compact
                      />
                      <button onClick={analyze}>
                        分析曲线与事件 <span>↗</span>
                      </button>
                    </section>
                    {(layer === "power" || powerFacility) && (
                      <PowerConnections
                        activeLinkId={activePowerLink}
                        onTrace={(id) => {
                          setPowerLinkId(id);
                          if (id) control({ type: "layer", layer: "power" });
                          else takeover();
                        }}
                        onInteract={takeover}
                        state={state}
                        selectedId={selected}
                        readings={spatial.readings}
                        ready={ready}
                        onSelect={(id) => pick(id)}
                        onLocate={(id) => pick(id, true)}
                        onViewPower={
                          layer === "power"
                            ? undefined
                            : () => control({ type: "layer", layer: "power" })
                        }
                      />
                    )}
                    {layer === "overview" && (
                      <NetworkConnections
                        key={selected}
                        state={state}
                        selectedId={selected}
                        activeLinkId={activeNetworkLink}
                        ready={ready}
                        onSelect={pick}
                        onLocate={(id) => pick(id, true)}
                        onTrace={setNetworkLinkId}
                        onInteract={takeover}
                      />
                    )}
                    {layer === "environment" && (
                      <CoolingConnections
                        onInteract={takeover}
                        state={state}
                        selectedId={selected}
                        readings={spatial.readings}
                        ready={ready}
                        airflowVisible={
                          layer === "environment" && state.level === "room"
                        }
                        onSelect={pick}
                        onLocateSource={() => pick(coolingSource.id, true)}
                        onViewAirflow={showAirflow}
                      />
                    )}
                  </>
                ) : (
                  <p className="study-empty">设施布置示意，尚未接入遥测。</p>
                )}
                {!fixture && (
                  <details className="study-configuration">
                    <summary>配置与数据说明</summary>
                    <p>{entity.description}</p>
                    {entity.kind === "rack" && (
                      <>
                        <p className="study-blanking-config">
                          前置 1U 盲板 {rackBlankingUnits(selected).length} 块：
                          {unitRanges(rackBlankingUnits(selected))}。
                          按本柜安装配置封闭未安装位置，不代表可分配容量或实测气密性。
                        </p>
                        <p>
                          双扇冲孔后门、顶部刷条进线口与 PDU
                          侧壁支架为结构示意。
                          后门随供电观察剖切，不提供独立开合；进线口未配置施工线缆，不据此推断散热或布线能力。
                        </p>
                      </>
                    )}

                    {maintenance.length > 0 && (
                      <>
                        <dl className="study-maintenance-config">
                          {maintenance.map((area) => (
                            <div key={area.id}>
                              <dt>{area.title}</dt>
                              <dd>
                                {area.depth.toFixed(2)} ×{" "}
                                {area.width.toFixed(2)} m
                              </dd>
                            </div>
                          ))}
                        </dl>
                        <p>
                          尺寸为进深 ×
                          宽度的预留示意，不是实测净距或工程校核。场景总览选中机柜时显示范围。
                        </p>
                      </>
                    )}
                    <p>{reading?.source}</p>
                    {coolingFacility && (
                      <p>
                        冷却输入来自确定性演示；关联进风是设备模拟读数，不是制冷单元送/回风温度，也不提供设施功率、风量、制冷量或控制能力。
                      </p>
                    )}
                    <p>
                      当前数据为确定性模拟。空缺不按零值计算；部件读数为模型推导。
                    </p>
                  </details>
                )}
              </>
            )}
          </aside>
        )}
      </main>
    </div>
  );
}
