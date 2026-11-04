import type { SimulationSnapshot } from "./simulation.ts";
import { qualityNames } from "./status.ts";
import type { SpatialReading } from "./spatial.ts";

/** 只解释设备当前秒可用的进风读数，持续区间来自生成告警的同一条模拟轨迹。 */
export function inletAssessment(
  reading: SpatialReading,
  sample: SimulationSnapshot,
) {
  const inactive = { since: null, confirmed: null };
  if (reading.quality !== "valid" || reading.temperature === null) {
    const stopped =
      reading.lifecycle === "stopped" && reading.quality === "valid";
    return {
      ...inactive,
      status: stopped
        ? "停机"
        : reading.quality === "valid"
          ? "无进风读数"
          : qualityNames[reading.quality],
      detail:
        reading.quality === "stale" && reading.observedAt !== null
          ? `最后观测在第 ${reading.observedAt} 秒，当前进风无法判定。`
          : "当前没有可用于告警判定的进风读数。",
    };
  }
  const { alarm, pending } = sample;
  const status = alarm && !alarm.active ? "已恢复" : sample.temperatureStatus;
  if (pending)
    return {
      status,
      detail: `${pending.label} · 已持续 ${pending.elapsed} / ${pending.required} 秒`,
      since: sample.observedAt - pending.elapsed,
      confirmed: null,
    };
  const change = sample.events.findLast(
    (event) => event.entityId === reading.id && event.time === alarm?.changedAt,
  );
  return {
    status,
    detail: change
      ? `第 ${change.time} 秒，${change.detail}`
      : "当前进风未触发告警持续条件。",
    since: change?.conditionSince ?? null,
    confirmed: change?.time ?? null,
  };
}
