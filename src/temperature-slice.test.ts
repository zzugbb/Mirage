import { test } from "node:test";
import assert from "node:assert/strict";
import {
  intakeInputs,
  localIntakeTemperature,
  temperatureSlice,
  sliceSettings,
  sliceRackRows,
  slicePoint,
  verticalTemperatureSlice,
  sliceColumns,
  sliceRows,
} from "./temperature-slice.ts";
import type { IntakeInput } from "./temperature-slice.ts";
import { deviceHeight, rackForDevice, racks } from "./installation.ts";
import { Vector3 } from "three";
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

test("垂直切片绑定明确机柜排，按真实前后位置与高度取样，排定义无重复或遗漏", () => {
  const assigned = sliceRackRows.flatMap((row) => row.rackIds);
  assert.equal(new Set(assigned).size, racks.length);
  assert.deepEqual([...assigned].sort(), racks.map((rack) => rack.id).sort());
  const readings = spatialSnapshot(60).readings;
  for (const row of sliceRackRows) {
    const members = racks.filter((rack) => row.rackIds.includes(rack.id));
    assert.equal(new Set(members.map((rack) => rack.position[2])).size, 1);
    const slice = verticalTemperatureSlice(readings, row.id, 0.08);
    assert.equal(slice.orientation, "vertical");
    assert.equal(slice.height, null);
    assert.equal(slice.frame.origin[2], members[0].position[2] + 0.55 + 0.08);
    const lower = slicePoint(slice.frame, 0, 0),
      upper = slicePoint(slice.frame, 1, 1);
    assert.equal(lower[1], 0.2);
    assert.ok(Math.abs(upper[1] - 2.1) < 1e-9);
    assert.equal(lower[2], upper[2]);
    assert.deepEqual(
      [...slice.rackEstimates.keys()].sort(),
      [...row.rackIds].sort(),
    );
    const inputs = intakeInputs(readings).filter((input) =>
      row.rackIds.includes(rackForDevice(input.id).id),
    );
    const expected = localIntakeTemperature(
      inputs,
      slicePoint(slice.frame, 40 / (sliceColumns - 1), 20 / (sliceRows - 1)),
    ).temperature;
    const actual = slice.values[20 * sliceColumns + 40];
    assert.ok(
      expected === null
        ? Number.isNaN(actual)
        : Math.abs(expected - actual) < 1e-5,
    );
  }
});

test("垂直切片只使用所选排，其他排升温不串入，整排无效时保留空白", () => {
  const readings = spatialSnapshot(60).readings;
  const initial = verticalTemperatureSlice(readings, "row-a", 0.08);
  const b = sliceRackRows.find((row) => row.id === "row-b")!;
  for (const input of intakeInputs(readings))
    if (b.rackIds.includes(rackForDevice(input.id).id)) {
      const reading = readings.get(input.id)!;
      readings.set(input.id, {
        ...reading,
        quality: "valid",
        temperature: 100,
      });
    }
  assert.deepEqual(verticalTemperatureSlice(readings, "row-a", 0.08), initial);
  assert.ok(verticalTemperatureSlice(readings, "row-b", 0.08).min! >= 99.9);
  for (const input of intakeInputs(readings))
    if (b.rackIds.includes(rackForDevice(input.id).id)) {
      const reading = readings.get(input.id)!;
      readings.set(input.id, {
        ...reading,
        quality: "offline",
        temperature: null,
      });
    }
  const missing = verticalTemperatureSlice(readings, "row-b", 0.08);
  assert.equal(missing.validInputs, 0);
  assert.equal(missing.totalInputs, 44);
  assert.equal(missing.min, null);
  assert.ok(missing.values.every(Number.isNaN));
  assert.ok(
    [...missing.rackEstimates.values()].every((value) => value === null),
  );
});

test("垂直切片的离柜位置有界，移动和跨时刻回看可重复，不修改输入快照", () => {
  const readings = spatialSnapshot(60).readings,
    original = structuredClone(readings);
  const near = verticalTemperatureSlice(readings, "row-a", 0.08);
  const far = verticalTemperatureSlice(readings, "row-a", 0.9);
  assert.ok(Math.abs(far.frame.origin[2] - near.frame.origin[2] - 0.82) < 1e-9);
  assert.notDeepEqual(far.influence, near.influence);
  const cool = verticalTemperatureSlice(
    spatialSnapshot(0).readings,
    "row-a",
    0.08,
  );
  assert.ok(near.max! > cool.max! + 5);
  assert.deepEqual(verticalTemperatureSlice(readings, "row-a", 0.08), near);
  assert.deepEqual(readings, original);
  assert.equal(verticalTemperatureSlice(readings, "row-a", -1).distance, 0.08);
  assert.equal(verticalTemperatureSlice(readings, "row-a", 5).distance, 0.9);
  assert.equal(
    verticalTemperatureSlice(readings, "未知排", NaN).rowId,
    "row-a",
  );
  assert.equal(verticalTemperatureSlice(readings, "row-a", NaN).distance, 0.08);
});

test("水平和垂直切片的纹理角点与世界采样方向一致，切换时复用 GPU 资源", () => {
  const geometry = new TemperatureSliceGeometry();
  const texture = geometry.texture,
    plane = geometry.plane.geometry;
  const readings = spatialSnapshot(60).readings;
  for (const slice of [
    temperatureSlice(readings, 1.2),
    verticalTemperatureSlice(readings, "row-b", 0.4),
    temperatureSlice(readings, 0.6),
  ]) {
    geometry.update(slice);
    geometry.plane.updateMatrixWorld(true);
    for (const [u, v] of [
      [0, 0],
      [1, 1],
      [0.2, 0.7],
    ]) {
      const world = new Vector3(u - 0.5, v - 0.5, 0).applyMatrix4(
        geometry.plane.matrixWorld,
      );
      assert.ok(
        world.distanceTo(new Vector3(...slicePoint(slice.frame, u, v))) < 1e-6,
      );
    }
    assert.equal(geometry.texture, texture);
    assert.equal(geometry.plane.geometry, plane);
    assert.ok(
      [...geometry.guide.geometry.getAttribute("position").array].every(
        Number.isFinite,
      ),
    );
  }
  geometry.dispose();
});

test("水平切片从本层影响范围内选择最高设备输入，排除无效值，保留零值与并列次序", () => {
  const readings = new Map(spatialSnapshot(60).readings);
  const inputs = intakeInputs(readings);
  const height = sliceSettings.height.initial;
  const nearby = inputs.filter(
    (i) => Math.abs(i.position[1] - height) < sliceSettings.support.y,
  );
  const outside = inputs.find(
    (i) => Math.abs(i.position[1] - height) >= sliceSettings.support.y,
  )!;
  const set = (
    id: string,
    temperature: number | null,
    quality: "valid" | "missing" | "offline" | "stale",
  ) => readings.set(id, { ...readings.get(id)!, temperature, quality });
  for (const { id } of inputs) set(id, null, "missing");
  set(outside.id, 80, "valid");
  set(nearby[0].id, 90, "offline");
  set(nearby[1].id, 91, "stale");
  set(nearby[2].id, Infinity, "valid");
  assert.equal(temperatureSlice(readings, height).highestInput, null);
  const tie = [nearby[3].id, nearby[4].id].sort();
  for (const id of tie) set(id, 0, "valid");
  const slice = temperatureSlice(readings, height);
  assert.equal(slice.validInputs, 2);
  assert.deepEqual(slice.highestInput, { id: tie[0], temperature: 0 });
  set(tie[1], 37, "valid");
  assert.deepEqual(temperatureSlice(readings, height).highestInput, {
    id: tie[1],
    temperature: 37,
  });
});

test("垂直切片的最高输入只来自所选柜排，改变离柜距离只影响插值", () => {
  const readings = new Map(spatialSnapshot(60).readings);
  for (const { id } of intakeInputs(readings))
    readings.set(id, {
      ...readings.get(id)!,
      temperature: null,
      quality: "missing",
    });
  const [a, b] = sliceRackRows;
  const ids = [a, b].map(
    (row) =>
      intakeInputs(readings).find((i) =>
        row.rackIds.includes(rackForDevice(i.id).id),
      )!.id,
  );
  ids.forEach((id, i) =>
    readings.set(id, {
      ...readings.get(id)!,
      temperature: 30 + i,
      quality: "valid",
    }),
  );
  for (const [i, row] of [a, b].entries()) {
    for (const distance of [
      sliceSettings.vertical.distance.min,
      sliceSettings.vertical.distance.max,
    ]) {
      const slice = verticalTemperatureSlice(readings, row.id, distance);
      assert.equal(slice.validInputs, 1);
      assert.deepEqual(slice.highestInput, { id: ids[i], temperature: 30 + i });
    }
  }
});

test("切片覆盖只列本层或本排的缺项，第45秒过期，回看恢复有效输入", () => {
  const reads = (time: number) => spatialSnapshot(time).readings;
  const row = (id: string, time: number) =>
    verticalTemperatureSlice(reads(time), id, 0.08);
  assert.deepEqual(row("row-a", 60).unavailableIds, ["srv-25"]);
  const current = row("row-b", 45);
  assert.deepEqual(current.unavailableIds, ["srv-56", "srv-59", "srv-63"]);
  assert.equal(
    current.validInputs + current.unavailableIds.length,
    current.totalInputs,
  );
  const previous = row("row-b", 44);
  assert.deepEqual(previous.unavailableIds, ["srv-56", "srv-63"]);
  assert.equal(previous.validInputs, current.validInputs + 1);
  const horizontal = temperatureSlice(reads(60), 1.2);
  assert.deepEqual(horizontal.unavailableIds, current.unavailableIds);
  const above = temperatureSlice(reads(60), sliceSettings.height.max);
  assert.ok(!above.unavailableIds.includes("srv-59"));
});
