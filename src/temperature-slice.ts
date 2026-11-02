import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { devices, racks, rackForDevice, deviceHeight } from "./installation.ts";
import type { SpatialReading } from "./spatial.ts";

export const sliceSettings = definition.temperatureSlice;
export type IntakeInput = {
  id: string;
  position: [number, number, number];
  front: number;
  temperature: number | null;
};
/** 代表位置来自安装定义；所有温度继续来自同一时间快照，不新增环境测点。 */
export function intakeInputs(
  readings: Map<string, SpatialReading>,
): IntakeInput[] {
  return devices.map((device) => {
    const rack = rackForDevice(device.id);
    const front = rack.position[2] + definition.rack.size[2] / 2;
    const reading = readings.get(device.id);
    return {
      id: device.id,
      position: [
        rack.position[0],
        deviceHeight(device.id),
        front + sliceSettings.frontOffset,
      ],
      front,
      temperature:
        reading?.quality === "valid" && Number.isFinite(reading.temperature)
          ? reading.temperature
          : null,
    };
  });
}

/** 紧支撑、各向异性反距离插值；不越过柜体正面，不跨空白补值。
 * 最近代表位置无效时保留局部空缺，避免用邻居把离线/过期涂成正常。
 */
export function localIntakeTemperature(
  inputs: IntakeInput[],
  position: number[],
) {
  const support = sliceSettings.support;
  let nearest = Infinity,
    nearestValid = false,
    weighted = 0,
    weights = 0;
  for (const input of inputs) {
    const [x, y, z] = input.position;
    if (position[2] < input.front) continue;
    const d2 =
      ((position[0] - x) / support.x) ** 2 +
      ((position[1] - y) / support.y) ** 2 +
      ((position[2] - z) / support.z) ** 2;
    if (d2 >= 1) continue;
    if (d2 < nearest) {
      nearest = d2;
      nearestValid = input.temperature !== null;
    }
    if (d2 < 1e-12)
      return {
        temperature: input.temperature,
        influence: input.temperature === null ? 0 : 1,
      };
    if (input.temperature === null) continue;
    const weight = (1 - d2) ** 2 / d2;
    weighted += weight * input.temperature;
    weights += weight;
  }
  return {
    temperature: nearestValid && weights > 0 ? weighted / weights : null,
    influence: nearestValid && weights > 0 ? 1 - nearest : 0,
  };
}

const xs = racks.map((rack) => rack.position[0]);
const fronts = racks.map(
  (rack) => rack.position[2] + definition.rack.size[2] / 2,
);
export const sliceBounds = {
  minX: Math.min(...xs) - sliceSettings.support.x,
  maxX: Math.max(...xs) + sliceSettings.support.x,
  minZ: Math.min(...fronts),
  maxZ:
    Math.max(...fronts) + sliceSettings.frontOffset + sliceSettings.support.z,
};
export const sliceColumns =
  Math.ceil((sliceBounds.maxX - sliceBounds.minX) / sliceSettings.cellSize) + 1;
export const sliceRows =
  Math.ceil((sliceBounds.maxZ - sliceBounds.minZ) / sliceSettings.cellSize) + 1;
export type TemperatureSlice = ReturnType<typeof temperatureSlice>;
export function temperatureSlice(
  readings: Map<string, SpatialReading>,
  requestedHeight: number,
) {
  const height = Number.isFinite(requestedHeight)
    ? Math.max(
        sliceSettings.height.min,
        Math.min(sliceSettings.height.max, requestedHeight),
      )
    : sliceSettings.height.initial;
  const inputs = intakeInputs(readings);
  const nearby = inputs.filter(
    (input) => Math.abs(input.position[1] - height) < sliceSettings.support.y,
  );
  const values = new Float32Array(sliceColumns * sliceRows).fill(NaN);
  const influence = new Float32Array(values.length);
  let min = Infinity,
    max = -Infinity;
  for (let row = 0; row < sliceRows; row++)
    for (let col = 0; col < sliceColumns; col++) {
      // PlaneGeometry 的 v=0 对应旋转后的 +Z 边，纹理与世界坐标保持同向。
      const z =
        sliceBounds.maxZ -
        (row / (sliceRows - 1)) * (sliceBounds.maxZ - sliceBounds.minZ);
      const x =
        sliceBounds.minX +
        (col / (sliceColumns - 1)) * (sliceBounds.maxX - sliceBounds.minX);
      const point = localIntakeTemperature(nearby, [x, height, z]);
      const index = row * sliceColumns + col;
      if (point.temperature !== null) {
        values[index] = point.temperature;
        influence[index] = point.influence;
        min = Math.min(min, point.temperature);
        max = Math.max(max, point.temperature);
      }
    }
  return {
    height,
    values,
    influence,
    rackEstimates: new Map(
      racks.map((rack) => [
        rack.id,
        localIntakeTemperature(inputs, [
          rack.position[0],
          height,
          rack.position[2] +
            definition.rack.size[2] / 2 +
            sliceSettings.frontOffset,
        ]).temperature,
      ]),
    ),
    validInputs: nearby.filter((input) => input.temperature !== null).length,
    totalInputs: nearby.length,
    min: min === Infinity ? null : min,
    max: max === -Infinity ? null : max,
  };
}
