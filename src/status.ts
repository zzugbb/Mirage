import type { SpatialReading } from "./spatial.ts";
export type Lifecycle = "running" | "maintenance" | "offline" | "stopped";
export type DataQuality = "valid" | "missing" | "stale" | "offline";
export const signalStyles = {
  normal: { label: "正常", icon: "●", color: "#6ed9bc" },
  warning: { label: "预警", icon: "▲", color: "#f4c46c" },
  critical: { label: "严重", icon: "◆", color: "#ff685d" },
  maintenance: { label: "维护", icon: "◇", color: "#8c9ee8" },
  offline: { label: "离线", icon: "⊘", color: "#91aec7" },
  missing: { label: "未配置", icon: "○", color: "#98a3af" },
  stale: { label: "数据过期", icon: "◷", color: "#bea86c" },
  stopped: { label: "停机", icon: "■", color: "#afc1d3" },
  partial: { label: "数据不全", icon: "◐", color: "#abbcc5" },
} as const;
export type Signal = keyof typeof signalStyles;
export const lifecycleNames: Record<Lifecycle, string> = {
  running: "运行",
  maintenance: "维护",
  offline: "离线",
  stopped: "停机",
};
export const qualityNames: Record<DataQuality, string> = {
  valid: "有效",
  missing: "未配置",
  stale: "已过期",
  offline: "离线",
};
/** 告警、生命周期与数据质量保留原字段；此函数只给当前画面选择一个主要标识。 */
export function signalFor(reading: SpatialReading | null | undefined): Signal {
  if (!reading) return "missing";
  if (reading.alarm === 2) return "critical";
  if (reading.alarm === 1) return "warning";
  if (reading.quality === "offline") return "offline";
  if (reading.quality === "missing") return "missing";
  if (reading.quality === "stale") return "stale";
  if (reading.lifecycle === "stopped") return "stopped";
  if (reading.lifecycle === "maintenance") return "maintenance";
  if (reading.count > 1 && reading.coverageTemperature < reading.count)
    return "partial";
  if (reading.count > 1 && reading.lifecycleCounts.maintenance)
    return "maintenance";
  return reading.evaluation === 2
    ? "critical"
    : reading.evaluation === 1
      ? "warning"
      : "normal";
}
export function budgetAttentionStyle(
  reading: SpatialReading | null | undefined,
) {
  if (reading?.quality !== "valid" || !reading.budgetState) return undefined;
  return signalStyles[
    reading.budgetState.level === "over" ? "critical" : "warning"
  ];
}
/** 只强调当前读数自己的判定，柜内异常和部件模型评估由各自的状态表达。 */
export function metricAttentionColor(
  reading: SpatialReading | undefined,
  metric: "temperature" | "power",
) {
  if (!reading || reading.quality !== "valid") return undefined;
  if (metric === "power") return budgetAttentionStyle(reading)?.color;
  return reading.count === 1 && reading.temperature !== null && reading.alarm
    ? signalStyles[reading.alarm === 2 ? "critical" : "warning"].color
    : undefined;
}
export function signalText(reading: SpatialReading | null | undefined) {
  const signal = signalFor(reading);
  return reading?.id.includes("/") &&
    reading.quality === "valid" &&
    reading.evaluation > 0
    ? `模型${signalStyles[signal].label}`
    : signalStyles[signal].label;
}
