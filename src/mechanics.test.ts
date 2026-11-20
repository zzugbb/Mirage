import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceMechanism,
  initialMechanism,
  mechanismPhase,
  mechanismTransform,
} from "./mechanics.ts";
import { createState, transition } from "./domain.ts";

const inspect = { doorOpen: true, trayExtended: true, inspect: true };
const closed = { doorOpen: false, trayExtended: false, inspect: false };

test("开门后才能抽出，抽出后才能进入拆解；返回按反向顺序", () => {
  let pose = initialMechanism();
  let extracted = false;
  let inspecting = false;
  for (let i = 0; i < 240; i++) {
    pose = advanceMechanism(pose, inspect, 1 / 60);
    if (pose.tray > 0) {
      extracted = true;
      assert.equal(pose.door, 1);
    }
    if (pose.inspection > 0) {
      inspecting = true;
      assert.equal(pose.tray, 1);
    }
  }
  assert.ok(extracted && inspecting);
  assert.equal(mechanismPhase(pose, inspect), "device-ready");
  for (let i = 0; i < 240; i++) {
    pose = advanceMechanism(pose, closed, 1 / 60);
    if (pose.inspection > 0) assert.equal(pose.tray, 1);
    if (pose.tray > 0) assert.equal(pose.door, 1);
  }
  assert.deepEqual(pose, initialMechanism());
});
test("动作可中断，反复抽出复原保持原装配位置，减少动态效果直接到最终姿态", () => {
  let pose = initialMechanism();
  for (let cycle = 0; cycle < 20; cycle++) {
    for (let i = 0; i < 80; i++) pose = advanceMechanism(pose, inspect, 1 / 60);
    for (let i = 0; i < 240; i++) pose = advanceMechanism(pose, closed, 1 / 60);
    assert.deepEqual(mechanismTransform(pose), {
      doorAngle: 0,
      trayOffset: 0,
      inspection: 0,
    });
  }
  assert.deepEqual(advanceMechanism(pose, inspect, 0, true), {
    door: 1,
    tray: 1,
    inspection: 1,
  });
});
test("结构命令与层级协调，关门会先请求推回，进入设备自动准备结构", () => {
  let state = transition(createState(), { type: "navigate", level: "rack" });
  assert.equal(state.doorOpen, true);
  assert.equal(state.trayExtended, false);
  state = transition(state, { type: "tray", extended: true });
  assert.equal(state.doorOpen, true);
  state = transition(state, { type: "door", open: false });
  assert.equal(state.trayExtended, false);
  state = transition(state, { type: "navigate", level: "device" });
  assert.equal(state.trayExtended, true);
  assert.equal(transition(state, { type: "door", open: false }), state);
  state = transition(state, { type: "back" });
  assert.equal(state.doorOpen, true);
  assert.equal(state.trayExtended, false);
  state = transition(state, { type: "back" });
  assert.equal(state.doorOpen, false);
});

test("抽出后的设备在安装位和检视位之间连续移动", () => {
  const offsets = [0, 0.25, 0.5, 0.75, 1].map(
    (inspection) =>
      mechanismTransform({ door: 1, tray: 1, inspection }).inspection,
  );
  assert.equal(offsets[0], 0);
  assert.equal(offsets.at(-1), 1);
  for (let i = 1; i < offsets.length; i++)
    assert.ok(offsets[i] > offsets[i - 1]);
});
