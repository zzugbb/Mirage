import { nearestFloorGrille } from "./floor-grilles.ts";
import type { FloorGrille } from "./floor-grilles.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  devices,
  racks,
  deviceById,
  deviceHeight,
  rackForDevice,
} from "./installation.ts";
import { modelForDevice } from "./catalog.ts";
import { entityById } from "./domain.ts";
import type { AppState } from "./domain.ts";
import type { SpatialReading } from "./spatial.ts";
import { coolingCapacityAt, normalizeTime, scenario } from "./simulation.ts";
import { qualityNames, lifecycleNames } from "./status.ts";
import { sliceRackRows } from "./temperature-slice.ts";

export const airflowSettings = definition.airflow;
export type FlowPoint = [number, number, number];
export type FlowKind = "supply" | "through" | "return";
export type FlowEndpoint = {
  kind: "supply" | "floor" | "intake" | "return";
  point: FlowPoint;
  title: string;
  detail: string;
};
export type AirflowRoute = {
  id: string;
  sourceId: string;
  deviceId: string;
  rackId: string;
  floorGrille: FloorGrille;
  animated: boolean;
  status: string;
  endpoints: FlowEndpoint[];
  segments: { kind: FlowKind; points: FlowPoint[] }[];
};
export type AirflowSnapshot = ReturnType<typeof airflowSnapshot>;
const plus = (a: number[], b: number[]): FlowPoint => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
const lerp = (a: number[], b: number[], t: number): FlowPoint =>
  [0, 1, 2].map((axis) => a[axis] + (b[axis] - a[axis]) * t) as FlowPoint;
const distance = (a: number[], b: number[]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** 圆角限制在相邻线段的三分之一内，避免样条在地面或柜体边界外过冲。 */
export function roundedFlowPath(points: FlowPoint[]): FlowPoint[] {
  const result: FlowPoint[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i],
      before = points[i - 1],
      after = points[i + 1];
    const aLength = distance(p, before),
      bLength = distance(p, after);
    if (aLength < 1e-8 || bLength < 1e-8) continue;
    const radius = Math.min(
      airflowSettings.cornerRadius,
      aLength / 3,
      bLength / 3,
    );
    const a = lerp(p, before, radius / aLength),
      b = lerp(p, after, radius / bLength);
    result.push(a);
    for (let step = 1; step <= 5; step++) {
      const t = step / 5;
      result.push(lerp(lerp(a, p, t), lerp(p, b, t), t));
    }
  }
  result.push(points.at(-1)!);
  return result;
}

export function flowPoint(points: FlowPoint[], progress: number): FlowPoint {
  const lengths = points
    .slice(1)
    .map((point, index) => distance(points[index], point));
  let remaining =
    Math.max(0, Math.min(1, progress)) *
    lengths.reduce((sum, length) => sum + length, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i])
      return lerp(
        points[i],
        points[i + 1],
        lengths[i] ? remaining / lengths[i] : 0,
      );
    remaining -= lengths[i];
  }
  return [...points.at(-1)!];
}

function representative(rackId: string) {
  return devices
    .filter(
      (device) =>
        device.rackId === rackId &&
        modelForDevice(device.id).category === "server" &&
        device.lifecycle === "running",
    )
    .sort(
      (a, b) =>
        Math.abs(deviceHeight(a.id) - airflowSettings.representativeHeight) -
          Math.abs(deviceHeight(b.id) - airflowSettings.representativeHeight) ||
        a.id.localeCompare(b.id),
    )[0];
}
/** 仅作已登记冷却关系的布置示意；风向是当前配置的假设，不读取或虚构风速。 */
export function airflowSnapshot(
  time: number,
  readings: Map<string, SpatialReading>,
  selectedId = "room-01",
  deviceId = "srv-01",
  rowId: string | null = null,
) {
  const row = sliceRackRows.find((row) => row.id === rowId);
  const selected = entityById(selectedId);
  const device =
    deviceById(selectedId) ??
    (selected?.kind === "part" ? deviceById(deviceId) : undefined);
  const selectedRack = device
    ? rackForDevice(device.id)
    : racks.find((rack) => rack.id === selectedId);
  const targets =
    device && (!row || row.rackIds.includes(device.rackId))
      ? [device]
      : selectedRack && (!row || row.rackIds.includes(selectedRack.id))
        ? [representative(selectedRack.id)]
        : row
          ? [representative(row.rackIds[0])]
          : [representative(sliceRackRows[0].rackIds[0])];
  const routes: AirflowRoute[] = [];
  for (const target of targets) {
    if (
      !target ||
      airflowSettings.modelDirections[
        target.modelId as keyof typeof airflowSettings.modelDirections
      ] !== "front-to-rear-assumed"
    )
      continue;
    const relation = definition.installation.relations.find(
      (relation) =>
        relation.target === target.id && relation.kind === "cooling",
    );
    const source = definition.facilities.find(
      (facility) => facility.id === relation?.source,
    );
    if (!source || !relation) continue;
    const rack = rackForDevice(target.id),
      h = deviceHeight(target.id),
      [x, , z] = rack.position;
    const rackRow = sliceRackRows.find((row) => row.rackIds.includes(rack.id));
    const floorGrille = nearestFloorGrille(rackRow?.id ?? "", x);
    if (!floorGrille) continue;
    const front = z + definition.rack.size[2] / 2,
      rear = z - definition.rack.size[2] / 2;
    const outlet = plus(source.position, airflowSettings.supplyOffset),
      inlet = plus(source.position, airflowSettings.returnOffset);
    const intake: FlowPoint = [x, h, front + airflowSettings.faceClearance],
      exhaust: FlowPoint = [x, h, rear - airflowSettings.faceClearance];
    const floor: FlowPoint = [
      floorGrille.position[0],
      airflowSettings.supplyHeight,
      floorGrille.position[2],
    ];
    const returnTurn: FlowPoint = [
      x,
      airflowSettings.returnHeight,
      rear - airflowSettings.rearApproach,
    ];
    const reading = readings.get(target.id);
    const animated =
      reading?.quality === "valid" &&
      reading.lifecycle === "running" &&
      Number.isFinite(reading.temperature);
    const status =
      reading?.lifecycle === "stopped"
        ? "停机，仅静态示意"
        : reading?.quality !== "valid"
          ? `${reading ? qualityNames[reading.quality] : "未配置"}，仅静态示意`
          : !Number.isFinite(reading.temperature)
            ? "无有效温度，仅静态示意"
            : reading.lifecycle !== "running"
              ? `${lifecycleNames[reading.lifecycle]}，仅静态示意`
              : "代表路径";
    routes.push({
      id: relation.id,
      sourceId: source.id,
      deviceId: target.id,
      rackId: rack.id,
      floorGrille,
      animated,
      status,
      endpoints: [
        {
          kind: "supply",
          point: outlet,
          title: "送风 · 逻辑端点",
          detail: `${source.name} · 冷却输入 ${Math.round(coolingCapacityAt(time))}%`,
        },
        {
          kind: "floor",
          point: floor,
          title: "地板送风",
          detail: `${rack.name.split(" ")[0]} 柜前格栅 · 假设送出位置`,
        },
        {
          kind: "intake",
          point: intake,
          title: "设备进风",
          detail: `${target.name} · ${animated ? `${reading.temperature!.toFixed(1)} °C · 模拟` : status}`,
        },
        {
          kind: "return",
          point: returnTurn,
          title: "回风假设",
          detail: `柜后 → ${source.name} · 无排风测点`,
        },
      ],
      segments: [
        {
          kind: "supply",
          points: roundedFlowPath([
            outlet,
            [
              airflowSettings.serviceAisleX,
              airflowSettings.supplyHeight,
              outlet[2],
            ],
            [
              airflowSettings.serviceAisleX,
              airflowSettings.supplyHeight,
              floor[2],
            ],
            floor,
            [floor[0], h, floor[2]],
            intake,
          ]),
        },
        { kind: "through", points: [intake, exhaust] },
        {
          kind: "return",
          points: roundedFlowPath([
            exhaust,
            [x, h, rear - airflowSettings.rearApproach],
            returnTurn,
            [
              airflowSettings.serviceAisleX,
              airflowSettings.returnHeight,
              rear - airflowSettings.rearApproach,
            ],
            [
              airflowSettings.serviceAisleX,
              airflowSettings.returnHeight,
              inlet[2],
            ],
            inlet,
          ]),
        },
      ],
    });
  }
  return {
    time: normalizeTime(time),
    coolingCapacity: Math.round(coolingCapacityAt(time)),
    routes,
    label:
      routes.length === 1
        ? `${racks.find((rack) => rack.id === routes[0].rackId)!.name.split(" ")[0]} / ${deviceById(routes[0].deviceId)!.name} · ${routes[0].status}`
        : routes.length
          ? `${routes.map((route) => `${racks.find((rack) => rack.id === route.rackId)!.name.split(" ")[0]}/${deviceById(route.deviceId)!.name}`).join(" · ")} · ${routes.every((route) => route.animated) ? "代表路径" : "含仅静态示意对象"}`
          : "当前范围未定义冷却路径",
  };
}

/** 只平滑演示粒子；业务输入仍取整数快照。暂停/回看不累计上次位置。 */
export function airflowVisualTime(
  state: Pick<AppState, "time" | "playing" | "playbackRate">,
  elapsedMilliseconds: number,
  staticFrame = false,
) {
  const time = normalizeTime(state.time);
  if (!state.playing || staticFrame) return time;
  const elapsed = Number.isFinite(elapsedMilliseconds)
    ? Math.max(0, Math.min(0.999, elapsedMilliseconds / 1000))
    : 0;
  return Math.min(scenario.duration, time + elapsed * state.playbackRate);
}
