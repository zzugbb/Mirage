import { Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { emergencyHeadInspection } from "./emergency-light.ts";

const [width, height, depth] = definition.room.size;
const floor = definition.rendering.floor.surfaceY;
const extents = [
  { axis: "x", min: -width / 2, max: width / 2, low: "west", high: "east" },
  { axis: "y", min: floor, max: height, low: "floor", high: "ceiling" },
  { axis: "z", min: -depth / 2, max: depth / 2, low: "back", high: "front" },
] as const;

const emergencyBoundaryLabels = {
  west: "西侧边界",
  east: "东侧边界",
  floor: "地坪基准",
  ceiling: "顶板基准",
  back: "后侧边界",
  front: "前侧边界",
} as const;

type BoundarySurface = keyof typeof emergencyBoundaryLabels;

/** 从机房配置范围内沿单位方向取首个边界平面。 */
function firstRoomBoundary(face: Vector3, direction: Vector3) {
  let nearest: {
    surface: BoundarySurface;
    distance: number;
    point: Vector3;
  } | null = null;
  for (const { axis, min, max, low, high } of extents) {
    const step = direction[axis];
    if (!step) continue;
    const plane = step < 0 ? min : max;
    const distance = (plane - face[axis]) / step;
    if (distance >= 0 && (!nearest || distance < nearest.distance)) {
      const point = face.clone().addScaledVector(direction, distance);
      point[axis] = plane;
      nearest = { surface: step < 0 ? low : high, distance, point };
    }
  }
  if (!nearest) return null;
  return {
    ...nearest,
    label: emergencyBoundaryLabels[nearest.surface],
  };
}

/** 沿模型灯面法线核对样板机房边界。 */
export function emergencyHeadBoundaryInspection() {
  const { heads } = emergencyHeadInspection();
  const boundary = heads.flatMap(({ side, face, direction }) => {
    const hit = firstRoomBoundary(face, direction);
    return hit ? [{ side, face, direction, ...hit }] : [];
  });
  const markers = boundary.map(({ side, point, label }) => ({
    id: side < 0 ? "entrance-axis-left" : "entrance-axis-right",
    title: (side < 0 ? "左轴 · " : "右轴 · ") + label,
    point,
  }));
  const axes = boundary.map(({ face, point }) => [face, point]);
  const projections = boundary.flatMap(({ point }) => {
    const step = 0.22;
    const count = Math.ceil((point.y - floor) / step);
    return Array.from({ length: count }, (_, index) => {
      const top = point.y - index * step;
      const bottom = index === count - 1 ? floor : top - 0.12;
      return [point.clone().setY(top), point.clone().setY(bottom)];
    });
  });
  const paths = [...axes, ...projections];
  return { boundary, paths, markers, points: paths.flat() };
}
