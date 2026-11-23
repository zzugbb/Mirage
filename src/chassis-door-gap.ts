import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { doorBaselineGap, type RearLeafSide } from "./aisle-door-gap.ts";
import {
  doorTip,
  maintenanceDoorSweep,
  type DoorReference,
} from "./door-sweep.ts";
import { maintenanceAisle } from "./maintenance.ts";
import type { FrontServiceInspection } from "./front-service.ts";
import { pdus } from "./power-config.ts";
import { pduDoorLeaf } from "./rear-service.ts";

export type RearDoorPosition = DoorReference | "closed";

/** 从柜后方向辨认左右门扇，机箱取安装外廓的前边线，距离在水平面量取。 */
export function chassisDoorGap(
  service: FrontServiceInspection,
  position: RearDoorPosition,
  side: RearLeafSide,
) {
  const aisle = maintenanceAisle(service.area.rackId);
  if (!aisle || aisle.front.rackId !== service.area.rackId) return null;
  const rear = maintenanceDoorSweep(aisle.rear);
  const angle = rear[position].angle;
  const leaves = rear.leaves.map((leaf) => ({
    leaf,
    hinge: { x: leaf.hingeX, z: leaf.hingeZ },
    tip: doorTip(leaf, angle),
    side: leaf.hingeX > aisle.rear.position[0] ? "left" : "right",
  }));
  const selected = leaves.find((l) => l.side === side)!;
  const [cx] = service.area.position;
  const half = definition.server.size[0] / 2;
  const left = { x: cx - half, z: service.frontZ },
    right = { x: cx + half, z: service.frontZ };
  const gap = doorBaselineGap([left, right], [selected.hinge, selected.tip]);
  const pdu = pdus.find(
    (p) =>
      p.rackId === rear.area.rackId &&
      pduDoorLeaf(rear, p.id).leaf === selected.leaf,
  );
  return { aisle, left, right, leaves, selected, angle, pdu, gap };
}
