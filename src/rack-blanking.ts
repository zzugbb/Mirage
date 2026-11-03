import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { devices, rackById } from "./installation.ts";
import { modelForDevice } from "./catalog.ts";

/** 当前演示约定：本柜未安装设备的 U 位用 1U 盲板封闭，不代表可分配容量。 */
export function rackBlankingUnits(rackId: string): number[] {
  if (!rackById(rackId)) return [];
  const installed = devices.filter((device) => device.rackId === rackId);
  return Array.from({ length: definition.rack.units }, (_, i) => i + 1).filter(
    (unit) =>
      !installed.some(
        (device) =>
          unit >= device.startUnit &&
          unit < device.startUnit + modelForDevice(device.id).units,
      ),
  );
}
export function unitRanges(units: number[]): string {
  const sorted = [...new Set(units)].sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    ranges.push(start === sorted[i] ? `U${start}` : `U${start}–${sorted[i]}`);
  }
  return ranges.join("、");
}
