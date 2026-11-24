import assert from "node:assert/strict";
import { test } from "node:test";
import { leakDetection, nearbyCooling } from "./leak-detection.ts";
import {
  footprintSegmentGap,
  rectangularFootprint,
  sensingSegmentsToFootprint,
} from "./leak-footprint.ts";
import { leakInspection } from "./leak-view.ts";

const footprint = rectangularFootprint([1, 0, 0.5], [2, 0, 1]);

test("实心投影到感应段的距离涵盖相交、内部、斜向端点和单点", () => {
  for (const [start, end, expected] of [
    [
      { x: -1, z: 0.5 },
      { x: 3, z: 0.5 },
      { x: 1, z: 0.5 },
    ],
    [
      { x: 0.5, z: 0.25 },
      { x: 1, z: 0.75 },
      { x: 0.75, z: 0.5 },
    ],
  ]) {
    assert.deepEqual(footprintSegmentGap(footprint, start, end), {
      from: expected,
      to: expected,
      distance: 0,
    });
  }
  assert.deepEqual(
    footprintSegmentGap(footprint, { x: 3, z: 2 }, { x: 4, z: 4 }),
    { from: { x: 2, z: 1 }, to: { x: 3, z: 2 }, distance: Math.SQRT2 },
  );
  assert.deepEqual(
    footprintSegmentGap(footprint, { x: 1, z: -2 }, { x: 1, z: -2 }),
    { from: { x: 1, z: 0 }, to: { x: 1, z: -2 }, distance: 2 },
  );
});

test("沿投影边缘等距时取距段中点最近的位置，互换起终点结果一致", () => {
  for (const [start, end, expected] of [
    [
      { x: -1, z: 2 },
      { x: 3, z: 2 },
      { x: 1, z: 2 },
    ],
    [
      { x: -4, z: 2 },
      { x: 1, z: 2 },
      { x: 0, z: 2 },
    ],
  ]) {
    const gap = footprintSegmentGap(footprint, start, end);
    assert.equal(gap.distance, 1);
    assert.deepEqual(gap.to, expected);
    assert.deepEqual(footprintSegmentGap(footprint, end, start), gap);
  }
});

test("配置制冷柜到三段感应线的最近点与三维尺寸线一致", () => {
  const measurements = sensingSegmentsToFootprint(
    nearbyCooling.position,
    nearbyCooling.size,
  );
  assert.deepEqual(
    measurements.map(({ segment, distance, fromJoint }) => [
      segment,
      distance.toFixed(3),
      fromJoint.toFixed(3),
    ]),
    [
      [1, "0.375", "0.750"],
      [2, "0.225", "2.175"],
      [3, "0.325", "3.600"],
    ],
  );
  for (const measurement of measurements) {
    const { floor, markers } = leakInspection("floor", {
      segment: measurement.segment - 1,
      fromJoint: measurement.fromJoint,
    });
    assert.ok(floor);
    assert.equal(floor.index, measurement.segment - 1);
    assert.ok(Math.abs(floor.distance - measurement.distance) < 1e-9);
    assert.ok(
      Math.hypot(
        ...floor.point.toArray().map((v, i) => v - measurement.point[i]),
      ) < 1e-9,
    );
    assert.ok(
      Math.hypot(
        floor.edge.x - measurement.edge.x,
        floor.edge.z - measurement.edge.z,
      ) < 1e-9,
    );
    assert.equal(markers[0].objectId, leakDetection.cableId);
    assert.equal(markers[1].objectId, nearbyCooling.id);
  }
});
