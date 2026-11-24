import assert from "node:assert/strict";
import { test } from "node:test";
import { condensate, drainStands } from "./condensate.ts";
import { standSensingSegments } from "./drain-foot.ts";
import { leakInspection } from "./leak-view.ts";

test("两块底板到三段感应线的最近点与三维场景尺寸线共用坐标", () => {
  const expected = [
    [0.615, 0.117, 0.655],
    [0.355, 0.117, 0.915],
  ];
  const stations = [
    [1.383, 2.195, 3.043],
    [1.383, 1.935, 3.043],
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
      assert.equal(+floor.fromJoint.toFixed(3), stations[i][floor.index]);
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
