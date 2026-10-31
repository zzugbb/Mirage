import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createReview,
  reviewTransition,
  reviewHistory,
  reviewPresentation,
} from "./review-model.ts";
import { spatialSnapshot } from "./spatial.ts";

test("切换指标视图和回看保留选择、聚焦版本与结构姿态", () => {
  let state = reviewTransition(createReview(), {
    type: "shot",
    shot: "assembly",
  });
  state = reviewTransition(state, {
    type: "scene",
    action: { type: "select", id: "memory-01" },
  });
  const before = state.scene;
  for (const layer of ["environment", "power", "overview"] as const) {
    state = reviewTransition(state, { type: "layer", layer });
    assert.equal(state.scene, before);
  }
  state = reviewTransition(state, { type: "analysis", value: true });
  state = reviewTransition(state, {
    type: "scene",
    action: { type: "seek", time: 20 },
  });
  assert.deepEqual(state.scene, { ...before, time: 20, playing: false });
  assert.equal(state.analysis, true);
});

test("对象趋势使用所选层级同口径，过期中断、离线留空、停机零值有效", () => {
  assert.ok(
    reviewHistory("cooling-01", "srv-01", "temperature").every(
      (p) => p.value === null,
    ),
  );
  const history = reviewHistory("room-01", "srv-01", "power");
  for (const t of [0, 44, 45, 60, 120]) {
    const current = spatialSnapshot(t).readings.get("room-01")!;
    assert.equal(history[t].value, current.power);
    assert.equal(history[t].coverage, current.coveragePower);
  }
  assert.equal(reviewHistory("srv-59", "srv-59", "power")[45].value, null);
  assert.equal(
    reviewHistory("srv-25", "srv-25", "temperature")[60].value,
    null,
  );
  const stopped = [...spatialSnapshot(60).readings.values()].find(
    (r) => r.count === 1 && r.lifecycle === "stopped" && !r.id.includes("/"),
  )!;
  assert.equal(reviewHistory(stopped.id, stopped.id, "power")[60].value, 0);
  const part = reviewHistory("memory-01", "srv-01", "temperature")[60];
  assert.equal(
    part.value,
    spatialSnapshot(60).readings.get("memory-01")!.temperature,
  );
});

test("各视图直接确定展示内容和单位，不依赖数据或告警开关", () => {
  for (const level of ["room", "rack", "device"] as const) {
    assert.equal(reviewPresentation("overview", level).mode, "status");
    const environment = reviewPresentation("environment", level);
    assert.equal(environment.mode, "temperature");
    assert.match(environment.title, /°C/);
    assert.match(
      environment.description,
      level === "device" ? /模型表面温度/ : /最高进风值/,
    );
    const power = reviewPresentation("power", level);
    assert.equal(power.mode, "power");
    assert.match(power.title, /预算占比.*%/);
  }
});
