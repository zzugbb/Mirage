import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { rackById, racks } from "./installation.ts";
import {
  floorGrilles,
  floorGrilleRows,
  floorGrilleSettings,
} from "./floor-grilles.ts";

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

/** 用完整面框与配置预留相交；只接触边线的格栅不计入。 */
export function maintenanceGrilles(area: MaintenanceArea) {
  const { width, depth } = floorGrilleSettings;
  const tolerance = 1e-8;
  return floorGrilles.flatMap((grille) => {
    const [x, , z] = grille.position;
    const minX = Math.max(area.bounds.minX, x - width / 2);
    const maxX = Math.min(area.bounds.maxX, x + width / 2);
    const minZ = Math.max(area.bounds.minZ, z - depth / 2);
    const maxZ = Math.min(area.bounds.maxZ, z + depth / 2);
    const overlapWidth = maxX - minX,
      overlapDepth = maxZ - minZ;
    if (overlapWidth <= tolerance || overlapDepth <= tolerance) return [];
    const row = floorGrilleRows.find((r) => r.rowId === grille.rowId)!;
    return [
      {
        grille,
        name: row.name + " " + grille.id.split("-").at(-1),
        minX,
        maxX,
        minZ,
        maxZ,
        overlapWidth,
        overlapDepth,
        contained:
          width - overlapWidth <= tolerance &&
          depth - overlapDepth <= tolerance,
      },
    ];
  });
}
export type MaintenanceGrille = ReturnType<typeof maintenanceGrilles>[number];

// 当前样板同向朝 +Z。只比较柜宽投影重合、双方各自只有一个对柜的跨排位置。
const alignedRacks = (rack: (typeof racks)[number]) =>
  racks.filter(
    (other) =>
      other.position[1] === rack.position[1] &&
      Math.abs(other.position[2] - rack.position[2]) >=
        definition.rack.size[2] &&
      Math.abs(other.position[0] - rack.position[0]) < definition.rack.size[0],
  );

const aisles = racks.flatMap((lower) => {
  const peers = alignedRacks(lower);
  const upper = peers[0];
  if (
    peers.length !== 1 ||
    upper.position[2] <= lower.position[2] ||
    alignedRacks(upper).length !== 1
  )
    return [];
  const [front] = maintenanceAreas(lower.id);
  const [, rear] = maintenanceAreas(upper.id);
  const startZ = front.bounds.maxZ,
    endZ = rear.bounds.minZ;
  return [
    {
      id: front.id + "/" + rear.id,
      front,
      rear,
      faceDistance: rear.bounds.maxZ - front.bounds.minZ,
      gap: endZ - startZ,
      startZ,
      endZ,
      x:
        (Math.max(front.bounds.minX, rear.bounds.minX) +
          Math.min(front.bounds.maxX, rear.bounds.maxX)) /
        2,
    },
  ];
});
export type MaintenanceAisle = (typeof aisles)[number];
export function findMaintenanceAisles(query: string) {
  const terms = query.normalize("NFKC").trim().toLowerCase().split(/\s+/);
  return aisles.filter(({ front, rear }) => {
    const names = [front, rear].map((area) => area.rackName.toLowerCase());
    return terms.every((term) => names.some((name) => name.includes(term)));
  });
}
export function maintenanceAisle(rackId: string) {
  return aisles.find(
    (a) => a.front.rackId === rackId || a.rear.rackId === rackId,
  );
}
// 只沿同一段双排布置按 X 排序，避免把不同纵向通道拼成一排。
export function maintenanceAisleSequence(rackId: string) {
  const current = maintenanceAisle(rackId);
  if (!current) return null;
  const side = current.front.rackId === rackId ? "front" : "rear";
  const row = aisles
    .filter(
      (a) =>
        a.front.bounds.minZ === current.front.bounds.minZ &&
        a.rear.bounds.maxZ === current.rear.bounds.maxZ &&
        a.front.position[1] === current.front.position[1],
    )
    .sort((a, b) => a.x - b.x);
  const index = row.indexOf(current);
  return {
    index,
    count: row.length,
    previous: row[index - 1]?.[side].rackId,
    next: row[index + 1]?.[side].rackId,
  };
}

export function reserveGapText(gap: number) {
  if (Math.abs(gap) < 1e-8) return "预留边界相接";
  const magnitude = Math.abs(gap);
  return `${gap > 0 ? "预留间隔" : "预留重叠"} ${magnitude < 0.01 ? "< 0.01" : magnitude.toFixed(2)} m`;
}
