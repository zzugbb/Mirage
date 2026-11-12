import { test } from "node:test";
import assert from "node:assert/strict";
import {
  beginSpaceInspection,
  spaceInspectionIncludes,
  spaceRangeLabel,
} from "./space-inspection.ts";
import { devices } from "./installation.ts";
import {
  modelForDevice,
  partsForDevice,
  subpartsForDevice,
} from "./catalog.ts";
import { inspectRackSpace } from "./rack-space.ts";
import { createReview, reviewTransition } from "./review-model.ts";
import { rackUnitSpan } from "./scene/rack-unit-guide.ts";

test("八柜占用检视保留设备完整跨度，逐U相交不扩大为整机占用", () => {
  for (const device of devices) {
    const last = device.startUnit + modelForDevice(device.id).units - 1;
    for (let first = device.startUnit; first <= last; first++) {
      const range = { rackId: device.rackId, first, last: first };
      const visit = beginSpaceInspection(range, device.id)!;
      assert.deepEqual(visit.range, range);
      assert.notEqual(visit.range, range);
      assert.equal(visit.device.first, device.startUnit);
      assert.equal(visit.device.last, last);
      assert.deepEqual(visit.overlap, { first, last: first, units: 1 });
      assert.equal(visit.occupied, 1);
      assert.equal(visit.blanked, 0);
      assert.equal(spaceRangeLabel(visit.overlap), `U${first}`);
    }
  }
  const range = { rackId: "rack-a01", first: 4, last: 8 };
  const result = inspectRackSpace(range)!;
  assert.equal(result.conflicts.length, 2);
  for (const device of result.conflicts) {
    const visit = beginSpaceInspection(range, device.id)!;
    assert.equal(visit.occupied, 2);
    assert.equal(visit.blanked, 3);
    assert.equal(visit.overlap.units, 1);
    assert.equal(spaceRangeLabel(visit.range), "U4–8");
  }
});

test("占用入口拒绝空段、错误机柜、越界、部件和未相交设备", () => {
  for (const range of [
    { rackId: "unknown", first: 3, last: 4 },
    { rackId: "rack-a01", first: 0, last: 4 },
    { rackId: "rack-a01", first: 4, last: 3 },
    { rackId: "rack-a01", first: 3.5, last: 4 },
    { rackId: "rack-a01", first: 3, last: 43 },
    { rackId: "rack-a01", first: 1, last: 2 },
    { rackId: "rack-a05", first: 3, last: 4 },
  ])
    assert.equal(beginSpaceInspection(range, "srv-07"), null);
  for (const id of ["srv-01", "cpu-01", "unknown", "rack-a01"])
    assert.equal(
      beginSpaceInspection({ rackId: "rack-a01", first: 3, last: 4 }, id),
      null,
    );
});

test("四机型检视只延续原柜、整机与所属部件，拒绝串设备身份", () => {
  for (const modelId of new Set(devices.map((d) => d.modelId))) {
    const device = devices.find((d) => d.modelId === modelId)!;
    const visit = beginSpaceInspection(
      {
        rackId: device.rackId,
        first: device.startUnit,
        last: device.startUnit,
      },
      device.id,
    )!;
    for (const id of [device.id, device.rackId])
      assert.equal(spaceInspectionIncludes(visit, id, device.id), true);
    for (const part of [
      ...partsForDevice(device.id),
      ...subpartsForDevice(device.id),
    ]) {
      assert.equal(spaceInspectionIncludes(visit, part.id, device.id), true);
      assert.equal(
        spaceInspectionIncludes(visit, part.id, "other-device"),
        false,
      );
    }
    for (const id of [
      "room-01",
      "cooling-01",
      "unknown",
      ...devices.filter((d) => d.id !== device.id).map((d) => d.id),
    ])
      assert.equal(spaceInspectionIncludes(visit, id, device.id), false);
  }
});

test("四机型从展开内部返回原范围收起结构，保留最新时间与原范围括线", () => {
  for (const modelId of new Set(devices.map((d) => d.modelId))) {
    const device = devices.find((d) => d.modelId === modelId)!;
    const range = {
      rackId: device.rackId,
      first: device.startUnit,
      last: device.startUnit,
    };
    let review = reviewTransition(createReview(), {
      type: "open-resource",
      id: device.id,
    });
    review = reviewTransition(review, {
      type: "scene",
      action: { type: "cover", open: true },
    });
    review = reviewTransition(review, {
      type: "scene",
      action: { type: "explode", amount: 1 },
    });
    review = reviewTransition(review, {
      type: "scene",
      action: { type: "seek", time: 100 },
    });
    const returned = reviewTransition(review, {
      type: "open-resource",
      id: device.rackId,
    });
    assert.equal(returned.scene.level, "rack");
    assert.equal(returned.scene.selected, device.rackId);
    assert.equal(returned.scene.deviceId, device.id);
    assert.equal(returned.scene.explosion, 0);
    assert.equal(returned.scene.coverOpen, false);
    assert.equal(returned.scene.trayExtended, false);
    assert.equal(returned.scene.time, 100);
    assert.equal(
      rackUnitSpan(returned.scene, range)!.label,
      `U${device.startUnit}`,
    );
    assert.equal(
      rackUnitSpan(
        { ...returned.scene, selected: device.id, trayExtended: true },
        range,
      )!.label,
      `U${device.startUnit}`,
    );
    assert.equal(
      rackUnitSpan({ ...returned.scene, level: "device" }, range),
      null,
    );
  }
});
