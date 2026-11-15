import { deviceById } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { grilleRowForRack } from "./floor-grilles.ts";
import { coolingDeviceIds, coolingSource } from "./cooling.ts";

/** 进风查找只追踪所选整机已有的气流关联，不扩展为设施供风覆盖。 */
export function inletAirflowIncludes(
  originId: string,
  selected: string,
  activeDeviceId: string,
) {
  const device = deviceById(originId);
  if (!device || !coolingDeviceIds(coolingSource.id).includes(originId))
    return false;
  if (
    [
      originId,
      device.rackId,
      coolingSource.id,
      grilleRowForRack(device.rackId)?.id,
    ].includes(selected)
  )
    return true;
  return (
    activeDeviceId === originId &&
    [...partsForDevice(originId), ...subpartsForDevice(originId)].some(
      (part) => part.id === selected,
    )
  );
}
