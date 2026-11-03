import type { AppState } from "./domain.ts";
import type { ReviewLayer } from "./review-model.ts";
import type { SpatialReading } from "./spatial.ts";

/** 场景只保留当前任务需要的标签，完整对象仍可从资源目录访问。 */
export function sceneLabels<T extends { id: string }>(
  candidates: T[],
  readings: Map<string, SpatialReading>,
  options: {
    level: AppState["level"];
    layer: ReviewLayer;
    selectedId: string;
    more: boolean;
    annotatedIds?: string[];
    estimates?: Map<string, number | null>;
    hasPath?: boolean;
  },
): T[] {
  const { level, layer, selectedId, more, estimates } = options;
  const selected = (item: T) => item.id === selectedId;
  const value = (item: T) => {
    const reading = readings.get(item.id);
    if (!reading || reading.quality !== "valid") return -Infinity;
    return layer === "environment"
      ? ((estimates ? estimates.get(item.id) : reading.temperature) ??
          -Infinity)
      : (reading.power ?? -Infinity);
  };
  const standardLimit = level === "room" ? 6 : 3;
  const limit =
    more || layer === "alarms"
      ? standardLimit
      : layer === "overview"
        ? level === "device" || options.hasPath
          ? 1
          : 3
        : options.hasPath
          ? 2
          : Math.min(4, standardLimit);
  return candidates
    .filter((item) => {
      if (options.annotatedIds?.includes(item.id)) return false;
      const reading = readings.get(item.id);
      if (!reading) return false;
      if (layer === "alarms") return reading.alarm > 0;
      if (layer !== "overview" || more || selected(item)) return true;
      // 部件模型评估不提升为独立异常；总览不自动为正常对象填满标签。
      return level !== "device" && reading.alarm > 0;
    })
    .sort(
      (a, b) =>
        Number(selected(b)) - Number(selected(a)) ||
        (layer === "overview" || layer === "alarms"
          ? (readings.get(b.id)?.alarm ?? 0) - (readings.get(a.id)?.alarm ?? 0)
          : value(b) - value(a)),
    )
    .slice(0, limit);
}
