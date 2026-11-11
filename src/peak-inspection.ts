import { maximumSources, peakScopeIds } from "./peak-provenance.ts";
import { deviceById, rackForDevice } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { coolingSource } from "./cooling.ts";
import { grilleRowForRack } from "./floor-grilles.ts";
import type { SpatialReading } from "./spatial.ts";

/** 固定用户开始检视的来源身份与当秒依据，之后不追随最高值自动换设备。 */
export function beginPeakInspection(
  scopeId: string,
  deviceId: string,
  time: number,
  readings: Map<string, SpatialReading>,
) {
  const ids = peakScopeIds(scopeId);
  if (!ids || !deviceById(deviceId)) return null;
  const sources = maximumSources(ids, readings);
  if (!sources.includes(deviceId)) return null;
  return {
    scopeId,
    deviceId,
    time,
    temperature: readings.get(deviceId)!.temperature!,
    sources,
    count: ids.length,
    coverage: ids.filter((id) => {
      const reading = readings.get(id);
      return (
        reading?.quality === "valid" &&
        reading.temperature !== null &&
        Number.isFinite(reading.temperature)
      );
    }).length,
  };
}
export type PeakInspection = NonNullable<
  ReturnType<typeof beginPeakInspection>
>;

/** 只沿本来源的机柜、整机、部件和既有气流设施核对，不扩成全范围设备选择。 */
export function peakInspectionIncludes(
  inspection: PeakInspection,
  selected: string,
  activeDeviceId: string,
) {
  const rack = rackForDevice(inspection.deviceId);
  if (
    [
      inspection.deviceId,
      rack.id,
      coolingSource.id,
      grilleRowForRack(rack.id)?.id,
    ].includes(selected)
  )
    return true;
  return (
    activeDeviceId === inspection.deviceId &&
    [
      ...partsForDevice(activeDeviceId),
      ...subpartsForDevice(activeDeviceId),
    ].some((part) => part.id === selected)
  );
}

export function peakInspectionStatus(
  inspection: PeakInspection,
  readings: Map<string, SpatialReading>,
) {
  const reading = readings.get(inspection.deviceId);
  if (
    !reading ||
    reading.quality !== "valid" ||
    reading.temperature === null ||
    !Number.isFinite(reading.temperature)
  )
    return "当前无有效进风，不参与最高值";
  return maximumSources(peakScopeIds(inspection.scopeId)!, readings).includes(
    inspection.deviceId,
  )
    ? "当前仍为该范围最高来源之一"
    : "当前最高来源已切换，继续检视原设备";
}
