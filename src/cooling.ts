import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { devices, deviceById, racks } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import type { SpatialReading } from "./spatial.ts";

/** 配置服务关系不代表独占制冷覆盖，也不把设备温度当成制冷单元测点。 */
export const coolingRelations = definition.installation.relations.filter(
  (relation) => relation.kind === "cooling",
);
export const coolingSource = definition.facilities.find((facility) =>
  coolingRelations.some((relation) => relation.source === facility.id),
)!;
export const isCoolingSource = (id: string) => id === coolingSource.id;
export function coolingDeviceIds(id: string, deviceId = "srv-01") {
  const linked = new Set(
    coolingRelations
      .filter((relation) => relation.source === coolingSource.id)
      .map((relation) => relation.target),
  );
  if (isCoolingSource(id) || id === "room-01") return [...linked];
  if (racks.some((rack) => rack.id === id))
    return devices
      .filter((d) => d.rackId === id && linked.has(d.id))
      .map((d) => d.id);
  if (deviceById(id)) return linked.has(id) ? [id] : [];
  if (
    [...partsForDevice(deviceId), ...subpartsForDevice(deviceId)].some(
      (part) => part.id === id,
    )
  )
    return linked.has(deviceId) ? [deviceId] : [];
  return [];
}
export function coolingSummary(
  ids: string[],
  readings: Map<string, SpatialReading>,
) {
  const unique = [...new Set(ids)];
  const valid = unique
    .flatMap((id) => {
      const reading = readings.get(id);
      return reading?.quality === "valid" &&
        reading.temperature !== null &&
        Number.isFinite(reading.temperature)
        ? [reading]
        : [];
    })
    .sort(
      (a, b) => b.temperature! - a.temperature! || a.id.localeCompare(b.id),
    );
  const quality = { valid: 0, missing: 0, stale: 0, offline: 0 };
  const lifecycle = { running: 0, maintenance: 0, offline: 0, stopped: 0 };
  for (const id of unique) {
    const reading = readings.get(id);
    quality[reading?.quality ?? "missing"]++;
    if (reading) lifecycle[reading.lifecycle]++;
  }
  return {
    count: unique.length,
    coverage: valid.length,
    maximum: valid[0]?.temperature ?? null,
    hottestId: valid[0]?.id ?? null,
    alarmIds: unique.filter((id) => (readings.get(id)?.alarm ?? 0) > 0),
    quality,
    lifecycle,
  };
}
