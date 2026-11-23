import { maintenanceDoorSweep, type DoorReference } from "./door-sweep.ts";
import { frontGrilleSweep } from "./grille-door-sweep.ts";
import { maintenanceAreas, maintenanceGrilles } from "./maintenance.ts";
import { Vector3 } from "three";
import {
  floorGrilles,
  grilleRowById,
  type FloorGrilleRow,
  floorGrilleSettings as s,
} from "./floor-grilles.ts";
import { grilleBranches } from "./grille-inspection.ts";

function rowFrontLayout(row: FloorGrilleRow) {
  const cabinets = row.rackIds.flatMap((id) => {
    const [area] = maintenanceAreas(id);
    return area
      ? [
          {
            area,
            door: maintenanceDoorSweep(area),
            overlaps: maintenanceGrilles(area),
          },
        ]
      : [];
  });
  return floorGrilles
    .filter((tile) => tile.rowId === row.rowId)
    .map((tile) =>
      cabinets.flatMap(({ area, door, overlaps }) => {
        const overlap = overlaps.find((o) => o.grille.id === tile.id);
        const open = frontGrilleSweep(door, tile, "open");
        if (!overlap && !open.area) return [];
        return [
          {
            area,
            door,
            overlap,
            open,
            peak: frontGrilleSweep(door, tile, "peak"),
          },
        ];
      }),
    );
}
// 铺设和门扇均为静态配置；首次核对该排时才计算两种参考角。
const frontLayouts = new Map<string, ReturnType<typeof rowFrontLayout>>();
function frontLayout(row: FloorGrilleRow) {
  let layout = frontLayouts.get(row.id);
  if (!layout) {
    layout = rowFrontLayout(row);
    frontLayouts.set(row.id, layout);
  }
  return layout;
}

export function grilleSeatInspection(
  rowId: string,
  index: number,
  removed = false,
  reference?: DoorReference,
  rackId?: string,
) {
  const row = grilleRowById(rowId);
  if (!row) return null;
  const tiles = floorGrilles.filter((g) => g.rowId === row.rowId);
  const tile = tiles[index];
  if (!tile) return null;
  const [x, y, z] = tile.position;
  const surface = removed ? y - s.frameHeight : y;
  const rim = new Vector3(
    x - s.width / 2 + (removed ? s.seatWidth : s.frameWidth) / 2,
    surface,
    z,
  );
  const middle = new Vector3(
    x,
    removed ? y - s.recessDepth + s.backingThickness : y,
    z,
  );
  const outline = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(
    ([dx, dz]) =>
      new Vector3(x + (dx * s.width) / 2, y + 0.003, z + (dz * s.depth) / 2),
  );
  const layout = reference ? frontLayout(row) : undefined;
  const fronts = layout?.[index] ?? [];
  const target = fronts.find((f) => f.area.rackId === rackId) ?? fronts[0];
  const front =
    reference && target ? { ...target, sweep: target[reference] } : undefined;
  const branches = grilleBranches(rowId);
  const corners = front
    ? [front.area.bounds.minX, front.area.bounds.maxX].flatMap((px) =>
        [front.area.bounds.minZ, front.area.bounds.maxZ].map(
          (pz) => new Vector3(px, front.sweep.y, pz),
        ),
      )
    : [];
  return {
    kind: "grille-seat" as const,
    id: tile.id,
    title: reference ? "格栅与柜前预留" : "格栅安装核对",
    layout,
    fronts,
    front,
    reference,
    row,
    index,
    removed,
    tiles,
    branches,
    branch: branches.find((b) => b.grille.id === tile.id),
    instance: floorGrilles.indexOf(tile),
    upper: { id: rowId, name: row.name },
    lower: { id: rowId, name: row.name },
    outline,
    points: [rim, middle, ...outline, ...corners],
    markers: front
      ? [
          {
            id: "grille-seat-tile",
            title: tile.id.split("-").at(-1) + " 号格栅",
            point: new Vector3(x, y, z),
          },
          {
            id: "grille-seat-reserve",
            title: front.area.rackName.split(" ")[0] + " 柜前预留",
            point: new Vector3(
              front.area.position[0],
              front.sweep.y,
              front.area.bounds.maxZ,
            ),
          },
        ]
      : [
          {
            id: "grille-seat-rim",
            title: removed ? "固定承托边" : "面框",
            point: rim,
          },
          {
            id: "grille-seat-middle",
            title: removed ? "浅凹背衬" : "横条",
            point: middle,
          },
        ],
  };
}
export type GrilleSeat = NonNullable<ReturnType<typeof grilleSeatInspection>>;
