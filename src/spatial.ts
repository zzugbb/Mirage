import { deviceObservation } from "./device-data.ts";
import type { Lifecycle, DataQuality } from "./status.ts";
import { racks, devices, deviceById } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import type { AppState } from "./domain.ts";
import type { SimulationSnapshot } from "./simulation.ts";
import { associatedInputReading } from "./power-config.ts";
export type SpatialReading = {
  temperatureLimits?: number[];
  lifecycle: Lifecycle;
  quality: DataQuality;
  observedAt: number | null;
  evaluation: 0 | 1 | 2;
  coverageTemperature: number;
  coveragePower: number;
  lifecycleCounts: Record<Lifecycle, number>;
  qualityCounts: Record<DataQuality, number>;
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
  "board-01": { rise: 9, watts: "board", share: 0.48, budget: 60 },
  "cpu-01": { rise: 28, watts: null, share: 0, budget: null },
  "cpu-02": { rise: 31, watts: null, share: 0, budget: null },
  "memory-01": { rise: 13, watts: "memory", share: 1, budget: 64 },
  "fans-01": { rise: 2, watts: "fans", share: 1, budget: 32 },
  "storage-01": { rise: 7, watts: null, share: 0, budget: 20 },
  "psu-01": { rise: 14, watts: "conversion", share: 0.5, budget: 10 },
  "psu-02": { rise: 12, watts: "conversion", share: 0.5, budget: 10 },
};
export function componentReading(
  sample: SimulationSnapshot,
  deviceId: string,
  id: string,
  currentTime = sample.observedAt,
): SpatialReading {
  const parts = partsForDevice(deviceId),
    subparts = subpartsForDevice(deviceId);
  const child = subparts.find((part) => part.id === id);
  const parent = child?.parent ?? id;
  const part = parts.find((part) => part.id === parent);
  if (!part) throw new RangeError("部件不属于当前机型");
  const rules: Record<
    string,
    { rise: number; watts: string | null; share: number; budget: number | null }
  > = {
    "net-board": { rise: 9, watts: "board", share: 1, budget: 40 },
    "net-asic": { rise: 25, watts: "asic", share: 1, budget: 120 },
    "net-ports": { rise: 7, watts: "ports", share: 1, budget: 80 },
    "net-fans": { rise: 2, watts: "fans", share: 1, budget: 24 },
    "net-psu-a": { rise: 12, watts: "conversion", share: 0.5, budget: 12 },
    "net-psu-b": { rise: 12, watts: "conversion", share: 0.5, budget: 12 },
    "sto-controller-a": {
      rise: 18,
      watts: "controller",
      share: 0.5,
      budget: 200,
    },
    "sto-controller-b": {
      rise: 18,
      watts: "controller",
      share: 0.5,
      budget: 200,
    },
    "sto-midplane": { rise: 8, watts: "board", share: 1, budget: 60 },
    "sto-drives": { rise: 9, watts: "storage", share: 1, budget: 180 },
    "sto-fans": { rise: 2, watts: "fans", share: 1, budget: 30 },
    "sto-psu-a": { rise: 12, watts: "conversion", share: 0.5, budget: 20 },
    "sto-psu-b": { rise: 12, watts: "conversion", share: 0.5, budget: 20 },
  };
  const rule = componentRules[parent] ??
    rules[parent] ?? {
      rise: part.rise ?? 5,
      watts: part.watts ?? null,
      share: part.share ?? 0,
      budget: part.watts ? 60 : null,
    };
  const count = subparts.filter((part) => part.parent === parent).length || 1;
  const index = child
    ? subparts
        .filter((part) => part.parent === parent)
        .findIndex((part) => part.id === id)
    : 0;
  // 散热器与上盖是被动构件，零耗电与未定义盘位耗电分开。
  const power =
    child?.parent === "storage-01"
      ? 0
      : rule.watts
        ? ((sample.allocation.find((item) => item.id === rule.watts)?.watts ??
            0) *
            rule.share) /
          (child ? count : 1)
        : 0;
  let temperature: number | null =
    Math.round(
      (sample.temperature +
        rule.rise * (0.7 + 0.3 * deviceById(deviceId)!.loadFactor) +
        (child ? ((index % 4) - 1.5) * 0.6 : 0)) *
        10,
    ) / 10;
  const profile = deviceById(deviceId)!;
  const quality =
    profile.telemetry === "stale" && currentTime < 45
      ? "valid"
      : (profile.telemetry as DataQuality);
  const lifecycle = profile.lifecycle as Lifecycle;
  let observedPower: number | null = power;
  if (quality === "offline" || quality === "missing") {
    temperature = null;
    observedPower = null;
  }
  if (lifecycle === "stopped") {
    temperature = null;
    observedPower = power === null ? null : 0;
  }
  const limits =
    parent.startsWith("processor-") || parent === "net-asic"
      ? [70, 85]
      : parent.startsWith("sto-controller-")
        ? [60, 75]
        : parent.startsWith("cpu")
          ? [65, 76]
          : parent === "memory-01"
            ? [56, 64]
            : parent === "fans-01"
              ? [44, 52]
              : parent.startsWith("psu")
                ? [50, 62]
                : [44, 56];
  // 只评估演示温升模型，和设备测点告警严格分开。
  if (child?.id === "dimm-07" && quality === "valid" && temperature !== null)
    temperature += Math.max(0, sample.temperature - profile.baseline) * 1.1;
  const evaluation =
    temperature === null
      ? 0
      : temperature >= limits[1]
        ? 2
        : temperature >= limits[0]
          ? 1
          : 0;
  return {
    id: `${deviceId}/${id}`,
    temperatureLimits: limits,
    name: child?.name ?? part.name,
    temperature,
    power: observedPower,
    lifecycle,
    quality,
    observedAt:
      quality === "missing" || quality === "offline" ? null : sample.observedAt,
    evaluation,
    coverageTemperature: temperature !== null && quality === "valid" ? 1 : 0,
    coveragePower: observedPower !== null && quality === "valid" ? 1 : 0,
    lifecycleCounts: {
      running: 0,
      maintenance: 0,
      offline: 0,
      stopped: 0,
      [lifecycle]: 1,
    },
    qualityCounts: { valid: 0, missing: 0, stale: 0, offline: 0, [quality]: 1 },
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
    source:
      "进风温度 + 显式温升假设；模型分级仅供演示，无独立传感器或部件告警。离线、过期与未配置分别显示。",
  };
}
function aggregate(
  id: string,
  name: string,
  children: SpatialReading[],
): SpatialReading {
  const freshTemperature = children.filter(
    (item) => item.quality === "valid" && item.temperature !== null,
  );
  const freshPower = children.filter(
    (item) => item.quality === "valid" && item.power !== null,
  );
  const lifecycleCounts = {
    running: 0,
    maintenance: 0,
    offline: 0,
    stopped: 0,
  };
  const qualityCounts = { valid: 0, missing: 0, stale: 0, offline: 0 };
  for (const child of children) {
    for (const key of Object.keys(lifecycleCounts) as Lifecycle[])
      lifecycleCounts[key] += child.lifecycleCounts[key];
    for (const key of Object.keys(qualityCounts) as DataQuality[])
      qualityCounts[key] += child.qualityCounts[key];
  }
  const count = children.reduce((sum, item) => sum + item.count, 0);
  const coverageTemperature = children.reduce(
    (sum, item) => sum + item.coverageTemperature,
    0,
  );
  const coveragePower = children.reduce(
    (sum, item) => sum + item.coveragePower,
    0,
  );
  return {
    id,
    name,
    lifecycle: "running",
    quality: freshTemperature.length || freshPower.length ? "valid" : "missing",
    observedAt: children.reduce(
      (latest, item) => Math.max(latest, item.observedAt ?? 0),
      0,
    ),
    evaluation: 0,
    lifecycleCounts,
    qualityCounts,
    coverageTemperature,
    coveragePower,
    temperature: freshTemperature.length
      ? Math.max(...freshTemperature.map((item) => item.temperature!))
      : null,
    power: freshPower.length
      ? freshPower.reduce((sum, item) => sum + item.power!, 0)
      : null,
    budget: freshPower.reduce((sum, item) => sum + (item.budget ?? 0), 0),
    alarm: Math.max(...children.map((item) => item.alarm)) as 0 | 1 | 2,
    alarmCount: children.reduce((sum, item) => sum + item.alarmCount, 0),
    count,
    temperatureLabel: "已知设备最高进风温度",
    powerLabel: coveragePower < count ? "已知输入功耗小计" : "设备输入功耗合计",
    source:
      "只汇总当前有效数据。过期、离线、未配置不按零值计入，温度取有效最高值，功耗求和，告警取最高级别；覆盖范围单独标注。",
  };
}
export function spatialSnapshot(time: number, cycle = 0, deviceId = "srv-01") {
  const readings = new Map<string, SpatialReading>();
  const observations = new Map(
    devices.map((device) => [
      device.id,
      deviceObservation(time, device.id, cycle),
    ]),
  );
  const samples = new Map(
    [...observations].map(([id, observation]) => [id, observation.sample]),
  );
  for (const device of devices) {
    const { sample, lifecycle, quality, observedAt, temperature, power } =
      observations.get(device.id)!;
    readings.set(device.id, {
      id: device.id,
      name: device.name,
      temperature,
      power,
      budget: device.budgetWatts,
      lifecycle,
      quality,
      observedAt,
      evaluation: 0,
      coverageTemperature: temperature !== null && quality === "valid" ? 1 : 0,
      coveragePower: power !== null && quality === "valid" ? 1 : 0,
      lifecycleCounts: {
        running: 0,
        maintenance: 0,
        offline: 0,
        stopped: 0,
        [lifecycle]: 1,
      },
      qualityCounts: {
        valid: 0,
        missing: 0,
        stale: 0,
        offline: 0,
        [quality]: 1,
      },
      alarm:
        quality === "valid" && sample.alarm?.active
          ? sample.alarm.severity === "critical"
            ? 2
            : 1
          : 0,
      alarmCount: quality === "valid" && sample.alarm?.active ? 1 : 0,
      count: 1,
      temperatureLabel: "设备进风温度",
      powerLabel: "整机输入功耗",
      source:
        "独立演示负载、生命周期与数据质量配置；无真实设备接入。停机零功耗是有效模拟值，离线数据不等于零。",
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
  for (const part of [
    ...partsForDevice(deviceId),
    ...subpartsForDevice(deviceId),
  ])
    readings.set(
      part.id,
      componentReading(samples.get(deviceId)!, deviceId, part.id, time),
    );
  return { readings, samples };
}
export function selectedReading(
  state: AppState,
  readings: Map<string, SpatialReading>,
): SpatialReading | null {
  return (
    readings.get(state.selected) ??
    associatedInputReading(state.selected, readings)
  );
}
