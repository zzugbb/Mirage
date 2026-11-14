import { devices, rackForDevice } from "./installation.ts";
import {
  modelForDevice,
  unitLabel,
  partsForDevice,
  subpartsForDevice,
} from "./catalog.ts";
import type { SpatialReading } from "./spatial.ts";

export type AlarmSeverity = "all" | "critical" | "warning";
export type AlarmVisit = { id: string; time: number; severity: 1 | 2 };

/** 只列设备的有效活动告警，不把机柜汇总或部件评估重复计数。 */
export function alarmQueue(
  readings: Map<string, SpatialReading>,
  query = "",
  severity: AlarmSeverity = "all",
) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const all = devices
    .flatMap((device) => {
      const reading = readings.get(device.id);
      if (!reading || reading.quality !== "valid" || !reading.alarm) return [];
      const rack = rackForDevice(device.id);
      const location = `${rack.name} · ${unitLabel(device.id)}`;
      return [{ device, reading, rack, location }];
    })
    .sort(
      (a, b) =>
        b.reading.alarm - a.reading.alarm ||
        a.rack.id.localeCompare(b.rack.id) ||
        a.device.startUnit - b.device.startUnit ||
        a.device.id.localeCompare(b.device.id),
    );
  return {
    all,
    critical: all.filter((row) => row.reading.alarm === 2).length,
    warning: all.filter((row) => row.reading.alarm === 1).length,
    unavailable: devices.filter(
      (device) => readings.get(device.id)?.quality !== "valid",
    ).length,
    rows: all.filter(
      (row) =>
        (severity === "all" ||
          row.reading.alarm === (severity === "critical" ? 2 : 1)) &&
        terms.every((term) => {
          if (/^u\d+$/.test(term)) {
            const unit = Number(term.slice(1));
            return (
              unit >= row.device.startUnit &&
              unit < row.device.startUnit + modelForDevice(row.device.id).units
            );
          }
          return `${row.device.name} ${row.device.id} ${row.location} ${modelForDevice(row.device.id).name}`
            .toLowerCase()
            .includes(term);
        }),
    ),
  };
}

export function alarmVisitIncludes(
  visit: AlarmVisit,
  selected: string,
  deviceId: string,
) {
  return (
    ["room-01", rackForDevice(visit.id).id, visit.id].includes(selected) ||
    (deviceId === visit.id &&
      [...partsForDevice(deviceId), ...subpartsForDevice(deviceId)].some(
        (part) => part.id === selected,
      ))
  );
}

/** 无有效读数不能宣称恢复；返回后仍解释原排查对象。 */
export function alarmCurrentStatus(reading: SpatialReading | undefined) {
  if (!reading || reading.quality === "missing")
    return "读数缺失，不能判定当前告警";
  if (reading.quality === "offline") return "设备离线，不能判定当前告警";
  if (reading.quality === "stale") return "读数过期，不能判定当前告警";
  return reading.alarm === 2
    ? "当前严重告警"
    : reading.alarm === 1
      ? "当前预警"
      : "当前无活动告警";
}
