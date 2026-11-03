import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

export const floorGrilleSettings = definition.airflow.floorGrille;
export const floorSurfaceY = definition.rendering.floor.surfaceY;
const grid = definition.airflow.floorGrid;
/** 编号用于几何与代表路径的对应，不增加独立测点或可分配资源。 */
export const floorGrilles = definition.airflow.floorOutlets.flatMap((row) =>
  Array.from({ length: grid.count }, (_, index) => ({
    id: `grille-${row.rowId}-${String(index + 1).padStart(2, "0")}`,
    rowId: row.rowId,
    position: [grid.startX + index * grid.step, floorSurfaceY, row.z] as [
      number,
      number,
      number,
    ],
  })),
);
export type FloorGrille = (typeof floorGrilles)[number];
export function nearestFloorGrille(rowId: string, x: number) {
  if (!Number.isFinite(x)) return undefined;
  // 沿用原落点的网格取整：中点取较大索引，避免浮点距离比较改变支路。
  const index = Math.max(
    0,
    Math.min(grid.count - 1, Math.round((x - grid.startX) / grid.step)),
  );
  return floorGrilles.filter((grille) => grille.rowId === rowId)[index];
}
