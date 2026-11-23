import assert from "node:assert/strict";
import { test } from "node:test";
import { chassisDoorGap } from "./chassis-door-gap.ts";
import { findMaintenanceAisles } from "./maintenance.ts";
import {
  frontServiceInspection,
  frontServiceDevices,
} from "./front-service.ts";
import { rearServiceInspection } from "./rear-service.ts";
import { createReview, reviewTransition } from "./review-model.ts";
import { presentationKey } from "./domain.ts";
import { rackForDevice } from "./installation.ts";

test("四组通道的设备前沿、对侧后门与 PDU 随两种安装位置独立核对", () => {
  for (const aisle of findMaintenanceAisles(""))
    for (const device of frontServiceDevices(aisle.front)) {
      for (const extended of [false, true]) {
        const service = frontServiceInspection(
          aisle.front,
          device.id,
          extended,
        )!;
        for (const [position, mounted, drawn] of [
          ["closed", "2.477", "1.897"],
          ["peak", "2.219", "1.639"],
          ["open", "2.229", "1.650"],
        ] as const)
          for (const side of ["right", "left"] as const) {
            const comparison = chassisDoorGap(service, position, side)!;
            assert.equal(
              comparison.gap.distance.toFixed(3),
              service.offset ? drawn : mounted,
            );
            assert.equal(comparison.gap.from.z, service.frontZ);
            assert.ok(
              comparison.gap.from.x >= comparison.left.x &&
                comparison.gap.from.x <= comparison.right.x,
            );
            assert.equal(comparison.pdu?.rackId, aisle.rear.rackId);
            assert.equal(comparison.pdu?.feed, side === "left" ? "B" : "A");
            assert.deepEqual(
              rearServiceInspection(aisle, comparison.pdu!.id, 1)?.leaf,
              comparison.selected.leaf,
            );
          }
      }
    }
});

test("从柜前定位对柜 PDU 时在原柜收轨关门后才更换机柜", () => {
  for (const extended of [false, true]) {
    let state = reviewTransition(createReview(), {
      type: "locate-installation",
      id: "sto-01",
    });
    state = reviewTransition(state, {
      type: "scene",
      action: { type: "door", open: true },
    });
    if (extended)
      state = reviewTransition(state, {
        type: "scene",
        action: { type: "tray", extended: true },
      });
    state = reviewTransition(state, {
      type: "focus-resource",
      id: "pdu-a03-b",
    });
    assert.equal(state.pendingId, "pdu-a03-b");
    assert.equal(state.scene.deviceId, "sto-01");
    assert.equal(state.scene.trayExtended, false);
    assert.equal(state.scene.doorOpen, false);
    assert.equal(
      reviewTransition(state, { type: "navigation-ready", key: "stale" }),
      state,
    );
    state = reviewTransition(state, {
      type: "navigation-ready",
      key: presentationKey(state.scene),
    });
    assert.equal(state.pendingId, null);
    assert.equal(state.scene.selected, "pdu-a03-b");
    assert.equal(rackForDevice(state.scene.deviceId).name, "A03 机柜");
    assert.equal(state.scene.rearDoorOpen, false);
  }
});
