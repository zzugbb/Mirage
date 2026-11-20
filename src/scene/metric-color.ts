import * as THREE from "three";
import type { SpatialReading } from "../spatial.ts";
import { budgetRatio } from "../power-budget.ts";
import { signalFor, signalStyles } from "../status.ts";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
const ramps = definition.rendering.observationColors;
export const temperatureStops = ramps.temperature.map(
  (c) => new THREE.Color(c),
);
export const powerStops = ramps.power.map((c) => new THREE.Color(c));
export function powerColor(ratio: number, target = new THREE.Color()) {
  const x = THREE.MathUtils.clamp(ratio, 0, 1) * 2;
  const i = Math.min(1, Math.floor(x));
  return target.lerpColors(powerStops[i], powerStops[i + 1], x - i);
}
export function temperatureColor(value: number, target = new THREE.Color()) {
  const position = THREE.MathUtils.clamp((value - 20) / 25, 0, 1) * 4;
  const index = Math.min(3, Math.floor(position));
  return target.lerpColors(
    temperatureStops[index],
    temperatureStops[index + 1],
    position - index,
  );
}
/** 连续指标色阶与离散状态分开；过期值用质量色，不能伪装成当前热场。 */
export function observationColor(reading: SpatialReading, mode: string) {
  const color = new THREE.Color(signalStyles[signalFor(reading)].color);
  if (mode !== "temperature" && mode !== "power") return color;
  if (reading.quality !== "valid")
    return color.set(signalStyles[reading.quality].color);
  if (mode === "temperature") {
    return reading.temperature === null
      ? color.set(signalStyles.missing.color)
      : temperatureColor(reading.temperature, color);
  }
  const ratio = budgetRatio(reading.power, reading.budget);
  return ratio === null
    ? color.set(signalStyles.missing.color)
    : powerColor(ratio, color);
}
