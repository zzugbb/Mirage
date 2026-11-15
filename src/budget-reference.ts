import { deviceById } from "./installation.ts";
import { readingSources, sourceMetrics } from "./reading-sources.ts";
import { budgetRatio } from "./power-budget.ts";
import type { SpatialReading } from "./spatial.ts";

/** 与当前有效功耗严格同一批设备；undefined 表示不支持该对象。 */
export function budgetReference(
  id: string,
  readings: Map<string, SpatialReading>,
): number | null | undefined {
  const device = deviceById(id);
  if (device) {
    const reading = readings.get(id);
    return reading?.quality === "valid" &&
      budgetRatio(reading.power, device.budgetWatts) !== null
      ? device.budgetWatts
      : null;
  }
  if (!sourceMetrics(id).includes("power")) return undefined;
  const budget = readingSources(id, "power", readings)!.budget!;
  return budget.ratio === null ? null : budget.observed.watts;
}
