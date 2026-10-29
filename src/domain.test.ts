import { test } from "node:test";
import assert from "node:assert/strict";
import scene from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  createState,
  transition,
  getPath,
  simulate,
  metricText,
  parts,
  partPosition,
} from "./domain.ts";

test("逐层进入、跨层返回和非法选择保持一致", () => {
  let state = createState();
  assert.equal(state.level, "room");
  state = transition(state, { type: "enter" });
  assert.equal(state.level, "rack");
  assert.equal(state.selected, "rack-a01");
  state = transition(state, { type: "enter" });
  assert.equal(state.level, "device");
  assert.deepEqual(getPath(state), ["room-01", "rack-a01", "srv-01"]);
  assert.equal(
    transition(state, { type: "select", id: "unknown" }).selected,
    state.selected,
  );
  assert.equal(transition(state, { type: "back" }).level, "rack");
  assert.equal(transition(createState(), { type: "back" }).level, "room");
});

test("爆炸比例受限、离开设备后复原，部件不能跨层误选", () => {
  let state = createState();
  assert.equal(transition(state, { type: "explode", amount: 1 }).explosion, 0);
  assert.equal(
    transition(state, { type: "select", id: "cpu-01" }).selected,
    "room-01",
  );
  state = transition(state, { type: "navigate", level: "device" });
  state = transition(state, { type: "explode", amount: 3 });
  assert.equal(state.explosion, 1);
  state = transition(state, { type: "select", id: "cpu-01" });
  assert.equal(state.selected, "cpu-01");
  assert.deepEqual(getPath(state), ["room-01", "rack-a01", "srv-01", "cpu-01"]);
  assert.equal(
    transition(state, { type: "explode", amount: NaN }).explosion,
    1,
  );
  const back = transition(state, { type: "back" });
  assert.equal(back.explosion, 0);
  assert.equal(back.selected, "rack-a01");
});

test("装配从绝对姿态计算，反复展开与复原不累计误差", () => {
  assert.equal(new Set(parts.map((part) => part.id)).size, parts.length);
  for (const part of parts) {
    const original = [...part.position];
    for (let i = 0; i < 100; i++) {
      partPosition(part, 1);
      partPosition(part, 0.42);
      assert.deepEqual(partPosition(part, 0), original);
    }
    assert.deepEqual(part.position, original);
    assert.ok(partPosition(part, 1).every(Number.isFinite));
  }
});

test("服务器安装位置与机柜 U 位及装配节点契约一致", () => {
  const centerUnit = scene.server.startUnit + (scene.server.unitSpan - 1) / 2;
  assert.ok(
    Math.abs(
      scene.server.position[1] -
        (scene.rack.unitOrigin + centerUnit * scene.rack.unitPitch),
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(
      scene.server.size[1] - scene.server.unitSpan * scene.rack.unitPitch,
    ) < 0.001,
  );
  for (const part of parts) {
    assert.equal(part.position.length, 3);
    assert.equal(part.explode.length, 3);
    assert.ok(part.size.every((value) => value > 0));
    assert.ok(part.slot.length > 0);
    assert.ok(part.node.length > 0);
  }
});

test("同一模拟时刻得到相同结果，零值、缺失、离线和过期分开", () => {
  assert.deepEqual(simulate(30), simulate(30));
  assert.equal(simulate(0).source, "simulation");
  assert.equal(metricText({ value: 0, unit: "W", quality: "valid" }), "0 W");
  assert.equal(
    metricText({ value: null, unit: "W", quality: "missing" }),
    "未采集",
  );
  assert.equal(
    metricText({ value: 12, unit: "W", quality: "offline" }),
    "离线",
  );
  assert.equal(
    metricText({ value: 12, unit: "W", quality: "stale" }),
    "已过期",
  );
});

test("模拟默认播放，可暂停且暂停后时钟不推进", () => {
  const state = createState();
  assert.equal(state.playing, true);
  assert.equal(transition(state, { type: "tick" }).time, 1);
  const paused = transition(state, { type: "play" });
  assert.equal(transition(paused, { type: "tick" }).time, paused.time);
});
