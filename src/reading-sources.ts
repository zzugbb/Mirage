import {
  devices,
  deviceById,
  rackById,
  rackForDevice,
} from "./installation.ts";
import { unitLabel } from "./catalog.ts";
import { coolingDeviceIds, isCoolingSource } from "./cooling.ts";
import { isPowerFacility, powerDeviceIds } from "./power-config.ts";
import { lifecycleNames } from "./status.ts";
import type { SpatialReading } from "./spatial.ts";

export type SourceMetric = "temperature" | "power";
export type SourceCheck = {
  sourceId: string;
  metric: SourceMetric;
  group: "included" | "excluded";
  query: string;
};
export function sourceMetrics(id: string): SourceMetric[] {
  if (id === "room-01" || rackById(id)) return ["temperature", "power"];
  if (isPowerFacility(id)) return ["power"];
  if (isCoolingSource(id)) return ["temperature"];
  return [];
}
export const sourceValue = (value: number | null, metric: SourceMetric) =>
  value === null
    ? "—"
    : `${value.toFixed(1)} ${metric === "temperature" ? "°C" : "W"}`;

/** 汇总只追溯整机输入；设施关系按设备去重，不包含部件分项或 A/B 拆分。 */
export function readingSources(
  id: string,
  metric: SourceMetric,
  readings: Map<string, SpatialReading>,
) {
  if (!sourceMetrics(id).includes(metric)) return null;
  const ids =
    id === "room-01"
      ? devices.map((d) => d.id)
      : rackById(id)
        ? devices.filter((d) => d.rackId === id).map((d) => d.id)
        : isCoolingSource(id)
          ? coolingDeviceIds(id)
          : powerDeviceIds(id);
  const rows = [...new Set(ids)].map((deviceId) => {
    const device = deviceById(deviceId)!,
      reading = readings.get(deviceId),
      value = reading?.[metric] ?? null;
    const included =
      reading?.quality === "valid" && value !== null && Number.isFinite(value);
    const reason = included
      ? metric === "power" && value === 0
        ? "有效零值"
        : "有效输入"
      : !reading || reading.quality === "missing"
        ? "未配置观测"
        : reading.quality === "offline"
          ? "设备离线"
          : reading.quality === "stale"
            ? "数据过期"
            : metric === "temperature" && reading.lifecycle === "stopped"
              ? "停机 · 无进风值"
              : metric === "temperature"
                ? "无有效进风值"
                : "无有效功耗值";
    const last =
      reading?.quality === "stale" && reading.observedAt !== null
        ? `最后观测 ${reading.observedAt} 秒${value !== null && Number.isFinite(value) ? ` · ${sourceValue(value, metric)}` : ""}，未计入当前汇总`
        : reading
          ? `运行状态：${lifecycleNames[reading.lifecycle]}`
          : "没有设备观测";
    return {
      id: deviceId,
      name: device.name,
      rack: rackForDevice(deviceId).name,
      location: `${rackForDevice(deviceId).name} / ${unitLabel(deviceId)}`,
      included,
      value: included ? value : null,
      reason,
      detail: last,
    };
  });
  rows.sort(
    (a, b) =>
      Number(b.included) - Number(a.included) ||
      (a.included && b.included ? b.value! - a.value! : 0) ||
      a.id.localeCompare(b.id),
  );
  const included = rows.filter((r) => r.included);
  return {
    sourceId: id,
    metric,
    rows,
    count: rows.length,
    coverage: included.length,
    excluded: rows.length - included.length,
    zeroCount: included.filter((r) => r.value === 0).length,
    value: !included.length
      ? null
      : metric === "temperature"
        ? included[0].value
        : included.reduce((sum, r) => sum + r.value!, 0),
  };
}
export type ReadingSources = NonNullable<ReturnType<typeof readingSources>>;
export function matchingSourceRows(
  sources: ReadingSources,
  check: Pick<SourceCheck, "group" | "query">,
) {
  const normalize = (s: string) => s.toLowerCase().replace(/[\s\-_–]/g, "");
  const terms = check.query.trim().split(/\s+/).filter(Boolean).map(normalize);
  return sources.rows.filter(
    (r) =>
      r.included === (check.group === "included") &&
      terms.every((term) =>
        normalize(`${r.id} ${r.name} ${r.rack}`).includes(term),
      ),
  );
}
