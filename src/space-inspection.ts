import { inspectRackSpace, type RackUnitRange } from "./rack-space.ts";
import { deviceById } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";

/** 只接受与原范围实际相交的已安装整机；保留完整设备跨度与相交跨度。 */
export function beginSpaceInspection(range: RackUnitRange, deviceId: string) {
  const result = inspectRackSpace(range);
  const device = result?.conflicts.find((item) => item.id === deviceId);
  if (!result || !device) return null;
  const first = Math.max(range.first, device.first),
    last = Math.min(range.last, device.last);
  return {
    range: { ...range },
    deviceId,
    device: { ...device },
    overlap: { first, last, units: last - first + 1 },
    occupied: result.occupied,
    blanked: result.blanked,
  };
}
export type SpaceInspection = NonNullable<
  ReturnType<typeof beginSpaceInspection>
>;
export function spaceInspectionIncludes(
  visit: SpaceInspection,
  selected: string,
  activeDeviceId: string,
) {
  if ([visit.range.rackId, visit.deviceId].includes(selected)) return true;
  return (
    activeDeviceId === visit.deviceId &&
    !!deviceById(activeDeviceId) &&
    [
      ...partsForDevice(activeDeviceId),
      ...subpartsForDevice(activeDeviceId),
    ].some((part) => part.id === selected)
  );
}
export const spaceRangeLabel = (range: { first: number; last: number }) =>
  range.first === range.last
    ? `U${range.first}`
    : `U${range.first}–${range.last}`;
