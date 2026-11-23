import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aisleDoorPose,
  doorBaselineGap,
  opposedDoorGap,
} from "./aisle-door-gap.ts";
import { aisleDoorSweeps, doorTip } from "./door-sweep.ts";
import { findMaintenanceAisles } from "./maintenance.ts";
import { rearServiceInspection } from "./rear-service.ts";
import { pdus } from "./power-config.ts";

const p = (x: number, z: number) => ({ x, z });

test("门扇有限线段量取覆盖端点、垂足、交叉、重合和零长投影", () => {
  assert.deepEqual(doorBaselineGap([p(0, 0), p(1, 0)], [p(2, 1), p(2, 2)]), {
    from: p(1, 0),
    to: p(2, 1),
    distance: Math.SQRT2,
  });
  assert.deepEqual(doorBaselineGap([p(0, 0), p(4, 0)], [p(2, 1), p(3, 2)]), {
    from: p(2, 0),
    to: p(2, 1),
    distance: 1,
  });
  assert.equal(
    doorBaselineGap([p(0, 0), p(4, 4)], [p(0, 4), p(4, 0)]).distance,
    0,
  );
  assert.equal(
    doorBaselineGap([p(0, 0), p(4, 0)], [p(2, 0), p(6, 0)]).distance,
    0,
  );
  assert.equal(
    doorBaselineGap([p(1, 0), p(1, 0)], [p(0, 1), p(2, 1)]).distance,
    1,
  );
});

test("四组通道逐侧核对五种门位与铰轴旁的 PDU", () => {
  const rows = findMaintenanceAisles("");
  assert.equal(rows.length, 4);
  for (const aisle of rows) {
    const sweeps = aisleDoorSweeps(aisle);
    const combinations = [
      ["closed", 0, 0, 2.462, 2.462],
      ["peak", 90, 90, 1.634, 1.723],
      ["open", 105, 105, 1.666, 1.828],
      ["front-open", 105, 0, 1.919, 1.96],
      ["rear-open", 0, 105, 2.213, 2.213],
    ] as const;
    for (const [
      position,
      frontAngle,
      rearAngle,
      rightDistance,
      leftDistance,
    ] of combinations) {
      assert.deepEqual(
        sweeps.map((s) => aisleDoorPose(s, position).angle),
        [frontAngle, rearAngle],
      );
      for (const side of ["left", "right"] as const) {
        const gap = opposedDoorGap(sweeps, position, side)!;
        assert.equal(
          +gap.distance.toFixed(3),
          side === "left" ? leftDistance : rightDistance,
        );
        const pdu = pdus.find(
          (p) =>
            p.rackId === aisle.rear.rackId &&
            p.feed === (side === "left" ? "B" : "A"),
        )!;
        assert.deepEqual(
          gap.leaf,
          rearServiceInspection(aisle, pdu.id, 3)!.leaf,
        );
        for (const [leaf, angle, point] of [
          [sweeps[0].leaves[0], frontAngle, gap.from],
          [gap.leaf, rearAngle, gap.to],
        ] as const) {
          const tip = doorTip(leaf, angle);
          assert.ok(
            Math.abs(
              Math.hypot(point.x - leaf.hingeX, point.z - leaf.hingeZ) +
                Math.hypot(point.x - tip.x, point.z - tip.z) -
                leaf.reach,
            ) < 1e-9,
          );
        }
      }
    }
    assert.equal(opposedDoorGap([sweeps[1]], "peak", "left"), null);
  }
});
