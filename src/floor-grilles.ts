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

/** 沿用铺设网格登记两排布置对象；不是独立风口测点或已校核的服务范围。 */
export const floorGrilleRows = definition.airflow.floorOutlets.map((outlet) => {
  const row = definition.temperatureSlice.vertical.rows.find(
    (r) => r.id === outlet.rowId,
  )!;
  return {
    id: `grilles-${outlet.rowId}`,
    kind: "floor-grille-row" as const,
    name: `${row.name}送风格栅`,
    location: `${row.name}机柜前方地面`,
    rowId: row.id,
    rackIds: row.rackIds,
    mountId: "room-01",
    dataStatus: "not-applicable" as const,
    position: [
      grid.startX + ((grid.count - 1) * grid.step) / 2,
      floorSurfaceY,
      outlet.z,
    ],
    focus: { direction: [0.2, 1.1, 1], distance: 2 },
    count: grid.count,
    span: (grid.count - 1) * grid.step + floorGrilleSettings.width,
  };
});
export type FloorGrilleRow = (typeof floorGrilleRows)[number];
export const grilleRowById = (id: string) =>
  floorGrilleRows.find((row) => row.id === id);
export const grilleRowForRack = (id: string) =>
  floorGrilleRows.find((row) => row.rackIds.includes(id));
export function grilleRowRelations(id: string) {
  const row = grilleRowById(id);
  return (row?.rackIds ?? []).map((id) => {
    const rack = definition.installation.racks.find((r) => r.id === id)!;
    const grille = nearestFloorGrille(row!.rowId, rack.position[0])!;
    return {
      id,
      name: rack.name,
      relation: `柜前布置 · 代表落点 ${grille.id}`,
    };
  });
}
export function rackGrilleRelations(id: string) {
  const row = grilleRowForRack(id);
  if (!row) return [];
  const rack = definition.installation.racks.find((r) => r.id === id)!;
  const grille = nearestFloorGrille(row.rowId, rack.position[0])!;
  return [
    {
      id: row.id,
      name: row.name,
      relation: `气流示意采用最近格栅 ${grille.id} · 非独占覆盖`,
    },
  ];
}
export function grilleRowSightOffsets(row: FloorGrilleRow) {
  return floorGrilles
    .filter((g) => g.rowId === row.rowId)
    .map((g) => g.position.map((v, axis) => v - row.position[axis]));
}
