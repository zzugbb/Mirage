import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import type { MaintenanceAisle } from "./maintenance.ts";

export type DoorReference = "peak" | "open";
export type DoorLeaf = {
  hingeX: number;
  hingeZ: number;
  reach: number;
  closedDirection: number;
  outward: number;
};
export function doorTip(leaf: DoorLeaf, degrees: number) {
  const a = (degrees * Math.PI) / 180;
  return {
    x: leaf.hingeX + leaf.closedDirection * leaf.reach * Math.cos(a),
    z: leaf.hingeZ + leaf.outward * leaf.reach * Math.sin(a),
  };
}

/** 柜面到门扇基准线自由端的纵向投影。忽略厚度、五金及人员空间。 */
export function aisleDoorSweeps(aisle: MaintenanceAisle) {
  const { frontDoor, rearDoor } = definition.rack.enclosure;
  const motion = definition.rack.motion;
  return [aisle.front, aisle.rear].map((area) => {
    const front = area.kind === "front";
    const outward = front ? 1 : -1;
    const faceZ = front ? area.bounds.minZ : area.bounds.maxZ;
    const x = area.position[0];
    const hingeZ =
      faceZ +
      (front
        ? frontDoor.hingeZ - definition.rack.size[2] / 2
        : rearDoor.offsetZ);
    const leaves: DoorLeaf[] = front
      ? [
          {
            hingeX: x + frontDoor.hingeX,
            hingeZ,
            reach: frontDoor.width,
            closedDirection: 1,
            outward,
          },
        ]
      : [-1, 1].map((side) => ({
          hingeX: x + (side * rearDoor.width) / 2,
          hingeZ,
          reach: (rearDoor.width - rearDoor.seam) / 2,
          closedDirection: -side,
          outward,
        }));
    const open = front ? motion.doorAngleDegrees : motion.rearDoorAngleDegrees;
    const reference = (angle: number) => {
      const depth = outward * (doorTip(leaves[0], angle).z - faceZ);
      return { angle, depth, remaining: area.depth - depth };
    };
    return {
      area,
      leaves,
      peak: reference(Math.min(open, 90)),
      open: reference(open),
    };
  });
}
export type DoorSweep = ReturnType<typeof aisleDoorSweeps>[number];
