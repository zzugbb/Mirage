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
    alarmOriginId?: string;
    more: boolean;
    annotatedIds?: string[];
    estimates?: Map<string, number | null>;
    hasPath?: boolean;
  },
): T[] {
  const { level, layer, selectedId, more, estimates } = options;
  // 气流由端点说明读数，仅补当前对象身份，不误用功耗或整柜温度。
  if (layer === "airflow")
    return candidates.filter(
      (item) =>
        item.id === selectedId && !options.annotatedIds?.includes(item.id),
    );
  const selected = (item: T) => item.id === selectedId;
  const value = (item: T) => {
    const reading = readings.get(item.id);
    if (!reading || reading.quality !== "valid") return -Infinity;
    return layer === "environment"
      ? ((estimates ? estimates.get(item.id) : reading.temperature) ??
          -Infinity)
      : (reading.power ?? -Infinity);
  };
  const budgetPriority = (item: T) => {
    const r = readings.get(item.id);
    const levels = [r?.budgetState?.level, r?.memberBudgetLevel];
    return levels.includes("over") ? 2 : levels.includes("near") ? 1 : 0;
  };
  const standardLimit = level === "room" ? 6 : 3;
  const limit = more
    ? standardLimit
    : layer === "overview" || layer === "alarms"
      ? 1
      : options.hasPath
        ? 2
        : Math.min(4, standardLimit);
  return candidates
    .filter((item) => {
      if (options.annotatedIds?.includes(item.id)) return false;
      const reading = readings.get(item.id);
      if (!reading) return false;
      if (layer === "alarms")
        return (
          (selected(item) && item.id === options.alarmOriginId) ||
          (reading.alarm > 0 &&
            (more ||
              selected(item) ||
              (level === "room" && selectedId === "room-01")))
        );
      if (layer === "overview") return more || selected(item);
      return true;
    })
    .sort(
      (a, b) =>
        Number(selected(b)) - Number(selected(a)) ||
        (layer === "power" ? budgetPriority(b) - budgetPriority(a) : 0) ||
        (layer === "overview"
          ? 0
          : layer === "alarms"
            ? (readings.get(b.id)?.alarm ?? 0) -
              (readings.get(a.id)?.alarm ?? 0)
            : value(b) - value(a)),
    )
    .slice(0, limit);
}
