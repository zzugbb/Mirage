import { test } from "node:test";
import assert from "node:assert/strict";
import {
  intakeInputs,
  localIntakeTemperature,
  temperatureSlice,
  sliceSettings,
} from "./temperature-slice.ts";
import type { IntakeInput } from "./temperature-slice.ts";
import { deviceHeight, rackForDevice } from "./installation.ts";
import { spatialSnapshot } from "./spatial.ts";
import { TemperatureSliceGeometry } from "./scene/temperature-slice.ts";
import { temperatureColor, observationColor } from "./scene/metric-color.ts";

test("切片代表位置对应实际机柜正面和U位，不使用部件表面温度或汇总替代输入", () => {
  const readings = spatialSnapshot(60).readings;
  const inputs = intakeInputs(readings);
  assert.equal(inputs.length, 84);
  for (const point of inputs) {
    assert.equal(point.position[0], rackForDevice(point.id).position[0]);
    assert.equal(point.position[1], deviceHeight(point.id));
    assert.ok(point.position[2] > rackForDevice(point.id).position[2] + 0.55);
    assert.equal(
      point.temperature,
      readings.get(point.id)!.quality === "valid"
        ? readings.get(point.id)!.temperature
        : null,
    );
  }
  assert.equal(inputs.find((p) => p.id === "srv-25")!.temperature, null);
  assert.equal(inputs.find((p) => p.id === "srv-59")!.temperature, null);
});
const input = (x: number, temperature: number | null): IntakeInput => ({
  id: String(x),
  position: [x, 1, 1],
  front: 0.9,
  temperature,
});
test("局部插值保留输入值、有效零值和数值范围，不穿过柜体或外推到整间机房", () => {
  const inputs = [input(0, 0), input(0.4, 40)];
  assert.equal(localIntakeTemperature(inputs, [0, 1, 1]).temperature, 0);
  assert.equal(localIntakeTemperature(inputs, [0.4, 1, 1]).temperature, 40);
  assert.ok(
    Math.abs(localIntakeTemperature(inputs, [0.2, 1, 1]).temperature! - 20) <
      1e-9,
  );
  for (const point of [
    [0, 1, 0.89],
    [0, 1, 3],
    [0, 2, 1],
    [5, 1, 1],
  ])
    assert.equal(localIntakeTemperature(inputs, point).temperature, null);
});
test("最近位置无效时留空，不用邻近设备覆盖过期、离线或未配置的位置", () => {
  const inputs = [input(0, null), input(0.4, 30)];
  assert.equal(localIntakeTemperature(inputs, [0, 1, 1]).temperature, null);
  assert.equal(localIntakeTemperature(inputs, [0.1, 1, 1]).temperature, null);
  assert.equal(localIntakeTemperature(inputs, [0.35, 1, 1]).temperature, 30);
  const readings = spatialSnapshot(60).readings;
  for (const reading of readings.values())
    readings.set(reading.id, {
      ...reading,
      quality: "missing",
      temperature: null,
    });
  const empty = temperatureSlice(readings, 1.2);
  assert.equal(empty.min, null);
  assert.equal(empty.max, null);
  assert.equal(empty.validInputs, 0);
  assert.ok(empty.values.every(Number.isNaN));
});
test("切片只依赖当前时间和高度，任意顺序回看结果一致且不修改原始读数", () => {
  const warmReadings = spatialSnapshot(60).readings;
  const original = structuredClone(warmReadings);
  const warm = temperatureSlice(warmReadings, 1.2);
  const cool = temperatureSlice(spatialSnapshot(0).readings, 1.2);
  assert.ok(warm.max! > cool.max! + 5);
  assert.deepEqual(temperatureSlice(spatialSnapshot(60).readings, 1.2), warm);
  assert.deepEqual(warmReadings, original);
  const upper = temperatureSlice(warmReadings, 1.9);
  assert.notDeepEqual(upper.values, warm.values);
  assert.notEqual(upper.totalInputs, warm.totalInputs);
  assert.equal(
    temperatureSlice(warmReadings, -10).height,
    sliceSettings.height.min,
  );
  assert.equal(
    temperatureSlice(warmReadings, 20).height,
    sliceSettings.height.max,
  );
  assert.equal(
    temperatureSlice(warmReadings, NaN).height,
    sliceSettings.height.initial,
  );
  const point = intakeInputs(spatialSnapshot(44).readings).find(
    (p) => p.id === "srv-59",
  )!;
  assert.notEqual(point.temperature, null);
  assert.equal(
    intakeInputs(spatialSnapshot(45).readings).find((p) => p.id === "srv-59")!
      .temperature,
    null,
  );
});
test("切片和设备色条共用指标色阶，热色不依赖告警等级", () => {
  const reading = spatialSnapshot(60).readings.get("srv-01")!;
  for (const alarm of [0, 1, 2] as const)
    assert.ok(
      observationColor({ ...reading, alarm }, "temperature").equals(
        temperatureColor(reading.temperature!),
      ),
    );
});
test("切片复用纹理与几何、保留空白透明像素，不遮挡对象拾取并完整释放资源", () => {
  const mesh = new TemperatureSliceGeometry();
  const texture = mesh.texture,
    geometry = mesh.plane.geometry;
  const guideDistances = mesh.guide.geometry.getAttribute("lineDistance");
  const data = temperatureSlice(spatialSnapshot(60).readings, 1.2);
  mesh.update(data);
  assert.equal(mesh.root.visible, true);
  assert.equal(mesh.plane.position.y, 1.2);
  let known = 0,
    blank = 0;
  for (let i = 0; i < data.values.length; i++) {
    if (Number.isNaN(data.values[i])) {
      assert.equal(mesh.pixels[i * 4 + 3], 0);
      blank++;
    } else if (mesh.pixels[i * 4 + 3] > 0) known++;
  }
  assert.ok(known > 100);
  assert.ok(blank > 100);
  mesh.update(temperatureSlice(spatialSnapshot(0).readings, 1.8));
  assert.equal(mesh.texture, texture);
  assert.equal(mesh.plane.geometry, geometry);
  assert.equal(
    mesh.guide.geometry.getAttribute("lineDistance"),
    guideDistances,
  );
  assert.equal(mesh.plane.position.y, 1.8);
  const intersections: unknown[] = [];
  mesh.plane.raycast({} as never, intersections as never);
  assert.deepEqual(intersections, []);
  let disposed = 0;
  for (const resource of [
    mesh.texture,
    mesh.plane.geometry,
    mesh.plane.material,
    mesh.guide.geometry,
    mesh.guide.material,
  ])
    resource.addEventListener("dispose", () => disposed++);
  mesh.update(null);
  assert.equal(mesh.root.visible, false);
  mesh.dispose();
  assert.equal(disposed, 5);
  assert.equal(mesh.root.children.length, 0);
});
