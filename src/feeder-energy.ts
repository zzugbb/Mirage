import { deviceObservation } from "./device-data.ts";
import { normalizeTime } from "./simulation.ts";

export function feederEnergyInterval(first: number, second: number) {
  const a = normalizeTime(first),
    b = normalizeTime(second);
  return { start: Math.min(a, b), end: Math.max(a, b) };
}
export type FeederEnergyInterval = ReturnType<typeof feederEnergyInterval>;

/** 只累加相邻两个有效观测之间的模拟电量增量，过期或失联期间不补值。 */
export function deviceIntervalEnergy(
  id: string,
  { start, end }: FeederEnergyInterval,
) {
  let previous = deviceObservation(start, id).energyWh;
  let wattHours = 0,
    covered = 0;
  let lastEnd: number | null = null;
  for (let time = start + 1; time <= end; time++) {
    const current = deviceObservation(time, id).energyWh;
    if (previous !== null && current !== null) {
      wattHours += current - previous;
      covered++;
      lastEnd = time;
    }
    previous = current;
  }
  return { wattHours: covered ? wattHours : null, covered, lastEnd };
}

export function feederIntervalEnergy(
  ids: string[],
  interval: FeederEnergyInterval,
) {
  const byDevice = new Map(
    [...new Set(ids)].map((id) => [id, deviceIntervalEnergy(id, interval)]),
  );
  const duration = interval.end - interval.start;
  let wattHours = 0,
    covered = 0,
    complete = 0,
    partial = 0;
  for (const row of byDevice.values()) {
    if (row.wattHours === null) continue;
    wattHours += row.wattHours;
    covered += row.covered;
    if (row.covered === duration) complete++;
    else partial++;
  }
  return {
    byDevice,
    wattHours: covered ? wattHours : null,
    covered,
    possible: duration * byDevice.size,
    complete,
    partial,
    unavailable: byDevice.size - complete - partial,
  };
}

export function energyText(wattHours: number | null) {
  return wattHours === null ? "—" : wattHours.toFixed(3) + " Wh";
}
