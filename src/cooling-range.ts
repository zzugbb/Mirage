import { coolingDeviceIds, coolingSource, coolingSummary } from "./cooling.ts";
import { devices, racks, deviceById } from "./installation.ts";
import {
  modelForDevice,
  partsForDevice,
  subpartsForDevice,
} from "./catalog.ts";
import type { SpatialReading } from "./spatial.ts";

export type CoolingRangeAction = "preview" | "airflow" | "enter";
export type CoolingRangeFilter = "all" | "unavailable" | "alarm";
export type CoolingRangeState = {
  query: string;
  filter: CoolingRangeFilter;
  rackId: string | null;
};
export const initialCoolingRange = (): CoolingRangeState => ({
  query: "",
  filter: "all",
  rackId: null,
});
export function coolingRangeRows(
  readings: Map<string, SpatialReading>,
  query = "",
  filter: CoolingRangeFilter = "all",
) {
  const linked = new Set(coolingDeviceIds(coolingSource.id));
  const search = query.trim().toLocaleLowerCase();
  return racks.flatMap((rack) => {
    const configured = devices
      .filter((d) => d.rackId === rack.id && linked.has(d.id))
      .sort((a, b) => b.startUnit - a.startUnit || a.id.localeCompare(b.id));
    if (!configured.length) return [];
    return [
      {
        rack,
        summary: coolingSummary(
          configured.map((d) => d.id),
          readings,
        ),
        matching: configured.filter((device) => {
          const reading = readings.get(device.id);
          const valid =
            reading?.quality === "valid" &&
            reading.temperature !== null &&
            Number.isFinite(reading.temperature);
          return (
            [
              rack.id,
              rack.name,
              device.id,
              device.name,
              modelForDevice(device.id).name,
            ]
              .join(" ")
              .toLocaleLowerCase()
              .includes(search) &&
            (filter === "all" ||
              (filter === "unavailable" ? !valid : (reading?.alarm ?? 0) > 0))
          );
        }),
      },
    ];
  });
}
/** 往返仅延续所查机柜及其已关联整机/部件，不吸纳其他柜或环境测点。 */
export function coolingRangeIncludes(
  rackId: string,
  selected: string,
  deviceId: string,
) {
  if (selected === coolingSource.id || selected === rackId) return true;
  const ids = coolingDeviceIds(rackId);
  if (deviceById(selected)) return ids.includes(selected);
  return (
    ids.includes(deviceId) &&
    [...partsForDevice(deviceId), ...subpartsForDevice(deviceId)].some(
      (part) => part.id === selected,
    )
  );
}
