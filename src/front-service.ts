import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { modelForDevice } from "./catalog.ts";
import {
  deviceById,
  deviceHeight,
  devices,
  installedFrontZ,
  rackById,
} from "./installation.ts";
import type { MaintenanceArea } from "./maintenance.ts";

export function frontServiceDevices(area: MaintenanceArea) {
  return devices
    .filter((d) => area.kind === "front" && d.rackId === area.rackId)
    .sort((a, b) => a.startUnit - b.startUnit);
}

export type FrontServiceView = "reserve" | "chassis";

export function frontServiceInspection(
  area: MaintenanceArea,
  deviceId: string,
  extended: boolean,
  view: FrontServiceView = "reserve",
) {
  const device = deviceById(deviceId),
    rack = rackById(area.rackId);
  if (!rack || area.kind !== "front" || device?.rackId !== rack.id) return null;
  const model = modelForDevice(device.id);
  const travel =
    model.category === "switch" ? 0 : definition.rack.motion.trayTravel;
  const offset = extended ? travel : 0;
  const frontZ = rack.position[2] + installedFrontZ + offset;
  const rearZ = frontZ - model.depth;
  return {
    view,
    depth: model.depth,
    rearZ,
    tailInset: area.bounds.minZ - rearZ,
    area,
    device,
    travel,
    offset,
    frontZ,
    height: deviceHeight(device.id),
    remaining: area.bounds.maxZ - frontZ,
  };
}
export type FrontServiceInspection = NonNullable<
  ReturnType<typeof frontServiceInspection>
>;
