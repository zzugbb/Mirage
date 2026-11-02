import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { rackById } from "./installation.ts";

export const maintenanceSettings = definition.room.maintenance;
export type MaintenanceArea = {
  id: string;
  rackId: string;
  rackName: string;
  kind: "front" | "rear";
  title: string;
  depth: number;
  width: number;
  position: [number, number, number];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
};

/** 仅表示配置预留范围。当前机柜正面朝 +Z；不把空地推断为可通行净距。 */
export function maintenanceAreas(rackId: string): MaintenanceArea[] {
  const rack = rackById(rackId);
  if (!rack) return [];
  const width = definition.rack.size[0] + maintenanceSettings.sidePadding * 2;
  return (["front", "rear"] as const).map((kind) => {
    const depth =
      kind === "front"
        ? maintenanceSettings.frontDepth
        : maintenanceSettings.rearDepth;
    const z =
      rack.position[2] +
      (kind === "front" ? 1 : -1) * (definition.rack.size[2] / 2 + depth / 2);
    return {
      id: `${rack.id}-maintenance-${kind}`,
      rackId: rack.id,
      rackName: rack.name,
      kind,
      title: kind === "front" ? "柜前操作范围" : "柜后检修范围",
      depth,
      width,
      position: [
        rack.position[0],
        rack.position[1] + maintenanceSettings.floorY,
        z,
      ],
      bounds: {
        minX: rack.position[0] - width / 2,
        maxX: rack.position[0] + width / 2,
        minZ: z - depth / 2,
        maxZ: z + depth / 2,
      },
    };
  });
}
