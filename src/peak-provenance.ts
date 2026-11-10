import { devices, rackById } from "./installation.ts";
import { coolingDeviceIds, isCoolingSource } from "./cooling.ts";
import type { SpatialReading } from "./spatial.ts";
import type { ReviewPoint } from "./review-model.ts";
import { normalizeTime } from "./simulation.ts";

export function peakScopeIds(id: string) {
  if (id === "room-01") return devices.map((device) => device.id);
  if (rackById(id))
    return devices
      .filter((device) => device.rackId === id)
      .map((device) => device.id);
  return isCoolingSource(id) ? coolingDeviceIds(id) : null;
}
/** 仅整机有效进风参加最高值；保留未舍入值相等的全部来源。 */
export function maximumSources(
  ids: string[],
  readings: Map<string, SpatialReading>,
) {
  const valid = [...new Set(ids)].flatMap((id) => {
    const reading = readings.get(id);
    return reading?.quality === "valid" &&
      reading.temperature !== null &&
      Number.isFinite(reading.temperature)
      ? [{ id, value: reading.temperature }]
      : [];
  });
  const maximum = valid.length
    ? Math.max(...valid.map((item) => item.value))
    : null;
  return valid
    .filter((item) => item.value === maximum)
    .map((item) => item.id)
    .sort();
}
export type PeakProcessState = { open: boolean; origin: number | null };
export const emptyPeakProcess: PeakProcessState = { open: false, origin: null };
export type PeakInterval = {
  start: number;
  end: number;
  sourceIds: string[];
  coverage: number;
  count: number;
  reason: "initial" | "source" | "coverage" | "source-coverage";
  min: number | null;
  max: number | null;
};
/** 只合并已知秒数中来源集合和覆盖都相同的连续段，不当作告警或因果结论。 */
export function peakSourceIntervals(points: ReviewPoint[], time: number) {
  const horizon = normalizeTime(time);
  const intervals: PeakInterval[] = [];
  for (const point of points) {
    if (point.time > horizon) break;
    const sourceIds = [...(point.peakSources ?? [])].sort();
    const previous = intervals.at(-1);
    const sameSources =
      previous && previous.sourceIds.join("|") === sourceIds.join("|");
    const value =
      point.quality === "valid" &&
      point.value !== null &&
      Number.isFinite(point.value)
        ? point.value
        : null;
    if (
      previous &&
      sameSources &&
      previous.coverage === point.coverage &&
      previous.count === point.count &&
      previous.end === point.time - 1
    ) {
      previous.end = point.time;
      if (value !== null) {
        previous.min = Math.min(previous.min ?? value, value);
        previous.max = Math.max(previous.max ?? value, value);
      }
    } else
      intervals.push({
        start: point.time,
        end: point.time,
        sourceIds,
        coverage: point.coverage,
        count: point.count,
        reason: !previous
          ? "initial"
          : sameSources
            ? "coverage"
            : previous.coverage !== point.coverage ||
                previous.count !== point.count
              ? "source-coverage"
              : "source",
        min: value,
        max: value,
      });
  }
  return intervals;
}
