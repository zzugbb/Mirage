import { representativeAirflowDevice } from "./airflow.ts";
import { grilleRowById, nearestFloorGrille } from "./floor-grilles.ts";
import { rackById } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { coolingSource, coolingDeviceIds } from "./cooling.ts";

/** 与机房气流共用代表设备和最近格栅规则，不新增覆盖或风口身份。 */
export function grilleBranches(rowId: string) {
  const row = grilleRowById(rowId);
  if (!row) return [];
  return row.rackIds.flatMap((id) => {
    const rack = rackById(id);
    const device = representativeAirflowDevice(id);
    if (!rack || !device || !coolingDeviceIds(id).includes(device.id))
      return [];
    const grille = nearestFloorGrille(row.rowId, rack.position[0]);
    return grille ? [{ row, rack, device, grille }] : [];
  });
}
export type GrilleBranch = ReturnType<typeof grilleBranches>[number];
export type GrilleInspection = {
  rowId: string;
  rackId: string;
  deviceId: string;
};

/** 只延续本支路的两类设施、机柜、代表设备和它的部件；不扩大为整排监测覆盖。 */
export function grilleInspectionIncludes(
  visit: GrilleInspection,
  selected: string,
  deviceId: string,
) {
  if (
    [visit.rowId, visit.rackId, visit.deviceId, coolingSource.id].includes(
      selected,
    )
  )
    return true;
  return (
    deviceId === visit.deviceId &&
    [...partsForDevice(deviceId), ...subpartsForDevice(deviceId)].some(
      (part) => part.id === selected,
    )
  );
}
