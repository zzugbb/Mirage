import { racks } from "./installation.ts";
import { rackInstallation } from "./rack-installation.ts";
import { readingSources } from "./reading-sources.ts";
import type { SpatialReading } from "./spatial.ts";

export type InletOverviewScope = "rack" | "room";
export type InletOverviewOrder = "installation" | "temperature";
export type InletOverviewFilter = "all" | "included" | "excluded";

/** 整柜进风对照不受切片限制；沿用汇总输入的有效性与数据边界。 */
export function inletOverview(
  readings: Map<string, SpatialReading>,
  query = "",
  filter: InletOverviewFilter = "all",
) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return racks.map((rack) => {
    const installation = rackInstallation(rack.id)!;
    const sources = readingSources(rack.id, "temperature", readings)!;
    const rows = installation.segments
      .filter((segment) => segment.kind === "device")
      .map((segment) => ({
        ...sources.rows.find((row) => row.id === segment.id)!,
        first: segment.first,
        last: segment.last,
      }));
    return {
      rack,
      units: installation.units,
      rows,
      coverage: sources.coverage,
      maximum: sources.value,
      matching: rows.filter(
        (row) =>
          (filter === "all" || row.included === (filter === "included")) &&
          terms.every((term) =>
            `${row.id} ${row.name} ${row.location} ${row.reason}`
              .toLowerCase()
              .includes(term),
          ),
      ),
    };
  });
}

/** 排序只改变名单；无效值置后，并列保留柜序与安装顺序。 */
export function inletOverviewRows(
  all: ReturnType<typeof inletOverview>,
  rackId: string,
  scope: InletOverviewScope,
  order: InletOverviewOrder,
) {
  const rows = all
    .filter((item) => scope === "room" || item.rack.id === rackId)
    .flatMap((item) => item.matching);
  if (order === "installation") return rows;
  return rows.sort((a, b) => {
    if (a.value === null) return b.value === null ? 0 : 1;
    if (b.value === null) return -1;
    return b.value - a.value;
  });
}
