import type { AppState } from "./domain.ts";
import type { SpatialReading } from "./spatial.ts";
import { devices, racks, deviceHeight, rackForDevice } from "./installation.ts";
import { modelForDevice } from "./catalog.ts";
import type { ReviewLayer } from "./review-model.ts";
export type SpatialMark = {
  id: string;
  kind: "temperature" | "power";
  position: [number, number, number];
  height: number;
  fraction: number | null;
  reading: SpatialReading;
};
/** 色条放在设备的真实 U 位；功耗标尺表达预算占比，不代表告警或供电路径。 */
export function reviewSpatialMarks(
  state: AppState,
  layer: ReviewLayer,
  readings: Map<string, SpatialReading>,
): SpatialMark[] {
  if (
    state.level === "device" ||
    (layer !== "environment" && layer !== "power")
  )
    return [];
  const scoped = racks.filter(
    (r) => state.level === "room" || r.id === rackForDevice(state.deviceId).id,
  );
  if (layer === "environment")
    return devices
      .filter((d) => scoped.some((r) => r.id === d.rackId))
      .map((d) => {
        const r = rackForDevice(d.id),
          reading = readings.get(d.id)!;
        return {
          id: d.id,
          kind: "temperature",
          position: [
            r.position[0] - 0.37,
            deviceHeight(d.id),
            r.position[2] + 0.63,
          ],
          height: modelForDevice(d.id).units * 0.04445 - 0.008,
          fraction:
            reading.quality === "valid" && reading.temperature !== null
              ? Math.max(0, Math.min(1, (reading.temperature - 20) / 25))
              : null,
          reading,
        };
      });
  return scoped.map((r) => {
    const reading = readings.get(r.id)!;
    return {
      id: r.id,
      kind: "power",
      position: [r.position[0] - 0.47, 0.15, r.position[2] + 0.62],
      height: 1.7,
      fraction:
        reading.quality === "valid" &&
        reading.power !== null &&
        reading.budget &&
        reading.budget > 0
          ? Math.max(0, Math.min(1, reading.power / reading.budget))
          : null,
      reading,
    };
  });
}
