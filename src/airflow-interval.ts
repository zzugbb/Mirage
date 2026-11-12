import {
  airflowResponseTarget,
  type AirflowResponseTarget,
} from "./airflow-response.ts";
import { deviceObservation } from "./device-data.ts";
import { normalizeTime, simulate, coolingCapacityAt } from "./simulation.ts";
import { qualityNames } from "./status.ts";

/** 按已发生的公共输入事件划分，不从温度变化反推输入或根因。 */
export function airflowIntervals(target: AirflowResponseTarget, time: number) {
  if (!airflowResponseTarget(target)) return null;
  const horizon = normalizeTime(time);
  const starts = [
    { time: 0, title: "初始输入" },
    ...simulate(horizon, 0, target.deviceId)
      .events.filter((event) => event.kind === "input")
      .sort((a, b) => a.time - b.time),
  ];
  const point = (at: number) => {
    const observation = deviceObservation(at, target.deviceId);
    const temperature =
      observation.quality === "valid" ? observation.temperature : null;
    return {
      time: at,
      input: Math.round(coolingCapacityAt(at)),
      temperature,
      status:
        observation.quality !== "valid"
          ? qualityNames[observation.quality]
          : temperature === null
            ? "无有效进风"
            : "有效",
      observedAt: observation.observedAt,
    };
  };
  return starts.map((event, index) => {
    const end = (starts[index + 1]?.time ?? horizon + 1) - 1;
    const first = point(event.time),
      last = point(end);
    const validCount = Array.from({ length: end - event.time + 1 }, (_, i) =>
      point(event.time + i),
    ).filter((p) => p.temperature !== null).length;
    return {
      start: event.time,
      end,
      title: event.title,
      first,
      last,
      validCount,
      count: end - event.time + 1,
      difference:
        first.temperature !== null && last.temperature !== null
          ? Math.round((last.temperature - first.temperature) * 10) / 10
          : null,
    };
  });
}
