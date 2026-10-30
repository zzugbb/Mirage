/** 纯模拟：固定 1 秒采样的一阶响应；参数与阈值用于演示，不是现场设定建议。 */
export const scenario = {
  id: "cooling-response-v1",
  name: "冷却扰动与恢复",
  duration: 120,
  baseline: 27,
  thermalGain: 20,
  timeConstant: 12,
  warning: { threshold: 33, hold: 5, clear: 31, clearHold: 8 },
  critical: { threshold: 38, hold: 5, clear: 36, clearHold: 5 },
  relation: {
    id: "cooling-to-server-01",
    source: "cooling-01",
    target: "srv-01",
    kind: "cooling",
    sourceType: "simulation",
  },
} as const;
export type Severity = "warning" | "critical";
export type SimulationEvent = {
  id: string;
  time: number;
  entityId: string;
  kind: "input" | "raised" | "escalated" | "downgraded" | "recovered";
  title: string;
  detail: string;
};
export type SimulationAlarm = {
  id: string;
  entityId: string;
  severity: Severity;
  peakSeverity: Severity;
  active: boolean;
  raisedAt: number;
  changedAt: number;
  recoveredAt: number | null;
};
type PendingCondition = { label: string; elapsed: number; required: number };
export type PowerAllocation = { id: string; name: string; watts: number };
export function powerAllocation(temperature: number): PowerAllocation[] {
  const fanWatts =
    Math.round(
      (12 + 12 * Math.max(0, Math.min(1, (temperature - 27) / 12))) * 10,
    ) / 10;
  return [
    { id: "processor", name: "处理器（假设双路）", watts: 132 },
    { id: "board", name: "主板与控制逻辑", watts: 40 },
    { id: "memory", name: "内存模组", watts: 40 },
    { id: "storage", name: "存储模组", watts: 12 },
    { id: "fans", name: "风扇模组", watts: fanWatts },
    { id: "conversion", name: "电源转换损耗", watts: 12 },
  ];
}
type Sample = {
  source: "simulation";
  scenarioId: string;
  observedAt: number;
  temperature: number;
  power: number;
  energyWh: number;
  allocation: readonly PowerAllocation[];
  coolingCapacity: number;
  phase: "stable" | "degraded" | "recovering" | "recovered";
  temperatureStatus: string;
  alarm: SimulationAlarm | null;
  pending: PendingCondition | null;
  events: readonly SimulationEvent[];
};
export const phaseNames = {
  stable: "稳定运行",
  degraded: "冷却减弱",
  recovering: "冷却恢复中",
  recovered: "温度已恢复",
};
export const severityNames = { warning: "预警", critical: "严重" };
export function normalizeTime(time: number) {
  return Number.isFinite(time)
    ? Math.max(0, Math.min(scenario.duration, Math.floor(time)))
    : 0;
}
export function coolingCapacityAt(time: number) {
  const t = normalizeTime(time);
  if (t < 20) return 100;
  if (t < 26) return 100 - ((t - 20) / 6) * 65;
  if (t < 70) return 35;
  if (t < 78) return 35 + ((t - 70) / 8) * 65;
  return 100;
}

function generateTrace(): readonly Sample[] {
  let thermal = scenario.baseline as number;
  let warningSince: number | null = null;
  let criticalSince: number | null = null;
  let recoverySince: number | null = null;
  let downgradeSince: number | null = null;
  const events: SimulationEvent[] = [];
  const trace: Sample[] = [];
  let energyWh = 0;
  for (let t = 0; t <= scenario.duration; t++) {
    let alarm: SimulationAlarm | null = trace[t - 1]?.alarm ?? null;
    const capacity = coolingCapacityAt(t);
    if (t > 0) {
      const equilibrium =
        scenario.baseline + (1 - capacity / 100) * scenario.thermalGain;
      thermal += (equilibrium - thermal) / scenario.timeConstant;
    }
    const temperature = Math.round(thermal * 10) / 10;
    const allocation = powerAllocation(temperature);
    const power =
      Math.round(allocation.reduce((sum, item) => sum + item.watts, 0) * 10) /
      10;
    if (t > 0) energyWh += (trace[t - 1].power + power) / 2 / 3600;
    const addEvent = (
      kind: SimulationEvent["kind"],
      title: string,
      detail: string,
      entityId: string = scenario.relation.target,
    ) =>
      events.push(
        Object.freeze({
          id: `${scenario.id}:${kind}:${t}`,
          time: t,
          entityId,
          kind,
          title,
          detail,
        }),
      );
    if (t === 20)
      addEvent(
        "input",
        "冷却能力开始下降",
        "模拟输入：在 6 秒内从 100% 降至 35%。",
        scenario.relation.source,
      );
    if (t === 26)
      addEvent(
        "input",
        "冷却能力降至 35%",
        "负载设定不变；温度滞后响应，风扇功耗随温度增加。",
        scenario.relation.source,
      );
    if (t === 70)
      addEvent(
        "input",
        "开始恢复冷却能力",
        "模拟输入：在 8 秒内恢复到 100%。",
        scenario.relation.source,
      );
    if (t === 78)
      addEvent(
        "input",
        "冷却能力已恢复 100%",
        "温度仍有响应延迟，告警按回差和持续条件恢复。",
        scenario.relation.source,
      );
    warningSince =
      temperature >= scenario.warning.threshold ? (warningSince ?? t) : null;
    criticalSince =
      temperature >= scenario.critical.threshold ? (criticalSince ?? t) : null;
    recoverySince =
      temperature <= scenario.warning.clear ? (recoverySince ?? t) : null;
    downgradeSince =
      temperature <= scenario.critical.clear ? (downgradeSince ?? t) : null;
    const held = (since: number | null, seconds: number) =>
      since !== null && t - since >= seconds;
    if (!alarm?.active && held(warningSince, scenario.warning.hold)) {
      alarm = {
        id: `${scenario.id}:inlet-temperature`,
        entityId: scenario.relation.target,
        severity: "warning",
        peakSeverity: "warning",
        active: true,
        raisedAt: t,
        changedAt: t,
        recoveredAt: null,
      };
      addEvent(
        "raised",
        "进风温度预警",
        `进风温度 ≥ 33 °C 已持续 5 秒，当前 ${temperature} °C。`,
      );
    } else if (alarm?.active) {
      if (held(recoverySince, scenario.warning.clearHold)) {
        alarm = { ...alarm, active: false, recoveredAt: t, changedAt: t };
        addEvent(
          "recovered",
          "温度告警已恢复",
          `进风温度 ≤ 31 °C 已持续 8 秒，当前 ${temperature} °C。`,
        );
      } else if (
        alarm.severity === "warning" &&
        held(criticalSince, scenario.critical.hold)
      ) {
        alarm = {
          ...alarm,
          severity: "critical",
          peakSeverity: "critical",
          changedAt: t,
        };
        addEvent(
          "escalated",
          "进风温度升级为严重",
          `进风温度 ≥ 38 °C 已持续 5 秒，当前 ${temperature} °C。`,
        );
      } else if (
        alarm.severity === "critical" &&
        held(downgradeSince, scenario.critical.clearHold)
      ) {
        alarm = { ...alarm, severity: "warning", changedAt: t };
        addEvent(
          "downgraded",
          "温度告警降级为预警",
          `进风温度 ≤ 36 °C 已持续 5 秒，当前 ${temperature} °C。`,
        );
      }
    }
    const condition = (
      label: string,
      since: number | null,
      required: number,
    ): PendingCondition | null =>
      since !== null && t - since < required
        ? { label, elapsed: t - since, required }
        : null;
    const pending = !alarm?.active
      ? condition("预警持续条件", warningSince, scenario.warning.hold)
      : alarm.severity === "critical"
        ? condition("降级持续条件", downgradeSince, scenario.critical.clearHold)
        : temperature <= scenario.warning.clear
          ? condition("恢复持续条件", recoverySince, scenario.warning.clearHold)
          : condition("严重持续条件", criticalSince, scenario.critical.hold);
    const phase =
      t < 20
        ? "stable"
        : t < 70
          ? "degraded"
          : alarm && !alarm.active
            ? "recovered"
            : "recovering";
    trace.push(
      Object.freeze({
        source: "simulation",
        scenarioId: scenario.id,
        observedAt: t,
        temperature,
        power,
        energyWh,
        allocation: Object.freeze(
          allocation.map((item) => Object.freeze(item)),
        ),
        coolingCapacity: Math.round(capacity),
        phase,
        temperatureStatus: alarm?.active
          ? severityNames[alarm.severity]
          : "正常",
        alarm: alarm ? Object.freeze({ ...alarm }) : null,
        pending: pending ? Object.freeze(pending) : null,
        events: Object.freeze(events.slice()),
      }),
    );
  }
  return Object.freeze(trace);
}
const trace = generateTrace();

export function simulate(time: number, cycle = 0): Sample {
  const sample = trace[normalizeTime(time)];
  const occurrence = Math.max(
    0,
    Math.floor(Number.isFinite(cycle) ? cycle : 0),
  );
  return {
    ...sample,
    alarm: sample.alarm
      ? { ...sample.alarm, id: `${sample.alarm.id}:run-${occurrence}` }
      : null,
    events: sample.events.map((event) => ({
      ...event,
      id: `${event.id}:run-${occurrence}`,
    })),
  };
}
export const temperatureHistory = (time: number) =>
  trace.slice(0, normalizeTime(time) + 1);
export type SimulationSnapshot = ReturnType<typeof simulate>;
