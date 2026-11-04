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
export type SliceFrame = {
  origin: [number, number, number];
  u: [number, number, number];
  v: [number, number, number];
};
export type SliceOrientation = "horizontal" | "vertical";
type SlicePlane =
  | { orientation: "horizontal"; height: number; distance: null; rowId: null }
  | { orientation: "vertical"; height: null; distance: number; rowId: string };
export type TemperatureSlice = SlicePlane & {
  frame: SliceFrame;
  values: Float32Array;
  influence: Float32Array;
  rackEstimates: Map<string, number | null>;
  highestInput: { id: string; temperature: number } | null;
  unavailableIds: string[];
  validInputs: number;
  totalInputs: number;
  min: number | null;
  max: number | null;
};
export const sliceRackRows = sliceSettings.vertical.rows;
export const initialSliceControls = () => ({
  orientation: "horizontal" as SliceOrientation,
  height: sliceSettings.height.initial,
  rowId: sliceRackRows[0].id,
  distance: sliceSettings.vertical.distance.initial,
});
export type SliceControls = ReturnType<typeof initialSliceControls>;

export function alignAirflowSlice(
  current: SliceControls,
  rowId: string | null,
): SliceControls {
  return current.orientation === "vertical" && rowId && current.rowId !== rowId
    ? { ...current, rowId }
    : current;
}

/** 纹理坐标与采样、网格和边界共用同一空间基准。 */
export function slicePoint(
  frame: SliceFrame,
  u: number,
  v: number,
): [number, number, number] {
  return [0, 1, 2].map(
    (axis) => frame.origin[axis] + frame.u[axis] * u + frame.v[axis] * v,
  ) as [number, number, number];
}
function sampleSlice(
  inputs: IntakeInput[],
  nearby: IntakeInput[],
  plane: SlicePlane,
  frame: SliceFrame,
): TemperatureSlice {
  const values = new Float32Array(sliceColumns * sliceRows).fill(NaN);
  const influence = new Float32Array(values.length);
  let min = Infinity,
    max = -Infinity;
  for (let row = 0; row < sliceRows; row++)
    for (let col = 0; col < sliceColumns; col++) {
      const point = localIntakeTemperature(
        nearby,
        slicePoint(frame, col / (sliceColumns - 1), row / (sliceRows - 1)),
      );
      const index = row * sliceColumns + col;
      if (point.temperature !== null) {
        values[index] = point.temperature;
        influence[index] = point.influence;
        min = Math.min(min, point.temperature);
        max = Math.max(max, point.temperature);
      }
    }
  const rackEstimates = new Map<string, number | null>();
  for (const rack of racks) {
    const rackInputs = inputs.filter(
      (input) => rackForDevice(input.id).id === rack.id,
    );
    if (!rackInputs.length) continue;
    if (plane.orientation === "horizontal") {
      rackEstimates.set(
        rack.id,
        localIntakeTemperature(inputs, [
          rack.position[0],
          plane.height,
          rack.position[2] +
            definition.rack.size[2] / 2 +
            sliceSettings.frontOffset,
        ]).temperature,
      );
    } else {
      let highest: number | null = null;
      for (let row = 0; row < sliceRows; row++) {
        const y = slicePoint(frame, 0, row / (sliceRows - 1))[1];
        const value = localIntakeTemperature(inputs, [
          rack.position[0],
          y,
          frame.origin[2],
        ]).temperature;
        if (value !== null)
          highest = highest === null ? value : Math.max(highest, value);
      }
      rackEstimates.set(rack.id, highest);
    }
  }
  let highestInput: TemperatureSlice["highestInput"] = null;
  const unavailableIds: string[] = [];
  for (const { id, temperature } of nearby) {
    if (temperature === null) {
      unavailableIds.push(id);
      continue;
    }
    if (
      !highestInput ||
      temperature > highestInput.temperature ||
      (temperature === highestInput.temperature && id < highestInput.id)
    )
      highestInput = { id, temperature };
  }
  return {
    ...plane,
    frame,
    values,
    influence,
    rackEstimates,
    highestInput,
    unavailableIds,
    validInputs: nearby.length - unavailableIds.length,
    totalInputs: nearby.length,
    min: min === Infinity ? null : min,
    max: max === -Infinity ? null : max,
  };
}
export function temperatureSlice(
  readings: Map<string, SpatialReading>,
  requestedHeight: number,
): TemperatureSlice {
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
  return sampleSlice(
    inputs,
    nearby,
    { orientation: "horizontal", height, distance: null, rowId: null },
    {
      origin: [sliceBounds.minX, height, sliceBounds.maxZ],
      u: [sliceBounds.maxX - sliceBounds.minX, 0, 0],
      v: [0, 0, sliceBounds.minZ - sliceBounds.maxZ],
    },
  );
}

export function verticalTemperatureSlice(
  readings: Map<string, SpatialReading>,
  rowId: string,
  requestedDistance: number,
): TemperatureSlice {
  const row = sliceRackRows.find((row) => row.id === rowId) ?? sliceRackRows[0];
  const members = racks.filter((rack) => row.rackIds.includes(rack.id));
  const limits = sliceSettings.vertical.distance;
  const distance = Number.isFinite(requestedDistance)
    ? Math.max(limits.min, Math.min(limits.max, requestedDistance))
    : limits.initial;
  const inputs = intakeInputs(readings).filter((input) =>
    row.rackIds.includes(rackForDevice(input.id).id),
  );
  const minX =
    Math.min(...members.map((rack) => rack.position[0])) -
    sliceSettings.support.x;
  const maxX =
    Math.max(...members.map((rack) => rack.position[0])) +
    sliceSettings.support.x;
  const front = members[0].position[2] + definition.rack.size[2] / 2;
  return sampleSlice(
    inputs,
    inputs,
    { orientation: "vertical", height: null, distance, rowId: row.id },
    {
      origin: [minX, sliceSettings.height.min, front + distance],
      u: [maxX - minX, 0, 0],
      v: [0, sliceSettings.height.max - sliceSettings.height.min, 0],
    },
  );
}
