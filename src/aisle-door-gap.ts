import {
  planarSegmentGap as doorBaselineGap,
  type Point,
} from "./planar-gap.ts";
export { doorBaselineGap };
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

function baseline(leaf: DoorLeaf, angle: number): [Point, Point] {
  return [{ x: leaf.hingeX, z: leaf.hingeZ }, doorTip(leaf, angle)];
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
