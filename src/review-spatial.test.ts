import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewSpatialMarks } from "./review-spatial.ts";
import { createReview, reviewTransition } from "./review-model.ts";
import { spatialSnapshot } from "./spatial.ts";
import { devices, deviceHeight } from "./installation.ts";

test("温度色条逐台对应实际 U 位，离线与过期保留缺失而非画成零值", () => {
  const state = createReview().scene,
    readings = spatialSnapshot(60).readings;
  const marks = reviewSpatialMarks(state, "environment", readings);
  assert.equal(marks.length, 84);
  for (const device of devices)
    assert.equal(
      marks.find((m) => m.id === device.id)!.position[1],
      deviceHeight(device.id),
    );
  assert.equal(marks.find((m) => m.id === "srv-25")!.fraction, null);
  assert.equal(marks.find((m) => m.id === "srv-59")!.fraction, null);
  assert.ok(marks.find((m) => m.id === "srv-01")!.fraction! > 0.7);
  const rack = reviewTransition(createReview(), {
    type: "open-resource",
    id: "rack-a08",
  }).scene;
  assert.equal(reviewSpatialMarks(rack, "environment", readings).length, 12);
});
test("功耗标尺只表达已知功耗与预算，保持零值，缺少预算不推断比例", () => {
  const state = createReview().scene,
    readings = spatialSnapshot(60).readings;
  const marks = reviewSpatialMarks(state, "power", readings);
  assert.equal(marks.length, 8);
  for (const mark of marks)
    assert.equal(mark.fraction, mark.reading.power! / mark.reading.budget!);
  const one = readings.get("rack-a01")!;
  readings.set(one.id, { ...one, power: 0 });
  assert.equal(reviewSpatialMarks(state, "power", readings)[0].fraction, 0);
  readings.set(one.id, { ...one, budget: null });
  assert.equal(reviewSpatialMarks(state, "power", readings)[0].fraction, null);
  const inside = reviewTransition(createReview(), {
    type: "shot",
    shot: "assembly",
  }).scene;
  assert.deepEqual(reviewSpatialMarks(inside, "environment", readings), []);
  assert.deepEqual(reviewSpatialMarks(state, "overview", readings), []);
  assert.deepEqual(reviewSpatialMarks(state, "alarms", readings), []);
});

test("空间读数网格复用实例缓冲与材质，拾取标识始终对应设备或机柜", async () => {
  const { ReviewDataGeometry } = await import("./scene/review-data.ts");
  const data = new ReviewDataGeometry(),
    state = createReview().scene;
  const geometry = data.geometry,
    material = data.solid.material;
  data.update(
    reviewSpatialMarks(state, "environment", spatialSnapshot(60).readings),
  );
  assert.equal(data.ghost.count, 84);
  assert.ok(data.solid.userData.instanceEntityIds.includes("srv-25"));
  assert.equal(data.solid.count, data.solid.userData.instanceEntityIds.length);
  data.update(reviewSpatialMarks(state, "power", spatialSnapshot(90).readings));
  assert.equal(data.geometry, geometry);
  assert.equal(data.solid.material, material);
  assert.ok(
    data.solid.userData.instanceEntityIds.every((id: string) =>
      id.startsWith("rack-"),
    ),
  );
  data.update([]);
  assert.equal(data.root.visible, false);
  assert.equal(data.solid.count, 0);
  data.dispose();
  assert.equal(data.root.children.length, 0);
});
