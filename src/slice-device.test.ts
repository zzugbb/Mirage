import { test } from "node:test";
import assert from "node:assert/strict";
import { devices } from "./installation.ts";
import { spatialSnapshot } from "./spatial.ts";
import {
  initialSliceControls,
  temperatureSlice,
  verticalTemperatureSlice,
  sliceSettings,
} from "./temperature-slice.ts";
import { sliceDeviceContext } from "./slice-device.ts";

test("84 台设备的切片对齐使用安装位置和滑杆步长，不改变其他控制", () => {
  const readings = spatialSnapshot(60).readings;
  for (const device of devices) {
    const controls = initialSliceControls();
    const context = sliceDeviceContext(
      device.id,
      controls,
      temperatureSlice(readings, controls.height),
      readings,
    )!;
    assert.ok(
      Math.abs(context.target.height - context.height) <=
        sliceSettings.height.step / 2,
    );
    assert.equal(context.target.distance, controls.distance);
    assert.equal(context.target.rowId, controls.rowId);
    const aligned = sliceDeviceContext(
      device.id,
      context.target,
      temperatureSlice(readings, context.target.height),
      readings,
    )!;
    assert.equal(aligned.aligned, true);
    assert.equal(
      aligned.temperature,
      readings.get(device.id)!.quality === "valid"
        ? readings.get(device.id)!.temperature
        : null,
    );
    assert.equal(
      sliceDeviceContext(
        "room-01",
        controls,
        temperatureSlice(readings, controls.height),
        readings,
      ),
      null,
    );
  }
});

test("B 排设备不借用 A 排切面读数，对齐后按本排柜前位置估计", () => {
  const readings = spatialSnapshot(60).readings;
  const controls = {
    ...initialSliceControls(),
    orientation: "vertical" as const,
    distance: 0.9,
  };
  const context = sliceDeviceContext(
    "sto-01",
    controls,
    verticalTemperatureSlice(readings, controls.rowId, controls.distance),
    readings,
  )!;
  assert.equal(context.estimate, null);
  assert.match(context.explanation, /不在当前柜排/);
  assert.equal(context.target.rowId, "row-b");
  const aligned = sliceDeviceContext(
    "sto-01",
    context.target,
    verticalTemperatureSlice(
      readings,
      context.target.rowId,
      context.target.distance,
    ),
    readings,
  )!;
  assert.equal(aligned.aligned, true);
  assert.ok(aligned.estimate !== null);
  assert.ok(Math.abs(aligned.estimate - aligned.temperature!) < 0.01);
});

test("切片对照保留过期、离线、缺失和停机边界，回看恢复有效读数", () => {
  const controls = {
    ...initialSliceControls(),
    orientation: "vertical" as const,
    rowId: "row-b",
  };
  const readings = spatialSnapshot(60).readings;
  for (const [id, reason] of [
    ["srv-59", /过期/],
    ["srv-56", /未配置/],
    ["srv-63", /停机/],
  ] as const) {
    const context = sliceDeviceContext(
      id,
      controls,
      verticalTemperatureSlice(readings, controls.rowId, controls.distance),
      readings,
    )!;
    assert.equal(context.temperature, null);
    assert.equal(context.estimate, null);
    assert.match(context.unavailable, reason);
  }
  const earlier = spatialSnapshot(30).readings;
  assert.notEqual(
    sliceDeviceContext(
      "srv-59",
      controls,
      verticalTemperatureSlice(earlier, controls.rowId, controls.distance),
      earlier,
    )!.temperature,
    null,
  );
  const a = { ...controls, rowId: "row-a" };
  assert.match(
    sliceDeviceContext(
      "srv-25",
      a,
      verticalTemperatureSlice(readings, a.rowId, a.distance),
      readings,
    )!.unavailable,
    /离线/,
  );
});
