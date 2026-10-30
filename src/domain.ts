import {
  partsForDevice,
  subpartsForDevice,
  modelForDevice,
  categoryNames,
} from "./catalog.ts";
import { racks, devices, deviceById, rackForDevice } from "./installation.ts";
import sceneDefinition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { normalizeTime, scenario } from "./simulation.ts";
export { simulate } from "./simulation.ts";

export type Level = "room" | "rack" | "device";
export const parts = sceneDefinition.parts;
export const subparts = sceneDefinition.subparts;
export const componentById = (id: string) =>
  parts.find((p) => p.id === id) ?? subparts.find((p) => p.id === id);
export type Part = (typeof parts)[number];
export const partPosition = (part: Part, amount: number) =>
  part.position.map(
    (value, index) =>
      value +
      part.explode[index] *
        (Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 0),
  );
export type Entity = {
  id: string;
  name: string;
  kind: "room" | "rack" | "device" | "facility" | "part";
  parent?: string;
  description: string;
};
export const entities: Entity[] = [
  {
    id: "room-01",
    name: "01号机房",
    kind: "room",
    description: "14 × 12 m 原创示意空间，采用剖切展示。",
  },
  {
    id: "rack-a01",
    name: "A01 机柜",
    kind: "rack",
    parent: "room-01",
    description: "42U 计算机柜，顶置双交换机与后置 A/B PDU。",
  },
  {
    id: "srv-01",
    name: "SRV-01 服务器",
    kind: "device",
    parent: "rack-a01",
    description: "双处理器散热结构、十六条内存与八个前置盘位的 2U 服务器示意。",
  },
  {
    id: "cooling-01",
    name: "制冷单元",
    kind: "facility",
    parent: "room-01",
    description: "风冷设施示意，尚未进行热流体仿真。",
  },
  {
    id: "power-01",
    name: "配电柜",
    kind: "facility",
    parent: "room-01",
    description: "配电设施示意，尚未建立供电连接关系。",
  },
  ...racks
    .filter((rack) => rack.id !== "rack-a01")
    .map((rack) => ({
      id: rack.id,
      name: rack.name,
      kind: "rack" as const,
      parent: "room-01",
      description: "42U 混合设备机柜，按实际 U 位安装，顶置交换机、后置 PDU。",
    })),
  ...devices
    .filter((device) => device.id !== "srv-01")
    .map((device) => ({
      id: device.id,
      name: `${device.name} ${categoryNames[modelForDevice(device.id).category as keyof typeof categoryNames]}`,
      kind: "device" as const,
      parent: device.rackId,
      description: modelForDevice(device.id).description,
    })),
  ...subparts.map((part) => ({ ...part, kind: "part" as const })),
  ...parts.map((part) => ({
    id: part.id,
    name: part.name,
    kind: "part" as const,
    description: part.description,
  })),
];
export const entityById = (id: string) =>
  entities.find((entity) => entity.id === id);
export type AppState = {
  level: Level;
  deviceId: string;
  selected: string;
  focusRevision: number;
  time: number;
  playing: boolean;
  playbackRate: 1 | 2 | 4;
  loop: boolean;
  replayCycle: number;
  explosion: number;
  doorOpen: boolean;
  trayExtended: boolean;
};
// 只包含影响镜头与结构的输入，模拟时钟不会使展示就绪信号失效。
export const presentationKey = (state: AppState) =>
  [
    state.level,
    state.deviceId,
    state.selected,
    state.focusRevision,
    state.explosion,
    state.doorOpen,
    state.trayExtended,
  ].join(":");
export type Action =
  | { type: "select"; id: string }
  | { type: "navigate"; level: Level; id?: string }
  | { type: "explode"; amount: number }
  | { type: "door"; open: boolean }
  | { type: "tray"; extended: boolean }
  | { type: "seek"; time: number }
  | { type: "rate"; rate: 1 | 2 | 4 }
  | { type: "locate"; id: string }
  | {
      type:
        | "enter"
        | "back"
        | "focus"
        | "reset"
        | "play"
        | "tick"
        | "replay"
        | "loop";
    };
export const createState = (): AppState => ({
  level: "room",
  deviceId: "srv-01",
  selected: "room-01",
  focusRevision: 0,
  time: 0,
  playing: true,
  playbackRate: 1,
  loop: true,
  replayCycle: 0,
  explosion: 0,
  doorOpen: false,
  trayExtended: false,
});
export const getPath = (state: AppState) => [
  "room-01",
  ...(state.level !== "room" ? [rackForDevice(state.deviceId).id] : []),
  ...(state.level === "device"
    ? [
        state.deviceId,
        ...(entityById(state.selected)?.kind === "part"
          ? [state.selected]
          : []),
      ]
    : []),
];
export function transition(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "select":
      return entityById(action.id) &&
        (entityById(action.id)?.kind !== "part" ||
          (state.level === "device" &&
            [
              ...partsForDevice(state.deviceId),
              ...subpartsForDevice(state.deviceId),
            ].some((part) => part.id === action.id)))
        ? {
            ...state,
            selected: action.id,
            deviceId:
              deviceById(action.id)?.id ??
              (racks.some((rack) => rack.id === action.id)
                ? rackForDevice(state.deviceId).id === action.id
                  ? state.deviceId
                  : devices.find((device) => device.rackId === action.id)!.id
                : state.deviceId),
          }
        : state;
    case "navigate": {
      const target = action.id ?? state.selected;
      const deviceId =
        deviceById(target)?.id ??
        (racks.some((rack) => rack.id === target)
          ? rackForDevice(state.deviceId).id === target
            ? state.deviceId
            : devices.find((device) => device.rackId === target)!.id
          : state.deviceId);
      return {
        ...state,
        deviceId,
        level: action.level,
        selected:
          action.level === "room"
            ? "room-01"
            : action.level === "rack"
              ? rackForDevice(deviceId).id
              : deviceId,
        explosion: action.level === "device" ? state.explosion : 0,
        doorOpen: action.level !== "room",
        trayExtended: action.level === "device",
        focusRevision: state.focusRevision + 1,
      };
    }
    case "explode":
      return state.level === "device" && Number.isFinite(action.amount)
        ? { ...state, explosion: Math.max(0, Math.min(1, action.amount)) }
        : state;
    case "door":
      return state.level === "rack"
        ? {
            ...state,
            doorOpen: action.open,
            trayExtended: action.open ? state.trayExtended : false,
          }
        : state;
    case "tray":
      return state.level === "rack"
        ? {
            ...state,
            trayExtended: action.extended,
            doorOpen: action.extended || state.doorOpen,
          }
        : state;
    case "enter":
      return transition(state, {
        type: "navigate",
        level: state.level === "room" ? "rack" : "device",
      });
    case "back":
      return transition(state, {
        type: "navigate",
        level: state.level === "device" ? "rack" : "room",
      });
    case "focus":
      return { ...state, focusRevision: state.focusRevision + 1 };
    case "reset":
      return { ...createState(), focusRevision: state.focusRevision + 1 };
    case "play":
      return state.time === scenario.duration && !state.playing
        ? {
            ...state,
            time: 0,
            playing: true,
            replayCycle: state.replayCycle + 1,
          }
        : { ...state, playing: !state.playing };
    case "seek":
      return Number.isFinite(action.time)
        ? { ...state, time: normalizeTime(action.time), playing: false }
        : state;
    case "rate":
      return [1, 2, 4].includes(action.rate)
        ? { ...state, playbackRate: action.rate }
        : state;
    case "loop":
      return { ...state, loop: !state.loop };
    case "replay":
      return {
        ...state,
        time: 0,
        playing: true,
        replayCycle: state.replayCycle + 1,
      };
    case "locate": {
      const entity = entityById(action.id);
      if (!entity) return state;
      if (
        entity.kind === "part" &&
        ![
          ...partsForDevice(state.deviceId),
          ...subpartsForDevice(state.deviceId),
        ].some((part) => part.id === entity.id)
      )
        return state;
      const level =
        entity.kind === "facility" || entity.kind === "room"
          ? "room"
          : entity.kind === "rack"
            ? "rack"
            : "device";
      return {
        ...transition(state, { type: "navigate", level, id: entity.id }),
        selected: entity.id,
      };
    }
    case "tick":
      if (!state.playing) return state;
      if (state.time === scenario.duration)
        return state.loop
          ? { ...state, time: 0, replayCycle: state.replayCycle + 1 }
          : { ...state, playing: false };
      return {
        ...state,
        time: Math.min(scenario.duration, state.time + state.playbackRate),
        playing:
          state.loop || state.time + state.playbackRate < scenario.duration,
      };
  }
}
export type Metric = {
  value: number | null;
  unit: string;
  quality: "valid" | "missing" | "offline" | "stale";
};
export const metricText = (metric: Metric) =>
  metric.quality === "offline"
    ? "离线"
    : metric.quality === "stale"
      ? "已过期"
      : metric.value === null || metric.quality === "missing"
        ? "未采集"
        : `${metric.value} ${metric.unit}`;
