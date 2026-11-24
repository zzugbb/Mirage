import { condensate, condensateFloorY, drainStands } from "./condensate.ts";
import { Vector3 } from "three";
import {
  configuredPathLength,
  isLeakFixture,
  leakDetection,
  nearbyCooling,
  leakCable,
} from "./leak-detection.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";
import {
  leakFitting,
  leakFittingObservation,
  type LeakFittingId,
} from "./leak-fittings.ts";

export const leakViews = [
  { id: "all", label: "完整布置" },
  { id: "route", label: "整支路里程" },
  { id: "lead", label: "控制器与引线" },
  { id: "sensing", label: "感应线路径" },
  { id: "end", label: "末端封接" },
  { id: "fitting", label: "线端装配" },
  { id: "floor", label: leakCable.location },
] as const;
export type LeakView = (typeof leakViews)[number]["id"];
export type LeakFloorTarget =
  number | { fromJoint?: number; segment?: number; standId?: string };
export type LeakTarget =
  | LeakFloorTarget
  | { fromController: number }
  | { fitting: LeakFittingId; opened?: boolean };
export type LeakViewCommand = {
  revision: number;
  view: LeakView | null;
  target?: LeakTarget;
};
export const leakViewIncludes = (id: string) =>
  isLeakFixture(id) || id === leakDetection.nearbyFacilityId;
const vector = (point: number[]) => new Vector3().fromArray(point);

/** 里程从传入折线的起点算起，折点归入下一段，末端归入最后一段。仅指定段时沿用段中点。 */
function pathPosition(
  points: Vector3[],
  segment: number,
  requested?: number,
  retainSegment = false,
) {
  const ends: number[] = [0];
  for (let i = 1; i < points.length; i++)
    ends.push(ends[i - 1] + points[i - 1].distanceTo(points[i]));
  const total = ends[ends.length - 1];
  let index =
    Number.isInteger(segment) && segment >= 0 && segment < points.length - 1
      ? segment
      : 0;
  let distance = (ends[index] + ends[index + 1]) / 2;
  if (requested !== undefined && Number.isFinite(requested)) {
    distance = Math.max(0, Math.min(requested, total));
    // 消除米制小数在段长累加时的舍入误差，精确落在接头或转角上。
    distance = ends.find((at) => Math.abs(at - distance) < 1e-9) ?? distance;
    const next = ends.findIndex((at) => at > distance);
    if (!(
      retainSegment &&
      distance >= ends[index] &&
      distance <= ends[index + 1]
    ))
      index = next === -1 ? points.length - 2 : next - 1;
  }
  const start = points[index],
    end = points[index + 1];
  const length = start.distanceTo(end);
  const point = start
    .clone()
    .lerp(end, length ? (distance - ends[index]) / length : 0);
  return { index, start, end, length, point, station: distance, total, ends };
}

function leakFloorSegment(sensing: Vector3[], target: LeakTarget) {
  const choice =
    typeof target === "object" &&
    !("fromController" in target) &&
    !("fitting" in target)
      ? target
      : undefined;
  const stand = drainStands.find((s) => s.id === choice?.standId);
  const {
    index,
    start,
    end,
    length,
    point,
    station: fromJoint,
    total,
  } = pathPosition(
    sensing,
    typeof target === "number" ? target : (choice?.segment ?? 0),
    choice?.fromJoint,
    choice?.segment !== undefined,
  );
  const size = stand ? condensate.supports.footSize : nearbyCooling.size;
  const center = stand
      ? new Vector3(
          stand.axis[0],
          condensateFloorY + size[1] / 2,
          stand.axis[2],
        )
      : vector(nearbyCooling.position),
    half = vector(size).multiplyScalar(0.5);
  const min = center.clone().sub(half),
    max = center.clone().add(half);
  const edge = point.clone().clamp(min, max);
  edge.y = point.y;
  const sides = (["x", "z"] as const).flatMap((axis) => {
    const offset = point[axis] - edge[axis];
    return offset ? [(offset > 0 ? "+" : "−") + axis.toUpperCase()] : [];
  });
  const footprint = [
    new Vector3(min.x, point.y, min.z),
    new Vector3(max.x, point.y, min.z),
    new Vector3(max.x, point.y, max.z),
    new Vector3(min.x, point.y, max.z),
  ];
  const corners = footprint.flatMap(({ x, z }) => [
    new Vector3(x, min.y, z),
    new Vector3(x, max.y, z),
  ]);
  const top = new Vector3(center.x, max.y, center.z);
  return {
    index,
    start,
    end,
    length,
    point,
    stand,
    fromJoint,
    station: fromJoint,
    total,
    toEnd: total - fromJoint,
    edge,
    distance: point.distanceTo(edge),
    side: sides.length ? sides.join(" / ") + " 侧" : "投影内",
    footprint,
    corners,
    top,
  };
}

function inspectionSection(
  view: LeakView,
  target: LeakTarget,
  lead: Vector3[],
  sensing: Vector3[],
) {
  if (view === "route") {
    const points = [...lead, ...sensing.slice(1)];
    const leadSegments = lead.length - 1;
    const leadLength = configuredPathLength(leakDetection.leadPoints);
    const position = pathPosition(
      points,
      typeof target === "number" ? target : 0,
      typeof target === "object" && "fromController" in target
        ? target.fromController
        : undefined,
    );
    const isLead = position.index < leadSegments;
    const fromJoint = isLead
      ? null
      : Math.max(0, position.station - leadLength);
    const number = position.index + 1 - (isLead ? 0 : leadSegments);
    const label = (isLead ? "引线第" : "感应线第") + number + "段";
    const route = { ...position, isLead, fromJoint, label };
    const path = [position.start, position.end];
    return {
      route,
      floor: null,
      points: path,
      paths: [path],
      markers: [
        {
          id: "leak-route-point",
          title: label + " · 距线首 " + position.station.toFixed(3) + " m",
          point: position.point,
          objectId:
            position.station === 0 ? leakDetection.controllerId : leakCable.id,
        },
      ],
    };
  }
  const floor = view === "floor" ? leakFloorSegment(sensing, target) : null;
  if (floor) {
    const markers = [
      {
        id: "leak-floor-segment",
        title: `感应段 ${floor.index + 1} · ${floor.stand ? "距底板" : "距柜"} ${floor.distance.toFixed(3)} m`,
        point: floor.point,
        objectId: leakCable.id,
      },
      {
        id: "leak-floor-cabinet",
        title: floor.stand?.name ?? nearbyCooling.name,
        point: floor.top,
        objectId: floor.stand?.id ?? nearbyCooling.id,
      },
    ];
    return {
      floor,
      route: null,
      paths: [[floor.start, floor.end]],
      points: [
        ...(floor.stand ? [floor.start, floor.end] : sensing),
        ...floor.corners,
      ],
      markers,
    };
  }
  const end = sensing.at(-1)!;
  const markers = [
    {
      id: "leak-origin",
      title: "① 引线起点",
      point: lead[0],
      objectId: leakDetection.controllerId,
    },
    {
      id: "leak-joint",
      title: "② 感应线接头",
      point: sensing[0],
      objectId: leakDetection.cableId,
    },
    {
      id: "leak-end",
      title: "③ 末端封接",
      point: end,
      objectId: leakDetection.cableId,
    },
  ].filter(
    (_, i) =>
      view === "all" ||
      (view === "lead" ? i < 2 : view === "end" ? i === 2 : i > 0),
  );
  const paths =
    view === "all"
      ? [lead, sensing]
      : view === "lead"
        ? [lead]
        : view === "sensing"
          ? [sensing]
          : [[end.clone().lerp(sensing.at(-2)!, 0.2), end]];
  return { route: null, floor: null, paths, points: paths.flat(), markers };
}

/** 只核对已登记折线。编号是布置端点身份，不表示信号流向或独立测点。 */
export function leakInspection(view: LeakView, target: LeakTarget = 0) {
  const lead = leakDetection.leadPoints.map(vector);
  const sensing = leakDetection.sensingPoints.map(vector);
  const fittingTarget =
    typeof target === "object" && "fitting" in target ? target : undefined;
  const fitting =
    view === "fitting"
      ? leakFitting(
          fittingTarget?.fitting ?? "controller",
          fittingTarget?.opened,
        )
      : null;
  const { route, floor, paths, points, markers, guides } = fitting
    ? { ...leakFittingObservation(fitting), route: null, floor: null }
    : { ...inspectionSection(view, target, lead, sensing), guides: [] };
  // 剖切沿长直段补点，不让中途桥架或灯具遮住被核对路径。
  const sightPoints = (floor ? [sensing] : paths).flatMap((path) =>
    path.flatMap((point, i) => {
      if (!i) return [point];
      const previous = path[i - 1];
      const steps = Math.max(1, Math.ceil(point.distanceTo(previous) / 0.3));
      return Array.from({ length: steps }, (_, j) =>
        previous.clone().lerp(point, (j + 1) / steps),
      );
    }),
  );
  return {
    view,
    paths,
    points,
    sightPoints,
    route,
    floor,
    fitting,
    guides,
    markers,
    leadLength: configuredPathLength(leakDetection.leadPoints),
    sensingLength: configuredPathLength(leakDetection.sensingPoints),
  };
}
export type LeakInspection = ReturnType<typeof leakInspection>;

export function leakViewFrame(
  inspection: LeakInspection,
  width: number,
  height: number,
  rect: FrameRect,
) {
  if (inspection.fitting) {
    const { direction, id } = inspection.fitting;
    return observationFrame(
      inspection.points,
      direction,
      width,
      height,
      rect,
      id === "controller" ? 0.34 : 0.29,
      0.02,
    );
  }
  // 整段从上方核对，避免邻近制冷柜遮住其后方地面感应线；封端从后侧近看。
  const direction = inspection.route
    ? inspection.route.isLead
      ? new Vector3(0.42, 0.5, 1.3)
      : new Vector3(0.05, 1, -0.04)
    : inspection.view === "floor"
      ? new Vector3(0, 1, -0.04)
      : inspection.view === "end"
        ? new Vector3(1, 2, -0.4)
        : inspection.view === "lead"
          ? new Vector3(1, 1.7, 0.8)
          : new Vector3(0.2, 8, -0.4);
  return observationFrame(
    inspection.points,
    direction,
    width,
    height,
    rect,
    inspection.route
      ? 1.15
      : inspection.view === "floor"
        ? inspection.floor?.stand
          ? 1.55
          : 3.5
        : inspection.view === "end"
          ? 1.1
          : inspection.view === "lead"
            ? 2.4
            : 7,
    0.16,
  );
}
