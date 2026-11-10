import { Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { maintenanceAreas, maintenanceAisle } from "./maintenance.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

export const maintenanceViews = [
  { id: "front", name: "柜前范围" },
  { id: "rear", name: "柜后范围" },
  { id: "aisle", name: "排间范围" },
] as const;
export type MaintenanceView = (typeof maintenanceViews)[number]["id"];

/** 只观察现有配置预留；不从镜头或地面空白推导工程净距。 */
export function maintenanceInspection(rackId: string, view: MaintenanceView) {
  const configured = maintenanceAreas(rackId);
  if (!configured.length) return null;
  const aisle = view === "aisle" ? maintenanceAisle(rackId) : undefined;
  if (view === "aisle" && !aisle) return null;
  const areas = aisle
    ? [aisle.front, aisle.rear]
    : configured.filter((area) => area.kind === view);
  const points = areas.flatMap((area) => {
    const { minX, maxX, minZ, maxZ } = area.bounds;
    const y = area.position[1];
    const face = area.kind === "front" ? minZ : maxZ;
    return [
      new Vector3(minX, y, minZ),
      new Vector3(maxX, y, minZ),
      new Vector3(minX, y, maxZ),
      new Vector3(maxX, y, maxZ),
      new Vector3(area.position[0], y, (minZ + maxZ) / 2),
      new Vector3(minX, definition.rack.size[1], face),
      new Vector3(maxX, definition.rack.size[1], face),
    ];
  });
  return { rackId, view, areas, aisle, points };
}
export type MaintenanceInspection = NonNullable<
  ReturnType<typeof maintenanceInspection>
>;
export function maintenanceViewIncludes(
  inspection: MaintenanceInspection,
  selected: string,
) {
  return inspection.areas.some((area) => area.rackId === selected);
}
export function maintenanceViewFrame(
  inspection: MaintenanceInspection,
  width: number,
  height: number,
  rect: FrameRect,
) {
  return observationFrame(
    inspection.points,
    inspection.view === "aisle"
      ? new Vector3(0, 1, 0.025)
      : new Vector3(0.12, 1, inspection.view === "front" ? 0.32 : -0.32),
    width,
    height,
    rect,
    3,
    0.15,
  );
}
