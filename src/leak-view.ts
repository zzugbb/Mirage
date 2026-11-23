import { Vector3 } from "three";
import {
  configuredPathLength,
  isLeakFixture,
  leakDetection,
  nearbyCooling,
  leakCable,
} from "./leak-detection.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

export const leakViews = [
  { id: "all", label: "完整布置" },
  { id: "lead", label: "控制器与引线" },
  { id: "sensing", label: "感应线路径" },
  { id: "end", label: "末端封接" },
  { id: "floor", label: leakCable.location },
] as const;
export type LeakView = (typeof leakViews)[number]["id"];
export type LeakViewCommand = {
  revision: number;
  view: LeakView | null;
  segment?: number;
};
export const leakViewIncludes = (id: string) =>
  isLeakFixture(id) || id === leakDetection.nearbyFacilityId;
const vector = (point: number[]) => new Vector3().fromArray(point);

/** 在机房水平坐标系中，从感应段中点取柜体配置投影上的最近点。 */
function leakFloorSegment(sensing: Vector3[], segment: number) {
  const index =
    Number.isInteger(segment) && segment >= 0 && segment < sensing.length - 1
      ? segment
      : 0;
  const start = sensing[index],
    end = sensing[index + 1];
  const middle = start.clone().lerp(end, 0.5);
  const center = vector(nearbyCooling.position),
    half = vector(nearbyCooling.size).multiplyScalar(0.5);
  const min = center.clone().sub(half),
    max = center.clone().add(half);
  const edge = middle.clone().clamp(min, max);
  edge.y = middle.y;
  const sides = (["x", "z"] as const).flatMap((axis) => {
    const offset = middle[axis] - edge[axis];
    return offset ? [(offset > 0 ? "+" : "−") + axis.toUpperCase()] : [];
  });
  const footprint = [
    new Vector3(min.x, middle.y, min.z),
    new Vector3(max.x, middle.y, min.z),
    new Vector3(max.x, middle.y, max.z),
    new Vector3(min.x, middle.y, max.z),
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
    length: start.distanceTo(end),
    middle,
    edge,
    distance: middle.distanceTo(edge),
    side: sides.length ? sides.join(" / ") + " 侧" : "投影内",
    footprint,
    corners,
    top,
  };
}

function inspectionSection(
  view: LeakView,
  segment: number,
  lead: Vector3[],
  sensing: Vector3[],
) {
  const floor = view === "floor" ? leakFloorSegment(sensing, segment) : null;
  if (floor) {
    const markers = [
      {
        id: "leak-floor-segment",
        title: `感应段 ${floor.index + 1} · 距柜 ${floor.distance.toFixed(3)} m`,
        point: floor.middle,
        objectId: leakCable.id,
      },
      {
        id: "leak-floor-cabinet",
        title: nearbyCooling.name,
        point: floor.top,
        objectId: nearbyCooling.id,
      },
    ];
    return {
      floor,
      paths: [[floor.start, floor.end]],
      points: [...sensing, ...floor.corners],
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
  return { floor: null, paths, points: paths.flat(), markers };
}

/** 只核对已登记折线。编号是布置端点身份，不表示信号流向或独立测点。 */
export function leakInspection(view: LeakView, segment = 0) {
  const lead = leakDetection.leadPoints.map(vector);
  const sensing = leakDetection.sensingPoints.map(vector);
  const { floor, paths, points, markers } = inspectionSection(
    view,
    segment,
    lead,
    sensing,
  );
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
    floor,
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
  // 整段从上方核对，避免邻近制冷柜遮住其后方地面感应线；封端从后侧近看。
  const direction =
    inspection.view === "floor"
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
    inspection.view === "floor"
      ? 3.5
      : inspection.view === "end"
        ? 1.1
        : inspection.view === "lead"
          ? 2.4
          : 7,
    0.16,
  );
}
