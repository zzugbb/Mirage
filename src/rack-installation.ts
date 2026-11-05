import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { devices, rackById } from "./installation.ts";
import { modelForDevice } from "./catalog.ts";
import { pdus } from "./power-config.ts";
import type { SpatialReading } from "./spatial.ts";
import type { ReviewLayer } from "./review-model.ts";
import { qualityNames, signalText } from "./status.ts";

export type InstallationSegment = {
  id: string;
  kind: "device" | "blanking";
  first: number;
  last: number;
  name: string;
};

/** 正面自上而下的安装分布；空段只表示当前配置的前置盲板。 */
export function rackInstallation(rackId: string) {
  const rack = rackById(rackId);
  if (!rack) return null;
  const units = definition.rack.units;
  const installed = devices.filter((d) => d.rackId === rackId);
  const segments: InstallationSegment[] = [];
  let unit = units;
  while (unit > 0) {
    const device = installed.find(
      (d) =>
        unit >= d.startUnit && unit < d.startUnit + modelForDevice(d.id).units,
    );
    if (device) {
      segments.push({
        id: device.id,
        kind: "device",
        first: device.startUnit,
        last: unit,
        name: device.name,
      });
      unit = device.startUnit - 1;
    } else {
      const last = unit;
      while (
        unit > 0 &&
        !installed.some(
          (d) =>
            unit >= d.startUnit &&
            unit < d.startUnit + modelForDevice(d.id).units,
        )
      )
        unit--;
      segments.push({
        id: `${rackId}:blanking:${unit + 1}`,
        kind: "blanking",
        first: unit + 1,
        last,
        name: "前置盲板",
      });
    }
  }
  const installedUnits = installed.reduce(
    (sum, d) => sum + modelForDevice(d.id).units,
    0,
  );
  return {
    rack,
    units,
    segments,
    installedUnits,
    blankingUnits: units - installedUnits,
    pdus: pdus.filter((p) => p.rackId === rackId),
  };
}

/** 不将过期值伪装成当前读数；有效的停机零功耗仍然显示。 */
export function installationMetric(
  reading: SpatialReading | undefined,
  layer: ReviewLayer,
) {
  if (layer === "overview") return null;
  if (!reading) return { text: "未配置", detail: "未配置设备观测" };
  if (layer === "alarms")
    return {
      text: `${reading.alarm === 2 ? "◆ " : reading.alarm === 1 ? "▲ " : ""}${signalText(reading)}`,
      detail: signalText(reading),
    };
  if (reading.quality !== "valid")
    return {
      text: qualityNames[reading.quality],
      detail:
        reading.quality === "stale"
          ? `数据已过期，最后观测 ${reading.observedAt} 秒，不作为当前读数`
          : `数据${qualityNames[reading.quality]}，没有当前读数`,
    };
  const value = layer === "environment" ? reading.temperature : reading.power;
  if (value === null)
    return {
      text: layer === "environment" ? "无进风值" : "无功耗值",
      detail:
        layer === "environment"
          ? "当前没有有效进风观测"
          : "当前没有有效输入功耗",
    };
  return {
    text:
      layer === "environment"
        ? `${value.toFixed(1)} °C`
        : `${value.toFixed(0)} W`,
    detail:
      layer === "environment" ? "整机进风 · 模拟读数" : "整机输入 · 模拟读数",
  };
}
