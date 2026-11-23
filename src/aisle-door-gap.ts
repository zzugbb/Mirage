import {
  doorTip,
  type DoorLeaf,
  type DoorReference,
  type DoorSweep,
} from "./door-sweep.ts";

export type AisleDoorPosition =
  DoorReference | "front-open" | "rear-open" | "closed";
export type RearLeafSide = "left" | "right";

export function aisleDoorPose(sweep: DoorSweep, position: AisleDoorPosition) {
  if (position === "front-open" || position === "rear-open")
    return position === sweep.area.kind + "-open" ? sweep.open : sweep.closed;
  return sweep[position];
}

type Point = { x: number; z: number };
function baseline(leaf: DoorLeaf, angle: number): [Point, Point] {
  return [{ x: leaf.hingeX, z: leaf.hingeZ }, doorTip(leaf, angle)];
}
const difference = (a: Point, b: Point) => ({ x: a.x - b.x, z: a.z - b.z });
const cross = (a: Point, b: Point) => a.x * b.z - a.z * b.x;
function project(p: Point, [a, b]: [Point, Point]) {
  const d = difference(b, a),
    v = difference(p, a);
  const length2 = d.x * d.x + d.z * d.z;
  const t = length2
    ? Math.min(1, Math.max(0, (v.x * d.x + v.z * d.z) / length2))
    : 0;
  return { x: a.x + t * d.x, z: a.z + t * d.z };
}

/** 门厚和五金尚未量取，只比较两条铰轴至自由边的有限线段。 */
export function doorBaselineGap(front: [Point, Point], rear: [Point, Point]) {
  const f = difference(front[1], front[0]),
    r = difference(rear[1], rear[0]);
  const between = difference(rear[0], front[0]);
  const determinant = cross(f, r);
  if (determinant !== 0) {
    const t = cross(between, r) / determinant,
      u = cross(between, f) / determinant;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const point = { x: front[0].x + t * f.x, z: front[0].z + t * f.z };
      return { from: point, to: point, distance: 0 };
    }
  }
  const candidates = [
    ...front.map((p) => ({ from: p, to: project(p, rear) })),
    ...rear.map((p) => ({ from: project(p, front), to: p })),
  ].map((pair) => ({
    ...pair,
    distance: Math.hypot(pair.from.x - pair.to.x, pair.from.z - pair.to.z),
  }));
  return candidates.reduce((best, pair) =>
    pair.distance < best.distance ? pair : best,
  );
}

export function opposedDoorGap(
  sweeps: DoorSweep[],
  position: AisleDoorPosition,
  side: RearLeafSide,
) {
  const front = sweeps.find((s) => s.area.kind === "front");
  const rear = sweeps.find((s) => s.area.kind === "rear");
  if (!front || !rear) return null;
  const leaf = rear.leaves.find((leaf) =>
    side === "left"
      ? leaf.hingeX > rear.area.position[0]
      : leaf.hingeX < rear.area.position[0],
  );
  if (!leaf) return null;
  const gap = doorBaselineGap(
    baseline(front.leaves[0], aisleDoorPose(front, position).angle),
    baseline(leaf, aisleDoorPose(rear, position).angle),
  );
  return { ...gap, rear, leaf, side, floor: front.area.position[1] };
}
export type OpposedDoorGap = NonNullable<ReturnType<typeof opposedDoorGap>>;
