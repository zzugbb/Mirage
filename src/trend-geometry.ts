import type { ReviewMetric, ReviewPoint } from "./review-model.ts";
export type TrendMetric =
  ReviewMetric | "cooling" | "ambientTemperature" | "humidity" | "dewPoint";
export const trendMetricNames = {
  temperature: "温度",
  power: "功耗",
  cooling: "冷却输入",
  ambientTemperature: "环境温度",
  humidity: "相对湿度",
  dewPoint: "推导露点",
};
export const trendLeft = 48,
  trendRight = 14;
export const trendTimeAtX = (pixel: number, width: number) =>
  Math.round(
    Math.max(
      0,
      Math.min(
        120,
        ((pixel - trendLeft) / Math.max(1, width - trendLeft - trendRight)) *
          120,
      ),
    ),
  );

/** 只用当前已发生的观测定标，缺失值断线，未来点既不绘制也不参与量程。 */
export function trendGeometry(
  series: ReviewPoint[],
  metric: TrendMetric,
  time: number,
  width: number,
  height: number,
  comparison: ReviewPoint[] = [],
) {
  const points = series.filter((point) => point.time <= time);
  const valid = (point: ReviewPoint) =>
    point.quality === "valid" &&
    point.value !== null &&
    Number.isFinite(point.value);
  const values = [
    ...points,
    ...comparison.filter((point) => point.time <= time),
  ].flatMap((point) => (valid(point) ? [point.value!] : []));
  const lo = values.length ? Math.min(...values) : 0,
    hi = values.length ? Math.max(...values) : 1;
  const celsius = ["temperature", "ambientTemperature", "dewPoint"].includes(
    metric,
  );
  const percent = metric === "cooling" || metric === "humidity";
  const padding = Math.max((hi - lo) * 0.2, celsius ? 2 : hi * 0.04, 1);
  const min = percent ? 0 : Math.max(0, lo - padding),
    max = percent ? 100 : hi + padding;
  const top = 12,
    bottom = height - 22;
  const x = (t: number) =>
    trendLeft + (t / 120) * (width - trendLeft - trendRight);
  const y = (v: number) => bottom - ((v - min) / (max - min)) * (bottom - top);
  let path = "",
    connected = false;
  for (const point of points) {
    if (!valid(point)) {
      connected = false;
      continue;
    }
    path += `${connected ? "L" : "M"}${x(point.time).toFixed(1)},${y(point.value!).toFixed(1)} `;
    connected = true;
  }
  const kilowatts = metric === "power" && hi >= 1000;
  return {
    path,
    x,
    y,
    top,
    bottom,
    empty: !values.length,
    ticks: [min, (min + max) / 2, max],
    unit: percent
      ? metric === "humidity"
        ? "%RH"
        : "%"
      : celsius
        ? "°C"
        : kilowatts
          ? "kW"
          : "W",
    text: (value: number) =>
      kilowatts
        ? (value / 1000).toFixed(1)
        : value.toFixed(celsius || hi < 10 ? 1 : 0),
  };
}
