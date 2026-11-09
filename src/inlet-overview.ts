import { racks } from "./installation.ts";
import { rackInstallation } from "./rack-installation.ts";
import { readingSources } from "./reading-sources.ts";
import type { SpatialReading } from "./spatial.ts";

/** 整柜进风对照不受切片限制；沿用汇总输入的有效性与数据边界。 */
export function inletOverview(
  readings: Map<string, SpatialReading>,
  query = "",
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
      matching: rows.filter((row) =>
        terms.every((term) =>
          `${row.name} ${row.location} ${row.reason}`
            .toLowerCase()
            .includes(term),
        ),
      ),
    };
  });
}
