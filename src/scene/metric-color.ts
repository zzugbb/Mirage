import * as THREE from "three";
import type { SpatialReading } from "../spatial.ts";
import { signalFor, signalStyles } from "../status.ts";
/** 连续指标色阶与离散状态分开；过期值用质量色，不能伪装成当前热场。 */
export function observationColor(reading: SpatialReading, mode: string) {
  const color = new THREE.Color(signalStyles[signalFor(reading)].color);
  if (reading.quality !== "valid") return color;
  if (mode === "temperature" && reading.temperature !== null) {
    const stops = ["#0a3d7a", "#0f82ab", "#2ebdc7", "#faa330", "#fa3348"];
    const position =
      THREE.MathUtils.clamp((reading.temperature - 20) / 25, 0, 1) * 4;
    const index = Math.min(3, Math.floor(position));
    return color
      .set(stops[index])
      .lerp(new THREE.Color(stops[index + 1]), position - index);
  }
  if (mode === "power" && reading.power !== null && reading.budget) {
    const load = THREE.MathUtils.clamp(reading.power / reading.budget, 0, 1);
    return load < 0.5
      ? color.set("#1a386e").lerp(new THREE.Color("#21abd4"), load * 2)
      : color.set("#21abd4").lerp(new THREE.Color("#fcad3b"), (load - 0.5) * 2);
  }
  return color;
}
