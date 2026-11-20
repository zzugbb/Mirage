import { budgetRatio, budgetStateAt } from "./power-budget.ts";
import { deviceById, type devices } from "./installation.ts";
import { simulate, normalizeTime } from "./simulation.ts";
import type { DataQuality, Lifecycle } from "./status.ts";
/** 观测适配：失联没有数值；过期设备固定保留第 44 秒的最后观测，不随回放伪更新。 */
export function deviceObservation(time: number, deviceId: string, cycle = 0) {
  const profile = deviceById(deviceId);
  if (!profile) throw new RangeError("未登记的演示设备");
  const now = normalizeTime(time);
  const lifecycle = profile.lifecycle as Lifecycle;
  const quality: DataQuality =
    profile.telemetry === "stale" && now < 45
      ? "valid"
      : (profile.telemetry as DataQuality);
  const unavailable = quality === "offline" || quality === "missing";
  const observedAt = unavailable ? null : quality === "stale" ? 44 : now;
  const sample = simulate(observedAt ?? now, cycle, deviceId);
  return {
    sample,
    lifecycle,
    quality,
    observedAt,
    temperature:
      unavailable || lifecycle === "stopped" ? null : sample.temperature,
    power: unavailable ? null : lifecycle === "stopped" ? 0 : sample.power,
    energyWh:
      quality !== "valid"
        ? null
        : lifecycle === "stopped"
          ? 0
          : sample.energyWh,
  };
}
export function observedHistory(
  time: number,
  deviceId: string,
  metric: "temperature" | "power",
) {
  const observation = deviceObservation(time, deviceId);
  if (observation.observedAt === null || observation[metric] === null)
    return [];
  return Array.from({ length: observation.observedAt + 1 }, (_, t) => {
    const point = deviceObservation(t, deviceId);
    return { observedAt: t, value: point[metric]! };
  });
}

/** 预算回看使用该时刻可计入的整机以及同一批配置预算，包括有效零值。 */
export function inputBudgetState(
  id: string,
  members: typeof devices,
  ratio: number | null,
  time: number,
) {
  return budgetStateAt(id, ratio, time, (at) => {
    let watts = 0,
      available = 0;
    for (const device of members) {
      const previous = deviceObservation(at, device.id);
      if (previous.quality !== "valid" || previous.power === null) continue;
      if (budgetRatio(0, device.budgetWatts) === null) return null;
      watts += previous.power;
      available += device.budgetWatts;
    }
    return budgetRatio(watts, available);
  });
}
