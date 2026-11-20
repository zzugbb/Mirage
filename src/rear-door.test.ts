import { test } from "node:test";
import assert from "node:assert/strict";
import { Group } from "three";
import { createState, transition, presentationKey } from "./domain.ts";
import { advanceRearDoor, rearDoorAngle } from "./mechanics.ts";
import { createReview, reviewTransition } from "./review-model.ts";
import { createRackRearDoors } from "./scene/rack-enclosure.ts";
import { StructurePresentation } from "./scene/presentation.ts";
import type { SceneModel } from "./scene/models.ts";
import { devices, rackForDevice } from "./installation.ts";
import { pdus, powerLinks } from "./power-config.ts";

const opened = () =>
  reviewTransition(
    reviewTransition(createReview(), { type: "open-resource", id: "rack-a01" }),
    { type: "scene", action: { type: "rear-door", open: true } },
  );

test("后门姿态独立于前门、导轨、指标与回放，层级和预设不继承其他机柜的展示姿态", () => {
  const room = createState();
  assert.equal(transition(room, { type: "rear-door", open: true }), room);
  const review = opened();
  assert.equal(review.scene.rearDoorOpen, true);
  assert.equal(review.scene.doorOpen, false);
  assert.equal(review.scene.trayExtended, false);
  const key = presentationKey(review.scene);
  for (const layer of ["overview", "environment", "power", "alarms"] as const) {
    let next = reviewTransition(review, { type: "layer", layer });
    next = reviewTransition(next, {
      type: "scene",
      action: { type: "seek", time: 120 },
    });
    assert.equal(next.scene.rearDoorOpen, true);
    assert.equal(presentationKey(next.scene), key);
  }
  const front = transition(review.scene, { type: "door", open: true });
  assert.equal(front.rearDoorOpen, true);
  assert.equal(
    transition(front, { type: "rear-door", open: false }).doorOpen,
    true,
  );
  assert.equal(transition(review.scene, { type: "back" }).rearDoorOpen, false);
  assert.equal(
    transition(review.scene, { type: "navigate", level: "device" })
      .rearDoorOpen,
    false,
  );
  assert.equal(
    reviewTransition(review, { type: "shot", shot: "overview" }).scene
      .rearDoorOpen,
    false,
  );
});

test("跨柜、设施和连接部件定位先等待旧后门合拢，同柜PDU观察保留开门", () => {
  const review = opened();
  const foreign = devices.find((d) => d.rackId === "rack-a05")!;
  for (const target of [
    "rack-a05",
    foreign.id,
    pdus.find((p) => p.rackId === "rack-a05")!.id,
    "cooling-01",
    "room-01",
  ]) {
    const next = reviewTransition(review, {
      type: "focus-resource",
      id: target,
    });
    assert.equal(next.pendingId, target);
    assert.equal(next.scene.deviceId, review.scene.deviceId);
    assert.equal(next.scene.level, "rack");
    assert.equal(next.scene.rearDoorOpen, false);
    assert.equal(next.scene.time, 60);
    assert.equal(
      reviewTransition(next, { type: "navigation-ready", key: "old" }),
      next,
    );
    const ready = reviewTransition(next, {
      type: "navigation-ready",
      key: presentationKey(next.scene),
    });
    assert.equal(ready.pendingId, null);
    assert.equal(ready.selectedId, target);
    assert.equal(ready.scene.rearDoorOpen, false);
  }
  const pdu = pdus.find((p) => p.rackId === "rack-a01")!;
  const same = reviewTransition(review, { type: "focus-resource", id: pdu.id });
  assert.equal(same.scene.rearDoorOpen, true);
  assert.equal(same.pendingId, null);
  const link = powerLinks.find((p) => p.deviceId === foreign.id)!;
  let next = reviewTransition(review, {
    type: "inspect-power-input",
    linkId: link.id,
  });
  assert.equal(next.scene.deviceId, review.scene.deviceId);
  assert.equal(next.scene.rearDoorOpen, false);
  assert.ok(next.pendingEndpoint);
  next = reviewTransition(next, {
    type: "navigation-ready",
    key: presentationKey(next.scene),
  });
  assert.equal(rackForDevice(next.scene.deviceId).id, foreign.rackId);
});

test("后门开合可中断并精确复原，后台零步长和减少动态效果不产生额外位移", () => {
  let pose = 0;
  for (let cycle = 0; cycle < 20; cycle++) {
    for (let i = 0; i < 20; i++) pose = advanceRearDoor(pose, true, 1 / 60);
    assert.ok(pose > 0 && pose < 1);
    assert.equal(advanceRearDoor(pose, true, 0), pose);
    assert.equal(advanceRearDoor(pose, true, NaN), pose);
    for (let i = 0; i < 60; i++) pose = advanceRearDoor(pose, false, 1 / 60);
    assert.equal(pose, 0);
    assert.equal(rearDoorAngle(pose), 0);
  }
  assert.equal(advanceRearDoor(0, true, 0, true), 1);
  assert.equal(advanceRearDoor(1, false, 0, true), 0);
});

test("后门合拢前不进入设备展示台，关闭动作纳入场景就绪；同柜姿态不受时钟影响", () => {
  const models = {
    rack: new Group().add(createRackRearDoors()),
    server: new Group(),
    rackDoor: new Group(),
    bench: new Group(),
    rackSlide: new Group(),
    railMount: new Group(),
  } as unknown as SceneModel;
  const presentation = new StructurePresentation(models);
  const rack = opened().scene;
  presentation.step(rack, 0, true, 0);
  assert.equal(presentation.rearDoor, 1);
  const device = transition(rack, { type: "navigate", level: "device" });
  for (let i = 0; i < 240; i++) {
    const frame = presentation.step(device, 1 / 60, false, 0);
    if (presentation.rearDoor > 0) {
      assert.equal(presentation.pose.inspection, 0);
      assert.equal(frame.phase, "closing-rear");
      assert.equal(frame.busy, true);
    }
  }
  assert.equal(presentation.rearDoor, 0);
  assert.equal(presentation.pose.inspection, 1);
});
