import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import type { DataQuality } from "./status.ts";
import type { ReviewPoint } from "./review-model.ts";

export const environmentSettings = definition.environmentMonitoring;
export const environmentProbes = environmentSettings.probes.map((probe) => ({
  ...probe,
  fixture: definition.room.fixtures.find(
    (fixture) => fixture.id === probe.fixtureId,
  )!,
}));
export const environmentProbe = (id: string) =>
  environmentProbes.find((probe) => probe.fixtureId === id);
export const environmentQuality = {
  valid: "有效",
  missing: "缺失",
  stale: "过期",
  offline: "离线",
};
export type EnvironmentMetric = "ambientTemperature" | "humidity" | "dewPoint";
export type EnvironmentChannel = {
  value: number | null;
  lastValue: number | null;
  observedAt: number | null;
  quality: DataQuality;
};
const inWindow = (time: number, windows: number[][]) =>
  windows.some(([start, end]) => time >= start && time < end);
const second = (time: number) =>
  Math.max(0, Math.min(120, Math.floor(Number.isFinite(time) ? time : 0)));
function interpolate(profile: number[][], time: number) {
  const next = profile.findIndex(([at]) => at >= time);
  if (next <= 0) return profile[next === 0 ? 0 : profile.length - 1][1];
  const [t0, v0] = profile[next - 1],
    [t1, v1] = profile[next];
  return v0 + ((v1 - v0) * (time - t0)) / (t1 - t0);
}
/** 水面 Magnus 近似的反解；本演示仅对 0–60°C、0<RH≤100% 且结果≥0°C 推导露点，不推导霜点。 */
export function dewPoint(temperature: number, humidity: number) {
  if (
    !Number.isFinite(temperature) ||
    !Number.isFinite(humidity) ||
    temperature < 0 ||
    temperature > 60 ||
    humidity <= 0 ||
    humidity > 100
  )
    return null;
  const gamma =
    Math.log(humidity / 100) + (17.62 * temperature) / (243.12 + temperature);
  const value = (243.12 * gamma) / (17.62 - gamma);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
export function environmentDewPoint(
  temperature: EnvironmentChannel,
  humidity: EnvironmentChannel,
) {
  if (temperature.quality !== "valid" || humidity.quality !== "valid")
    return {
      value: null,
      reason: "温湿度须同时有效，缺失、过期或离线时不推导。",
    };
  if (
    temperature.observedAt === null ||
    temperature.observedAt !== humidity.observedAt
  )
    return { value: null, reason: "温湿度采样不同步，不混用不同时刻的输入。" };
  const value =
    temperature.value === null || humidity.value === null
      ? null
      : dewPoint(temperature.value, humidity.value);
  return {
    value,
    reason:
      value === null
        ? "超出当前露点推导范围（温度 0–60°C、相对湿度大于 0，且露点不低于 0°C）。"
        : "同一探头、同一采样时刻的温湿度推导；非独立测点。",
  };
}
/** 与设备观测独立的确定性演示。断采允许保鲜到期限，之后保留最后观测但不显示为当前值。 */
export function environmentObservation(id: string, time: number) {
  const probe = environmentProbe(id);
  if (!probe) return null;
  const now = second(time);
  const channel = (metric: "temperature" | "humidity"): EnvironmentChannel => {
    let observedAt: number | null = null;
    for (
      let at = now - (now % environmentSettings.sampleSeconds);
      at >= 0;
      at -= environmentSettings.sampleSeconds
    ) {
      if (
        inWindow(at, probe.offline) ||
        (metric === "humidity" &&
          (at < probe.humidityMissingUntil || inWindow(at, probe.humidityGaps)))
      )
        continue;
      observedAt = at;
      break;
    }
    const lastValue =
      observedAt === null ? null : interpolate(probe[metric], observedAt);
    const quality: DataQuality = inWindow(now, probe.offline)
      ? "offline"
      : observedAt === null
        ? "missing"
        : now - observedAt > environmentSettings.maxAgeSeconds
          ? "stale"
          : "valid";
    return {
      quality,
      observedAt,
      lastValue,
      value: quality === "valid" ? lastValue : null,
    };
  };
  const temperature = channel("temperature"),
    humidity = channel("humidity");
  return {
    id,
    time: now,
    temperature,
    humidity,
    dewPoint: environmentDewPoint(temperature, humidity),
  };
}
export const environmentValue = (value: number | null, unit: string) =>
  value === null ? "—" : `${value.toFixed(1)} ${unit}`;
const historyCache = new Map<
  string,
  Record<EnvironmentMetric, ReviewPoint[]>
>();
export function environmentHistories(id: string) {
  if (!environmentProbe(id)) return null;
  if (historyCache.has(id)) return historyCache.get(id)!;
  const histories: Record<EnvironmentMetric, ReviewPoint[]> = {
    ambientTemperature: [],
    humidity: [],
    dewPoint: [],
  };
  for (let time = 0; time <= 120; time++) {
    const observation = environmentObservation(id, time)!;
    for (const metric of Object.keys(histories) as EnvironmentMetric[]) {
      const reading =
        metric === "ambientTemperature"
          ? observation.temperature
          : observation[metric];
      histories[metric].push({
        time,
        value: reading.value,
        quality:
          "quality" in reading
            ? reading.quality
            : reading.value === null
              ? "missing"
              : "valid",
        coverage: reading.value === null ? 0 : 1,
        count: 1,
      });
    }
  }
  historyCache.set(id, histories);
  return histories;
}

export type EnvironmentProcessState =
  DataQuality | "derived" | "unsynchronized" | "unavailable";
export const environmentProcessNames: Record<EnvironmentProcessState, string> =
  {
    ...environmentQuality,
    derived: "可推导",
    unsynchronized: "采样不同步",
    unavailable: "不可推导",
  };
export type EnvironmentProcessEvent = {
  time: number;
  changes: {
    metric: EnvironmentMetric;
    before: EnvironmentProcessState | null;
    after: EnvironmentProcessState;
  }[];
};
/** 从已发生的观测提取变化，不用未来恢复时刻补全当前过程。 */
export function environmentProcess(
  id: string,
  time: number,
): EnvironmentProcessEvent[] {
  if (!environmentProbe(id)) return [];
  const events: EnvironmentProcessEvent[] = [];
  let previous: Record<EnvironmentMetric, EnvironmentProcessState> | null =
    null;
  for (let at = 0; at <= second(time); at++) {
    const reading = environmentObservation(id, at)!;
    const current: Record<EnvironmentMetric, EnvironmentProcessState> = {
      ambientTemperature: reading.temperature.quality,
      humidity: reading.humidity.quality,
      dewPoint:
        reading.dewPoint.value !== null
          ? "derived"
          : reading.temperature.quality === "valid" &&
              reading.humidity.quality === "valid" &&
              reading.temperature.observedAt !== reading.humidity.observedAt
            ? "unsynchronized"
            : "unavailable",
    };
    const changes = (Object.keys(current) as EnvironmentMetric[])
      .filter((metric) => previous?.[metric] !== current[metric])
      .map((metric) => ({
        metric,
        before: previous?.[metric] ?? null,
        after: current[metric],
      }));
    if (changes.length) events.push({ time: at, changes });
    previous = current;
  }
  return events;
}
