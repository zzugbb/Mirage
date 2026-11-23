import { aisleDoorSweeps, doorTip, type DoorSweep } from "./door-sweep.ts";
import type { MaintenanceAisle } from "./maintenance.ts";
import { pduById } from "./power-config.ts";
import { pduOutlet } from "./pdu-outlets.ts";
import { pduOutletPosition, pduPosition } from "./power-paths.ts";

export function pduDoorLeaf(sweep: DoorSweep, pduId: string) {
  const [x] = pduPosition(pduId);
  const leaf = sweep.leaves.reduce((nearest, candidate) =>
    Math.abs(candidate.hingeX - x) < Math.abs(nearest.hingeX - x)
      ? candidate
      : nearest,
  );
  return { leaf, side: leaf.hingeX > sweep.area.position[0] ? "左扇" : "右扇" };
}

/** 按插座所在侧匹配铰轴，柜后观察时正 X 在左。差值均为布置坐标投影。 */
export function rearServiceInspection(
  aisle: MaintenanceAisle,
  pduId: string,
  outlet: number | null,
) {
  const pdu = pduById(pduId);
  const socket = pduOutlet(pduId, outlet);
  if (pdu?.rackId !== aisle.rear.rackId || !socket) return null;
  const sweep = aisleDoorSweeps(aisle)[1];
  const [x, , z] = pduOutletPosition(pduId, socket.outlet);
  const { leaf, side } = pduDoorLeaf(sweep, pduId);
  return {
    sweep,
    pdu,
    socket,
    leaf,
    side,
    tip: doorTip(leaf, sweep.open.angle),
    inset: z - leaf.hingeZ,
    lateral: Math.abs(x - leaf.hingeX),
  };
}
export type RearServiceInspection = NonNullable<
  ReturnType<typeof rearServiceInspection>
>;
