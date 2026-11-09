import { deviceById, rackForDevice } from "./installation.ts";
import { deviceObservation } from "./device-data.ts";
import { unitLabel } from "./catalog.ts";
import { lifecycleNames } from "./status.ts";
import type { ReviewPoint } from "./review-model.ts";

function inletPoint(id: string, time: number) {
  const observation = deviceObservation(time, id);
  const { quality, lifecycle, observedAt, temperature } = observation;
  const value =
    quality === "valid" && temperature !== null && Number.isFinite(temperature)
      ? temperature
      : null;
  const reason =
    quality === "stale"
      ? "数据过期"
      : quality === "offline"
        ? "设备离线"
        : quality === "missing"
          ? "未配置观测"
          : lifecycle === "stopped"
            ? "停机 · 无进风值"
            : value === null
              ? "无有效进风值"
              : "有效";
  return {
    id,
    name: deviceById(id)!.name,
    location: `${rackForDevice(id).name} / ${unitLabel(id)}`,
    value,
    quality,
    reason,
    observedAt,
    lifecycle: lifecycleNames[lifecycle],
    lastValue: quality === "stale" ? temperature : null,
  };
}

/** 只比较同一秒的有效整机进风，不从最后观测补齐当前差值。 */
export function inletPairSnapshot(
  firstId: string,
  secondId: string,
  time: number,
) {
  if (firstId === secondId || !deviceById(firstId) || !deviceById(secondId))
    return null;
  const first = inletPoint(firstId, time),
    second = inletPoint(secondId, time);
  return {
    first,
    second,
    difference:
      first.value !== null &&
      second.value !== null &&
      first.observedAt === second.observedAt
        ? Math.round((first.value - second.value) * 10) / 10
        : null,
  };
}

/** 沿用整机观测适配，绘制范围由图表的共享场景秒数限制。 */
export function inletHistory(id: string): ReviewPoint[] {
  return Array.from({ length: 121 }, (_, time) => {
    const point = inletPoint(id, time);
    return {
      time,
      value: point.value,
      quality: point.quality,
      count: 1,
      coverage: point.value === null ? 0 : 1,
    };
  });
}
