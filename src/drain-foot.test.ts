import assert from "node:assert/strict";
import { test } from "node:test";
import { condensate, drainStands } from "./condensate.ts";
import { footSegmentGap, standSensingSegments } from "./drain-foot.ts";
import { leakInspection } from "./leak-view.ts";

test("底板投影按有限矩形量至线段，含交叉、内部、斜向端点和单点", () => {
  const corners = [
    { x: 0, z: 0 },
    { x: 2, z: 0 },
    { x: 2, z: 1 },
    { x: 0, z: 1 },
  ];
  for (const [start, end] of [
    [
      { x: -1, z: 0.5 },
      { x: 3, z: 0.5 },
    ],
    [
      { x: 0.5, z: 0.2 },
      { x: 1, z: 0.7 },
    ],
  ]) {
    assert.equal(footSegmentGap(corners, start, end).distance, 0);
  }
  assert.deepEqual(footSegmentGap(corners, { x: 3, z: 2 }, { x: 4, z: 4 }), {
    from: { x: 2, z: 1 },
    to: { x: 3, z: 2 },
    distance: Math.SQRT2,
  });
  assert.deepEqual(footSegmentGap(corners, { x: 1, z: -2 }, { x: 1, z: -2 }), {
    from: { x: 1, z: 0 },
    to: { x: 1, z: -2 },
    distance: 2,
  });
});

test("两块底板到三段感应线的最近点与三维场景尺寸线共用坐标", () => {
  const expected = [
    [0.615, 0.117, 0.655],
    [0.355, 0.117, 0.915],
  ];
  for (const [i, stand] of drainStands.entries()) {
    for (const s of standSensingSegments(stand)) {
      const { markers, floor } = leakInspection("floor", {
        fromJoint: s.fromJoint,
        segment: s.segment - 1,
        standId: stand.id,
      });
      assert.ok(floor);
      assert.equal(floor.stand?.id, stand.id);
      assert.equal(floor.index, s.segment - 1);
      assert.equal(+floor.distance.toFixed(3), expected[i][floor.index]);
      assert.ok(Math.abs(s.distance - floor.distance) < 1e-9);
      assert.ok(
        Math.hypot(floor.edge.x - s.edge.x, floor.edge.z - s.edge.z) < 1e-9,
      );
      assert.ok(
        Math.hypot(...floor.point.toArray().map((v, k) => v - s.point[k])) <
          1e-9,
      );
      assert.equal(markers[1].objectId, stand.id);
      assert.ok(
        Math.abs(
          floor.footprint[0].distanceTo(floor.footprint[1]) -
            condensate.supports.footSize[0],
        ) < 1e-9,
      );
    }
  }
});

test("改变地面尺寸基准保留测点；指定段的端点与按里程查折点分别归段", () => {
  const [a, b] = drainStands;
  const at = (standId?: string) =>
    leakInspection("floor", { fromJoint: 2.1, standId }).floor!;
  const base = at(),
    up = at(a.id),
    down = at(b.id);
  assert.deepEqual(base.point, up.point);
  assert.deepEqual(up.point, down.point);
  assert.notEqual(up.distance, down.distance);
  assert.equal(base.stand, undefined);
  const end = leakInspection("floor", 0).floor!;
  const station = end.fromJoint + end.length / 2;
  assert.equal(
    leakInspection("floor", { fromJoint: station, segment: 0, standId: a.id })
      .floor!.index,
    0,
  );
  assert.equal(
    leakInspection("floor", { fromJoint: station, standId: a.id }).floor!.index,
    1,
  );
});
