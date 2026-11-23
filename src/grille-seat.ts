import { Vector3 } from "three";
import {
  floorGrilles,
  grilleRowById,
  floorGrilleSettings as s,
} from "./floor-grilles.ts";
import { grilleBranches } from "./grille-inspection.ts";

export function grilleSeatInspection(
  rowId: string,
  index: number,
  removed = false,
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
  const branches = grilleBranches(rowId);
  return {
    kind: "grille-seat" as const,
    id: tile.id,
    title: "格栅安装核对",
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
    points: [rim, middle, ...outline],
    markers: [
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
