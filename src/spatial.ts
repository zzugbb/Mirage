import { racks, devices, deviceById } from "./installation.ts";
import { parts, subparts } from "./domain.ts";
import type { AppState } from "./domain.ts";
import { simulate } from "./simulation.ts";
import type { SimulationSnapshot } from "./simulation.ts";
export type SpatialReading = {
  id: string;
  name: string;
  temperature: number | null;
  power: number | null;
  budget: number | null;
  alarm: 0 | 1 | 2;
  alarmCount: number;
  count: number;
  temperatureLabel: string;
  powerLabel: string;
  source: string;
};
const componentRules: Record<
  string,
  { rise: number; watts: string | null; share: number; budget: number | null }
> = {
  "lid-01": { rise: 5, watts: null, share: 0, budget: null },
  "board-01": { rise: 9, watts: "board", share: 1, budget: 60 },
  "cpu-01": { rise: 28, watts: null, share: 0, budget: null },
  "cpu-02": { rise: 31, watts: null, share: 0, budget: null },
  "memory-01": { rise: 13, watts: "memory", share: 1, budget: 64 },
  "fans-01": { rise: 2, watts: "fans", share: 1, budget: 32 },
  "storage-01": { rise: 7, watts: "storage", share: 1, budget: 20 },
  "psu-01": { rise: 14, watts: "conversion", share: 0.5, budget: 10 },
  "psu-02": { rise: 12, watts: "conversion", share: 0.5, budget: 10 },
};
export function componentReading(
  sample: SimulationSnapshot,
  deviceId: string,
  id: string,
): SpatialReading {
  const child = subparts.find((part) => part.id === id);
  const parent = child?.parent ?? id;
  const rule = componentRules[parent];
  const part = parts.find((part) => part.id === parent)!;
  const count =
    parent === "memory-01"
      ? 16
      : parent === "fans-01"
        ? 4
        : parent === "storage-01"
          ? 8
          : 1;
  const index = child
    ? subparts
        .filter((part) => part.parent === parent)
        .findIndex((part) => part.id === id)
    : 0;
  // 散热器与上盖是被动构件，零耗电与未定义盘位耗电分开。
  const power =
    child?.parent === "storage-01"
      ? null
      : rule.watts
        ? (sample.allocation.find((item) => item.id === rule.watts)!.watts *
            rule.share) /
          (child ? count : 1)
        : 0;
  const temperature =
    Math.round(
      (sample.temperature +
        rule.rise * (0.7 + 0.3 * deviceById(deviceId)!.loadFactor) +
        (child ? ((index % 4) - 1.5) * 0.6 : 0)) *
        10,
    ) / 10;
  return {
    id: `${deviceId}/${id}`,
    name: child?.name ?? part.name,
    temperature,
    power,
    budget:
      power === null
        ? null
        : rule.budget === null
          ? null
          : rule.budget / (child ? count : 1),
    alarm: 0,
    alarmCount: 0,
    count: 1,
    temperatureLabel: "代表表面温度 · 模型",
    powerLabel: parent.startsWith("psu")
      ? "转换损耗分配 · 假设"
      : "部件功耗分配 · 假设",
    source: "进风温度 + 显式温升假设；模组内部插值。无独立传感器或部件告警。",
  };
}
function aggregate(
  id: string,
  name: string,
  children: SpatialReading[],
): SpatialReading {
  return {
    id,
    name,
    temperature: Math.max(...children.map((item) => item.temperature!)),
    power: children.reduce((sum, item) => sum + item.power!, 0),
    budget: children.reduce((sum, item) => sum + item.budget!, 0),
    alarm: Math.max(...children.map((item) => item.alarm)) as 0 | 1 | 2,
    alarmCount: children.reduce((sum, item) => sum + item.alarmCount, 0),
    count: children.reduce((sum, item) => sum + item.count, 0),
    temperatureLabel: "设备最高进风温度",
    powerLabel: "已展示设备输入合计",
    source: "仅汇总本演示设备；温度取最高值，功耗相加，告警取子设备最高级别。",
  };
}
export function spatialSnapshot(time: number, cycle = 0, deviceId = "srv-01") {
  const readings = new Map<string, SpatialReading>();
  const samples = new Map(
    devices.map((device) => [device.id, simulate(time, cycle, device.id)]),
  );
  for (const device of devices) {
    const sample = samples.get(device.id)!;
    readings.set(device.id, {
      id: device.id,
      name: device.name,
      temperature: sample.temperature,
      power: sample.power,
      budget: device.budgetWatts,
      alarm: sample.alarm?.active
        ? sample.alarm.severity === "critical"
          ? 2
          : 1
        : 0,
      alarmCount: sample.alarm?.active ? 1 : 0,
      count: 1,
      temperatureLabel: "设备进风温度",
      powerLabel: "整机输入功耗",
      source: "独立演示负载与冷却响应；无真实设备接入。",
    });
  }
  for (const rack of racks)
    readings.set(
      rack.id,
      aggregate(
        rack.id,
        rack.name,
        devices
          .filter((device) => device.rackId === rack.id)
          .map((device) => readings.get(device.id)!),
      ),
    );
  readings.set(
    "room-01",
    aggregate(
      "room-01",
      "01号机房",
      racks.map((rack) => readings.get(rack.id)!),
    ),
  );
  for (const part of [...parts, ...subparts])
    readings.set(
      part.id,
      componentReading(samples.get(deviceId)!, deviceId, part.id),
    );
  return { readings, samples };
}
export function selectedReading(
  state: AppState,
  readings: Map<string, SpatialReading>,
): SpatialReading | null {
  return readings.get(state.selected) ?? null;
}
