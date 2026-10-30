import { deviceById } from "./installation.ts";
import { simulate } from "./simulation.ts";
/** 进风温度共用固定尺度；功耗按设备的初始模型值设定固定截断轴，不随拖动缩放。 */
export function trendScale(
  metric: "temperature" | "power",
  deviceId = "srv-01",
) {
  if (metric === "temperature")
    return {
      domain: [20, 45],
      ticks: [20, 33, 38],
      caption: "虚线：33 °C 预警 / 38 °C 严重",
    };
  if (deviceById(deviceId)?.lifecycle === "stopped")
    return {
      domain: [0, 20],
      ticks: [0, 10, 20],
      caption: "整机输入功耗；纵轴 0–20 W",
    };
  const initial = simulate(0, 0, deviceId).power;
  const domain = [
    Math.max(0, Math.floor((initial - 6) / 10) * 10),
    Math.ceil((initial + 18) / 10) * 10,
  ];
  return {
    domain,
    ticks: [domain[0], (domain[0] + domain[1]) / 2, domain[1]],
    caption: `整机输入功耗；纵轴 ${domain[0]}–${domain[1]} W`,
  };
}
