import { sourceMetrics } from "./reading-sources.ts";
import { peakScopeIds, maximumSources } from "./peak-provenance.ts";
import {
  createState,
  transition,
  entityById,
  presentationKey,
} from "./domain.ts";
import type { Action, AppState } from "./domain.ts";
import { spatialSnapshot } from "./spatial.ts";
import { pduById, associatedInputReading } from "./power-config.ts";
import {
  coolingSource,
  coolingDeviceIds,
  coolingSummary,
  roomAirflowTarget,
} from "./cooling.ts";
import { coolingCapacityAt } from "./simulation.ts";
import { canSelectInScene } from "./review-resources.ts";
import { rackForDevice } from "./installation.ts";
import { deviceObservation } from "./device-data.ts";
import type { DataQuality } from "./status.ts";
import type { SimulationEvent } from "./simulation.ts";
import { createExperience, experienceTransition } from "./tour.ts";
import type { ExperienceAction, TourState } from "./tour.ts";
import { powerLinks, inletPart } from "./power-config.ts";
import { deviceById } from "./installation.ts";
import { networkEndpoints } from "./network.ts";

type EndpointTarget = { deviceId: string; partId: string };

export type ReviewLayer = "overview" | "environment" | "power" | "alarms";
export type ReviewShot = "overview" | "environment" | "assembly" | "time";
export type ReviewState = {
  scene: AppState;
  layer: ReviewLayer;
  analysis: boolean;
  selectedId: string;
  pendingId: string | null;
  pendingEndpoint: EndpointTarget | null;
  tour: TourState;
  pendingTour: boolean;
};
export const reviewLayers = [
  { id: "overview", name: "总览", description: "查看机房、机柜与设备结构" },
  {
    id: "environment",
    name: "温度",
    description: "设备进风温度；部件为模型温度",
  },
  { id: "power", name: "功耗", description: "设备输入功耗与预算占比" },
  {
    id: "alarms",
    name: "告警",
    description: "查找异常设备、查看事件与空间位置",
  },
] as const;
export function createReview(): ReviewState {
  return {
    scene: { ...createState(), time: 60, playing: false },
    layer: "overview",
    analysis: false,
    selectedId: "room-01",
    pendingId: null,
    pendingEndpoint: null,
    tour: createExperience(false).tour,
    pendingTour: false,
  };
}
export function createWorkspace(reducedMotion = false): ReviewState {
  const state = createReview();
  return {
    ...state,
    scene: { ...state.scene, playing: true },
    tour: createExperience(!reducedMotion).tour,
  };
}
export type ReviewAction =
  | { type: "scene"; action: Action }
  | { type: "layer"; layer: ReviewLayer }
  | { type: "shot"; shot: ReviewShot }
  | { type: "analysis"; value: boolean }
  | { type: "navigation-ready"; key: string }
  | { type: "room-airflow"; id: string }
  | { type: "return-analysis-scope"; id: string; level: "room" | "rack" }
  | { type: "return-input-scope"; id: string; level: "room" | "rack" }
  | { type: "inspect-network-endpoint"; linkId: string; deviceId: string }
  | { type: "inspect-power-input"; linkId: string }
  | Exclude<ExperienceAction, { type: "scene" }>;
export type ResourceAction = {
  type:
    | "pick"
    | "open-resource"
    | "focus-resource"
    | "locate-installation"
    | "extract-resource";
  id: string;
};
export function reviewTransition(
  state: ReviewState,
  action: ReviewAction | ResourceAction,
): ReviewState {
  const startTour = (current: ReviewState) => {
    const scene = {
      ...current.scene,
      deviceId: "srv-01",
      selected: "room-01",
      level: "room" as const,
      coverOpen: false,
      explosion: 0,
      doorOpen: false,
      rearDoorOpen: false,
      trayExtended: false,
    };
    const experience = experienceTransition(
      { scene, tour: current.tour },
      { type: "tour-restart" },
    );
    return {
      ...current,
      ...experience,
      selectedId: experience.scene.selected,
      pendingId: null,
      pendingEndpoint: null,
      pendingTour: false,
      layer: "overview" as const,
      analysis: false,
    };
  };
  if (action.type === "navigation-ready" && state.pendingTour) {
    return action.key === presentationKey(state.scene)
      ? startTour(state)
      : state;
  }
  if (
    action.type === "tour-restart" ||
    (action.type === "tour-resume" && state.tour.mode === "manual")
  ) {
    if (
      state.scene.level === "room" &&
      !state.scene.trayExtended &&
      !state.scene.doorOpen &&
      !state.scene.rearDoorOpen
    )
      return startTour(state);
    const returning = reviewInteractionTransition(state, {
      type: "open-resource",
      id: "room-01",
    });
    return {
      ...returning,
      pendingId: "room-01",
      pendingEndpoint: null,
      pendingTour: true,
      tour: { ...state.tour, mode: "manual" },
    };
  }
  switch (action.type) {
    case "takeover":
    case "tour-pause":
    case "tour-resume":
    case "tour-tick":
    case "simulation-tick": {
      const next = experienceTransition(state, action);
      if (action.type === "takeover" && state.pendingTour)
        return { ...state, ...next, pendingId: null, pendingTour: false };
      if (next.scene === state.scene && next.tour === state.tour) return state;
      const chapter = next.tour.revision !== state.tour.revision;
      return {
        ...state,
        ...next,
        selectedId: chapter ? next.scene.selected : state.selectedId,
        pendingId: chapter ? null : state.pendingId,
        pendingEndpoint: chapter ? null : state.pendingEndpoint,
        analysis: chapter ? false : state.analysis,
        layer: chapter ? "overview" : state.layer,
      };
    }
  }
  const next = reviewInteractionTransition(state, action);
  const clockOnly =
    action.type === "scene" &&
    ["play", "tick", "rate", "replay", "loop"].includes(action.action.type);
  if (next === state || clockOnly || action.type === "navigation-ready")
    return next;
  return {
    ...next,
    pendingEndpoint:
      action.type === "inspect-network-endpoint" ||
      action.type === "inspect-power-input" ||
      action.type === "layer" ||
      action.type === "analysis" ||
      (action.type === "scene" && action.action.type === "seek")
        ? next.pendingEndpoint
        : null,
    tour: { ...next.tour, mode: "manual" },
    pendingTour: false,
    pendingId:
      state.pendingTour && next.pendingId === state.pendingId
        ? null
        : next.pendingId,
  };
}

function reviewInteractionTransition(
  state: ReviewState,
  action: ReviewAction | ResourceAction,
): ReviewState {
  if (action.type === "inspect-power-input") {
    if (state.pendingId || state.pendingEndpoint) return state;
    const link = powerLinks.find((link) => link.id === action.linkId);
    if (!link) return state;
    return advanceConnectionEndpoint(state, {
      deviceId: link.deviceId,
      partId: inletPart(deviceById(link.deviceId)!.modelId, link.inlet),
    });
  }
  if (action.type === "inspect-network-endpoint") {
    if (state.pendingId || state.pendingEndpoint) return state;
    const endpoint = networkEndpoints(action.linkId).find(
      (item) => item.deviceId === action.deviceId,
    );
    return endpoint ? advanceConnectionEndpoint(state, endpoint) : state;
  }
  if (action.type === "pick")
    return entityById(action.id)
      ? {
          ...state,
          selectedId: action.id,
          pendingId: null,
          scene: canSelectInScene(state.scene, action.id)
            ? { ...state.scene, selected: action.id }
            : state.scene,
        }
      : state;
  if (
    action.type === "return-analysis-scope" ||
    action.type === "return-input-scope"
  ) {
    const inputScope = action.type === "return-input-scope";
    if (
      !(inputScope
        ? sourceMetrics(action.id).length
        : peakScopeIds(action.id)) ||
      state.pendingId ||
      state.pendingEndpoint ||
      (action.level === "rack" &&
        entityById(action.id)?.kind !== "rack" &&
        !(inputScope && pduById(action.id)))
    )
      return state;
    if (action.level === "rack")
      return reviewInteractionTransition(state, {
        type: "open-resource",
        id: action.id,
      });
    // 房间范围和从机房预览的机柜均返回机房；复用机构归位与 pendingId，不恢复旧结构。
    const next = reviewInteractionTransition(state, {
      type: "open-resource",
      id: "room-01",
    });
    return {
      ...next,
      selectedId: action.id,
      scene:
        next.scene.level === "room"
          ? { ...next.scene, selected: action.id }
          : next.scene,
    };
  }
  if (action.type === "room-airflow") {
    const target = roomAirflowTarget(action.id, state.scene.deviceId);
    if (!target || state.pendingId) return state;
    const thermal: ReviewState = { ...state, layer: "environment" };
    if (state.scene.level === "room")
      return reviewInteractionTransition(thermal, {
        type: "pick",
        id: target.id,
      });
    // pendingId 记录结构归位后的目的地，selectedId 保留要在机房观察的对象。
    const next = reviewInteractionTransition(thermal, {
      type: "open-resource",
      id: "room-01",
    });
    return {
      ...next,
      selectedId: target.id,
      scene:
        next.scene.level === "room"
          ? { ...next.scene, selected: target.id }
          : next.scene,
    };
  }
  if (action.type === "navigation-ready") {
    if (state.pendingEndpoint)
      return action.key === presentationKey(state.scene)
        ? advanceConnectionEndpoint(state, state.pendingEndpoint)
        : state;
    if (!state.pendingId || action.key !== presentationKey(state.scene))
      return state;
    if (entityById(state.pendingId)?.kind === "device")
      return {
        ...state,
        selectedId: state.pendingId,
        pendingId: null,
        scene: {
          ...transition(state.scene, {
            type: "navigate",
            level: "rack",
            id: state.pendingId,
          }),
          selected: state.pendingId,
          doorOpen: false,
          trayExtended: false,
          explosion: 0,
        },
      };
    const next = reviewTransition(
      { ...state, pendingId: null },
      { type: "open-resource", id: state.pendingId },
    );
    if (state.pendingId === "room-01" && state.selectedId !== state.pendingId)
      return {
        ...next,
        selectedId: state.selectedId,
        scene: { ...next.scene, selected: state.selectedId },
      };
    return next;
  }
  if (action.type === "extract-resource") {
    if (
      entityById(action.id)?.kind !== "device" ||
      state.scene.level !== "rack" ||
      rackForDevice(action.id).id !== rackForDevice(state.scene.deviceId).id ||
      (state.scene.trayExtended && action.id !== state.scene.deviceId)
    )
      return state;
    const selected = transition(state.scene, { type: "select", id: action.id });
    return {
      ...state,
      selectedId: action.id,
      scene: transition(selected, {
        type: "tray",
        extended: !selected.trayExtended,
      }),
    };
  }
  if (
    action.type === "open-resource" ||
    action.type === "focus-resource" ||
    action.type === "locate-installation"
  ) {
    const installation = action.type === "locate-installation";
    const target = entityById(action.id);
    if (!target || (installation && target.kind !== "device")) return state;
    const current = state.scene;
    let scene = current;
    const elsewhere =
      (installation && current.level === "device") ||
      (target.kind === "device" && target.id !== current.deviceId) ||
      (target.kind === "rack" &&
        target.id !== rackForDevice(current.deviceId).id) ||
      target.kind === "room" ||
      target.kind === "facility";
    const targetRack =
      pduById(target.id)?.rackId ??
      (target.kind === "rack"
        ? target.id
        : target.kind === "device"
          ? rackForDevice(target.id).id
          : undefined);
    const leavesRack = targetRack !== rackForDevice(current.deviceId).id;
    // 先复原并回到原机柜，再切换实例，避免运动中替换几何。
    if (
      elsewhere &&
      (current.level === "device" ||
        (current.level === "rack" &&
          (current.trayExtended || (current.rearDoorOpen && leavesRack))))
    ) {
      scene =
        current.level === "device"
          ? transition(current, { type: "back" })
          : {
              ...current,
              trayExtended: false,
              doorOpen: false,
              rearDoorOpen: false,
            };
      return { ...state, scene, selectedId: action.id, pendingId: action.id };
    }
    if (pduById(target.id)) {
      const pdu = pduById(target.id)!;
      if (
        current.level !== "rack" ||
        rackForDevice(current.deviceId).id !== pdu.rackId
      )
        scene = {
          ...transition(current, {
            type: "navigate",
            level: "rack",
            id: target.id,
          }),
          doorOpen: false,
          trayExtended: false,
        };
      scene = transition({ ...scene, selected: target.id }, { type: "focus" });
    } else if (target.kind === "part") {
      if (!canSelectInScene(current, target.id)) return state;
      scene = transition(
        transition(
          { ...current, selected: target.id },
          { type: "explode", amount: 1 },
        ),
        { type: "focus" },
      );
    } else if (
      (action.type === "focus-resource" || installation) &&
      target.kind === "device" &&
      current.level === "rack" &&
      rackForDevice(target.id).id === rackForDevice(current.deviceId).id
    ) {
      scene = { ...current, selected: target.id };
      if (installation) scene = transition(scene, { type: "focus" });
    } else if (
      action.type === "focus-resource" &&
      canSelectInScene(current, action.id) &&
      target.kind !== "device"
    ) {
      scene = transition(
        { ...current, selected: target.id },
        { type: "focus" },
      );
    } else if (target.kind === "device") {
      if (current.level === "device" && target.id === current.deviceId)
        scene = transition(current, { type: "focus" });
      else if (
        current.level === "rack" &&
        rackForDevice(current.deviceId).id === rackForDevice(target.id).id &&
        (!current.trayExtended || target.id === current.deviceId)
      )
        scene = transition(current, {
          type: "navigate",
          level: "device",
          id: target.id,
        });
      else
        scene = {
          ...transition(current, {
            type: "navigate",
            level: "rack",
            id: target.id,
          }),
          selected: target.id,
          doorOpen: false,
          trayExtended: false,
          explosion: 0,
        };
    } else {
      scene = transition(current, {
        type: "navigate",
        level: target.kind === "rack" ? "rack" : "room",
        id: target.id,
      });
      if (target.kind === "rack" && current.level !== "device")
        scene = { ...scene, doorOpen: false, trayExtended: false };
      if (target.kind === "facility")
        scene = transition(
          { ...scene, selected: target.id },
          { type: "focus" },
        );
    }
    return { ...state, scene, selectedId: action.id, pendingId: null };
  }
  if (action.type === "scene") {
    const scene = transition(state.scene, action.action);
    const changesSelection = [
      "select",
      "navigate",
      "locate",
      "back",
      "reset",
      "enter",
    ].includes(action.action.type);
    return {
      ...state,
      scene,
      selectedId: changesSelection ? scene.selected : state.selectedId,
      pendingId: changesSelection ? null : state.pendingId,
    };
  }
  if (action.type === "layer") return { ...state, layer: action.layer };
  if (action.type === "shot") {
    // 只有明确载入演示画面才装载预设；普通图层、时间操作不改镜头与姿态。
    const initial = createReview();
    initial.scene.focusRevision = state.scene.focusRevision + 1;
    if (action.shot === "environment") initial.layer = "environment";
    if (action.shot === "assembly") {
      initial.scene = transition(initial.scene, {
        type: "locate",
        id: "srv-01",
      });
      initial.scene = transition(initial.scene, {
        type: "explode",
        amount: 0.8,
      });
    }
    if (action.shot === "time") {
      initial.layer = "environment";
      initial.scene = transition(initial.scene, {
        type: "locate",
        id: "srv-01",
      });
      initial.scene.time = 90;
      initial.analysis = true;
    }
    initial.selectedId = initial.scene.selected;
    return initial;
  }
  if (action.type === "analysis") return { ...state, analysis: action.value };
  return state;
}

/** 先归位旧实例，再进入目标整机；待机构就绪后才展开并聚焦所属部件。 */
function advanceConnectionEndpoint(
  state: ReviewState,
  target: EndpointTarget,
): ReviewState {
  const current = state.scene;
  if (current.level === "device" && current.deviceId === target.deviceId) {
    const next = reviewInteractionTransition(state, {
      type: "focus-resource",
      id: target.partId,
    });
    return { ...next, pendingEndpoint: null };
  }
  let scene: AppState;
  if (current.level === "device") {
    scene = transition(current, { type: "back" });
  } else if (current.level === "rack" && current.deviceId === target.deviceId) {
    scene = transition(current, {
      type: "navigate",
      level: "device",
      id: target.deviceId,
    });
  } else if (
    current.level === "rack" &&
    (current.trayExtended || current.rearDoorOpen)
  ) {
    scene = {
      ...current,
      trayExtended: false,
      doorOpen: false,
      rearDoorOpen: false,
    };
  } else {
    scene = {
      ...transition(current, {
        type: "navigate",
        level: "rack",
        id: target.deviceId,
      }),
      selected: target.deviceId,
      doorOpen: false,
      trayExtended: false,
    };
  }
  return {
    ...state,
    scene,
    selectedId: target.deviceId,
    pendingId: null,
    pendingEndpoint: { deviceId: target.deviceId, partId: target.partId },
  };
}
export type ReviewMetric = "temperature" | "power";
/** 视图直接决定显示内容，不再通过额外开关隐藏当前指标。 */
export function reviewPresentation(
  layer: ReviewLayer,
  level: AppState["level"],
) {
  const detail = level === "device";
  if (layer === "alarms")
    return {
      mode: "alarms" as const,
      title: "告警定位",
      description: "在下方列表选择设备，再定位到空间；不会自动抽出或拆开设备。",
    };
  if (layer === "environment")
    return {
      mode: "temperature" as const,
      title: detail ? "设备与部件温度 · °C" : "设备进风温度 · °C",
      description: detail
        ? "部件为模型表面温度，机箱采用整机进风温度。"
        : "色条对应设备 U 位与进风温度；机柜标签取有效设备最高进风值。",
    };
  if (layer === "power")
    return {
      mode: "power" as const,
      title: "功耗 / 预算占比 · %",
      description: detail
        ? "机箱按整机输入、部件按分配功耗着色；右侧显示所选对象的 W 值。"
        : "标尺表示机柜功耗占预算的比例；标签显示实际 W / kW。",
    };
  return {
    mode: "status" as const,
    title: detail ? "设备结构" : "机房总览",
    description: detail
      ? "保留模型材质；部件状态来自模型评估，非独立告警。"
      : "单击选中对象；通过“查看”逐层进入机柜和设备。",
  };
}
export type ReviewPoint = {
  peakSources?: string[];
  time: number;
  value: number | null;
  coverage: number;
  count: number;
  quality: DataQuality;
};
/** 各层级使用同一汇总规则；无效测点保留空缺，有效零值保留为零。 */
export function reviewHistory(
  id: string,
  deviceId: string,
  metric: ReviewMetric,
): ReviewPoint[] {
  return reviewHistories(id, deviceId)[metric];
}

/** 同一时间快照同时派生两条曲线，避免指标切换改变汇总口径。 */
export function reviewHistories(id: string, deviceId: string) {
  const sourceIds = peakScopeIds(id);
  const history: Record<ReviewMetric, ReviewPoint[]> = {
    temperature: [],
    power: [],
  };
  for (let time = 0; time <= 120; time++) {
    const readings = spatialSnapshot(time, 0, deviceId).readings;
    const reading = readings.get(id) ?? associatedInputReading(id, readings);
    for (const metric of ["temperature", "power"] as const)
      history[metric].push({
        ...(metric === "temperature" && sourceIds
          ? {
              peakSources:
                reading?.quality === "valid" && reading.temperature !== null
                  ? maximumSources(sourceIds, readings)
                  : [],
            }
          : {}),
        time,
        value: reading?.quality === "valid" ? reading[metric] : null,
        coverage: reading
          ? metric === "temperature"
            ? reading.coverageTemperature
            : reading.coveragePower
          : 0,
        count: reading?.count ?? 0,
        quality: reading?.quality ?? "missing",
      });
  }
  return history;
}

export type ReviewEvent = SimulationEvent & { deviceIds: string[] };
/** 冷却输入与关联进风使用同一时钟；输入百分比不是设施计量。 */
export function reviewCoolingHistories() {
  const histories: Record<"temperature" | "cooling", ReviewPoint[]> = {
    temperature: [],
    cooling: [],
  };
  const ids = coolingDeviceIds(coolingSource.id);
  for (let time = 0; time <= 120; time++) {
    const readings = spatialSnapshot(time).readings;
    const summary = coolingSummary(ids, readings);
    histories.temperature.push({
      peakSources: maximumSources(ids, readings),
      time,
      value: summary.maximum,
      coverage: summary.coverage,
      count: summary.count,
      quality: summary.maximum === null ? "missing" : "valid",
    });
    histories.cooling.push({
      time,
      value: Math.round(coolingCapacityAt(time)),
      coverage: 1,
      count: 1,
      quality: "valid",
    });
  }
  return histories;
}
/** 已知历史不会因当前数据过期消失；公共冷却输入在当前范围只显示一次。 */
export function reviewEvents(
  deviceIds: string[],
  time: number,
  cycle = 0,
): ReviewEvent[] {
  const events = new Map<string, ReviewEvent>();
  for (const id of deviceIds) {
    const observation = deviceObservation(time, id, cycle);
    if (observation.observedAt === null) continue;
    for (const event of observation.sample.events) {
      if (
        event.time > time ||
        event.time > observation.observedAt ||
        (observation.lifecycle === "stopped" && event.kind !== "input")
      )
        continue;
      const key =
        event.kind === "input"
          ? `${event.entityId}:${event.kind}:${event.time}`
          : event.id;
      const previous = events.get(key);
      if (previous) {
        if (!previous.deviceIds.includes(id)) previous.deviceIds.push(id);
      } else events.set(key, { ...event, id: key, deviceIds: [id] });
    }
  }
  return [...events.values()].sort(
    (a, b) => b.time - a.time || a.id.localeCompare(b.id),
  );
}

/** reviewEvents 已按时间倒序排列。各来源按最近事件排序，组内按发生顺序回看。 */
export function eventsBySource(events: ReviewEvent[]) {
  const groups = new Map<string, ReviewEvent[]>();
  for (const event of events) {
    const group = groups.get(event.entityId);
    if (group) group.push(event);
    else groups.set(event.entityId, [event]);
  }
  return Array.from(groups, ([source, history]) => ({
    source,
    history: history.reverse(),
  }));
}
