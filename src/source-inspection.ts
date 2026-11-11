import { readingSources, type SourceCheck } from "./reading-sources.ts";
import { deviceById, rackForDevice } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { coolingSource } from "./cooling.ts";
import { grilleRowForRack } from "./floor-grilles.ts";
import { powerLinks, powerSettings } from "./power-config.ts";
import type { SpatialReading } from "./spatial.ts";

/** 固定进入时的名单口径和整机身份；无效输入保留原因，不能替换为旧值或零。 */
export function beginSourceInspection(
  check: SourceCheck,
  deviceId: string,
  time: number,
  readings: Map<string, SpatialReading>,
) {
  const sources = readingSources(check.sourceId, check.metric, readings);
  const row = sources?.rows.find((row) => row.id === deviceId);
  if (!row || row.included !== (check.group === "included")) return null;
  return {
    check: { ...check },
    deviceId,
    time,
    row: { ...row },
    coverage: sources!.coverage,
    count: sources!.count,
  };
}
export type SourceInspection = NonNullable<
  ReturnType<typeof beginSourceInspection>
>;
export function sourceInspectionRow(
  inspection: SourceInspection,
  readings: Map<string, SpatialReading>,
) {
  return readingSources(
    inspection.check.sourceId,
    inspection.check.metric,
    readings,
  )!.rows.find((row) => row.id === inspection.deviceId)!;
}
/** 只沿当前整机、部件与对应指标的既有关系继续核对。 */
export function sourceInspectionIncludes(
  inspection: SourceInspection,
  selected: string,
  activeDeviceId: string,
) {
  const rack = rackForDevice(inspection.deviceId);
  if ([inspection.deviceId, rack.id].includes(selected)) return true;
  if (inspection.check.metric === "temperature") {
    if ([coolingSource.id, grilleRowForRack(rack.id)?.id].includes(selected))
      return true;
  } else if (
    selected === powerSettings.sourceId ||
    powerLinks.some(
      (link) =>
        link.deviceId === inspection.deviceId && link.pduId === selected,
    )
  )
    return true;
  return (
    activeDeviceId === inspection.deviceId &&
    !!deviceById(activeDeviceId) &&
    [
      ...partsForDevice(activeDeviceId),
      ...subpartsForDevice(activeDeviceId),
    ].some((part) => part.id === selected)
  );
}
