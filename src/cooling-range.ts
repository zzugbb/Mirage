import { coolingDeviceIds, coolingSource, coolingSummary } from "./cooling.ts";
import { devices, racks, deviceById } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { layoutDeviceMatches } from "./room-layout.ts";
import { rackUnitQuery } from "./review-resources.ts";
import { grilleRowForRack, nearestFloorGrille } from "./floor-grilles.ts";
import type { SpatialReading } from "./spatial.ts";

export type CoolingRangeAction =
  "preview" | "airflow" | "enter" | "installation";
export type CoolingRangePosition = {
  list: number;
  panel: number;
  focusKey?: string;
};
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
  const units = rackUnitQuery({ level: "room" }, query);
  return racks.flatMap((rack) => {
    const configured = devices
      .filter((d) => d.rackId === rack.id && linked.has(d.id))
      .sort((a, b) => b.startUnit - a.startUnit || a.id.localeCompare(b.id));
    if (!configured.length) return [];
    const matchIds = query.trim()
      ? new Set(
          layoutDeviceMatches(rack.id, query, units).map((device) => device.id),
        )
      : null;
    const row = grilleRowForRack(rack.id);
    const grille = row && nearestFloorGrille(row.rowId, rack.position[0]);
    return [
      {
        rack,
        grille,
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
            (!matchIds || matchIds.has(device.id)) &&
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
