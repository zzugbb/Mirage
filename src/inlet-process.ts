import { deviceObservation } from "./device-data.ts";
import { normalizeTime, scenario } from "./simulation.ts";
import type { SimulationEvent } from "./simulation.ts";

export type InletConditionKind = Exclude<SimulationEvent["kind"], "input">;
export const inletConditions = {
  raised: {
    name: "预警",
    operator: "≥",
    threshold: scenario.warning.threshold,
    required: scenario.warning.hold,
  },
  escalated: {
    name: "升级",
    operator: "≥",
    threshold: scenario.critical.threshold,
    required: scenario.critical.hold,
  },
  downgraded: {
    name: "降级",
    operator: "≤",
    threshold: scenario.critical.clear,
    required: scenario.critical.clearHold,
  },
  recovered: {
    name: "恢复",
    operator: "≤",
    threshold: scenario.warning.clear,
    required: scenario.warning.clearHold,
  },
} as const;
export type InletInterval = {
  id: string;
  kind: InletConditionKind;
  start: number;
  end: number;
  confirmed: boolean;
};

export type InletProcessState = {
  origin: number | null;
  chosen: string | null;
  open: boolean;
};
export const emptyInletProcess: InletProcessState = {
  origin: null,
  chosen: null,
  open: false,
};

/** 截止所选基准秒的可知区间；过期只保留最后观测前已确认的历史。 */
export function inletProcess(id: string, time: number) {
  const horizon = normalizeTime(time);
  const observation = deviceObservation(horizon, id);
  const { sample, observedAt, lifecycle, quality } = observation;
  const intervals: InletInterval[] = [];
  if (observedAt !== null && lifecycle !== "stopped") {
    for (const event of sample.events) {
      if (
        event.entityId !== id ||
        event.kind === "input" ||
        event.conditionSince === null ||
        event.time > observedAt
      )
        continue;
      intervals.push({
        id: `${event.kind}:${event.conditionSince}`,
        kind: event.kind,
        start: event.conditionSince,
        end: event.time,
        confirmed: true,
      });
    }
    if (
      quality === "valid" &&
      observation.temperature !== null &&
      sample.pending
    ) {
      const kind: InletConditionKind = !sample.alarm?.active
        ? "raised"
        : sample.alarm.severity === "critical"
          ? "downgraded"
          : sample.temperature <= scenario.warning.clear
            ? "recovered"
            : "escalated";
      const start = observedAt - sample.pending.elapsed;
      intervals.push({
        id: `${kind}:${start}`,
        kind,
        start,
        end: observedAt,
        confirmed: false,
      });
    }
  }
  return { horizon, observedAt, quality, intervals };
}
