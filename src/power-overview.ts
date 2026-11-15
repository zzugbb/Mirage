import { racks, devices, deviceById, rackById } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { readingSources } from "./reading-sources.ts";
import { powerDeviceIds } from "./power-config.ts";
import { budgetRatio } from "./power-budget.ts";
import type { SpatialReading } from "./spatial.ts";
export type PowerOverviewFilter = "all" | "included" | "excluded" | "zero";
/** 柜卡和三维共用有效整机输入与对应预算，查找只影响名单。 */
export function powerOverview(
  readings: Map<string, SpatialReading>,
  query = "",
  filter: PowerOverviewFilter = "all",
) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return racks.map((rack) => {
    const sources = readingSources(rack.id, "power", readings)!;
    const rows = [...sources.rows].sort(
      (a, b) => deviceById(b.id)!.startUnit - deviceById(a.id)!.startUnit,
    );
    return {
      rack,
      ...sources,
      matching: rows.filter(
        (row) =>
          (filter === "all" ||
            (filter === "included" && row.included) ||
            (filter === "excluded" && !row.included) ||
            (filter === "zero" && row.included && row.value === 0)) &&
          terms.every((term) =>
            `${row.id} ${row.name} ${row.location} ${row.reason}`
              .toLowerCase()
              .includes(term),
          ),
      ),
      rows,
    };
  });
}
export function powerOverviewIncludes(
  origin: string,
  selected: string,
  activeDeviceId: string,
) {
  const ids = rackById(origin)
    ? devices
        .filter((device) => device.rackId === origin)
        .map((device) => device.id)
    : deviceById(origin)
      ? [origin]
      : [];
  if (selected === origin || ids.includes(selected)) return true;
  if (powerDeviceIds(selected).some((id) => ids.includes(id))) return true;
  return (
    ids.includes(activeDeviceId) &&
    [
      ...partsForDevice(activeDeviceId),
      ...subpartsForDevice(activeDeviceId),
    ].some((part) => part.id === selected)
  );
}

export type PowerOverviewOrder = "installation" | "power" | "budget";
export type PowerOverviewScope = "rack" | "room";
/** 无效值排在有效零值之后；并列沿用柜序和 U 位，不创造质量排名。 */
export function powerOverviewRows(
  all: ReturnType<typeof powerOverview>,
  rackId: string,
  scope: PowerOverviewScope,
  order: PowerOverviewOrder,
) {
  const rows = all
    .filter((item) => scope === "room" || item.rack.id === rackId)
    .flatMap((item) => item.matching);
  if (order === "installation") return rows;
  const value = (row: (typeof rows)[number]) =>
    order === "power" ? row.value : budgetRatio(row.value, row.budget);
  return rows.sort((a, b) => {
    const av = value(a),
      bv = value(b);
    if (av === null) return bv === null ? 0 : 1;
    if (bv === null) return -1;
    return bv - av;
  });
}
