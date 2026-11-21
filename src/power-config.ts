import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { devices, rackById } from "./installation.ts";
import type { SpatialReading } from "./spatial.ts";

export const powerSettings = definition.installation.powerDistribution;
export type PowerFeed = "A" | "B";
export const pdus = powerSettings.pdus.map((pdu) => ({
  ...pdu,
  feed: pdu.feed as PowerFeed,
}));
export const powerLinks = powerSettings.links.map((link) => ({
  ...link,
  inlet: link.inlet as PowerFeed,
}));
export type PowerLink = (typeof powerLinks)[number];
export const pduById = (id: string) => pdus.find((pdu) => pdu.id === id);
export const pduName = (id: string) => {
  const pdu = pduById(id)!;
  return `${rackById(pdu.rackId)!.name.split(" ")[0]} PDU ${pdu.feed}`;
};
export const isPowerFacility = (id: string) =>
  id === powerSettings.sourceId || !!pduById(id);
export const inletPart = (modelId: string, inlet: PowerFeed) =>
  powerSettings.modelInlets[modelId as keyof typeof powerSettings.modelInlets][
    inlet
  ];
export function powerDeviceIds(id: string) {
  const pdu = pduById(id);
  if (pdu)
    return [
      ...new Set(
        powerLinks
          .filter((link) => link.pduId === id)
          .map((link) => link.deviceId),
      ),
    ];
  if (id === powerSettings.sourceId || id === "room-01")
    return [...new Set(powerLinks.map((link) => link.deviceId))];
  return devices
    .filter((device) => device.rackId === id || device.id === id)
    .map((device) => device.id);
}

/** 只投影关联整机输入，不是设施计量；同一设备经 A/B 关联也仅计一次。 */
export function associatedInputReading(
  id: string,
  readings: Map<string, SpatialReading>,
): SpatialReading | null {
  if (!isPowerFacility(id)) return null;
  const members = powerDeviceIds(id).map((deviceId) => readings.get(deviceId)!);
  const valid = members.filter(
    (reading) =>
      reading.quality === "valid" &&
      reading.power !== null &&
      Number.isFinite(reading.power),
  );
  const lifecycleCounts = {
    running: 0,
    maintenance: 0,
    offline: 0,
    stopped: 0,
  };
  const qualityCounts = { valid: 0, missing: 0, stale: 0, offline: 0 };
  for (const reading of members) {
    lifecycleCounts[reading.lifecycle]++;
    qualityCounts[reading.quality]++;
  }
  return {
    id,
    name: pduById(id) ? pduName(id) : "配电柜",
    lifecycle: "running",
    quality: valid.length ? "valid" : "missing",
    observedAt: valid.length
      ? Math.max(...valid.map((reading) => reading.observedAt ?? 0))
      : null,
    evaluation: 0,
    coverageTemperature: 0,
    coveragePower: valid.length,
    lifecycleCounts,
    qualityCounts,
    temperature: null,
    power: valid.length
      ? valid.reduce((sum, reading) => sum + reading.power!, 0)
      : null,
    budget: null,
    alarm: 0,
    alarmCount: 0,
    count: members.length,
    temperatureLabel: "设施温度 · 未定义",
    powerLabel: "关联整机输入合计",
    source:
      "连接为演示配置；仅汇总关联设备的有效整机输入，A/B 不拆分、不相加。设施、回路及插座未计量，不含上游损耗，不推断独立电源或冗余保障。",
  };
}
