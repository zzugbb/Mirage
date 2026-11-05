import { deviceById, deviceHeight, rackForDevice } from "./installation.ts";
import { unitLabel } from "./catalog.ts";
import { qualityNames } from "./status.ts";
import type { SpatialReading } from "./spatial.ts";
import {
  intakeInputs,
  localIntakeTemperature,
  sliceRackRows,
  sliceSettings,
  type SliceControls,
  type TemperatureSlice,
} from "./temperature-slice.ts";

function nearestStep(
  value: number,
  limits: { min: number; max: number; step: number },
) {
  return Math.max(
    limits.min,
    Math.min(
      limits.max,
      Number(
        (
          limits.min +
          Math.round((value - limits.min) / limits.step) * limits.step
        ).toFixed(6),
      ),
    ),
  );
}

/** 对照的是所查机柜前方切面位置，不是新增环境测点。 */
export function sliceDeviceContext(
  id: string,
  controls: SliceControls,
  slice: TemperatureSlice,
  readings: Map<string, SpatialReading>,
) {
  const device = deviceById(id);
  if (!device) return null;
  const rack = rackForDevice(id);
  const row = sliceRackRows.find((row) => row.rackIds.includes(rack.id));
  if (!row) return null;
  const input = intakeInputs(readings).find((input) => input.id === id)!;
  const reading = readings.get(id);
  const target =
    controls.orientation === "horizontal"
      ? {
          ...controls,
          height: nearestStep(deviceHeight(id), sliceSettings.height),
        }
      : {
          ...controls,
          rowId: row.id,
          distance: nearestStep(
            sliceSettings.frontOffset,
            sliceSettings.vertical.distance,
          ),
        };
  const otherRow = slice.orientation === "vertical" && slice.rowId !== row.id;
  const point =
    slice.orientation === "horizontal"
      ? [input.position[0], slice.height, input.position[2]]
      : [input.position[0], input.position[1], input.front + slice.distance];
  const inputs = intakeInputs(readings).filter(
    (item) =>
      slice.orientation === "horizontal" ||
      sliceRackRows
        .find((row) => row.id === slice.rowId)!
        .rackIds.includes(rackForDevice(item.id).id),
  );
  const estimate = otherRow
    ? null
    : localIntakeTemperature(inputs, point).temperature;
  const unavailable =
    reading?.quality === "stale"
      ? `已过期 · 最后观测 ${reading.observedAt} 秒`
      : reading?.quality !== "valid"
        ? qualityNames[reading?.quality ?? "missing"]
        : reading.lifecycle === "stopped"
          ? "停机 · 无进风读数"
          : "无进风读数";
  const near =
    slice.orientation === "horizontal"
      ? Math.abs(input.position[1] - slice.height) < sliceSettings.support.y
      : !otherRow &&
        Math.abs(slice.distance - sliceSettings.frontOffset) <
          sliceSettings.support.z;
  return {
    name: device.name,
    location: `${rack.name} / ${unitLabel(id)}`,
    height: deviceHeight(id),
    temperature: input.temperature,
    unavailable,
    estimate,
    explanation: otherRow
      ? `所查设备属于${row.name}，不在当前柜排切面。`
      : !near
        ? "当前切面不在该设备进风代表位置的插值范围内。"
        : input.temperature === null
          ? "该设备没有当前有效进风输入，不参与估计；切面估计只能来自其他有效输入。"
          : estimate === null
            ? "柜前位置没有有效估计；邻近无效输入也会保留局部空缺。"
            : "切面估计综合附近有效输入，不等于所查设备的独立测点。",
    target,
    aligned:
      controls.orientation === "horizontal"
        ? controls.height === target.height
        : controls.rowId === target.rowId &&
          controls.distance === target.distance,
  };
}
