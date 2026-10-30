import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createReview,
  reviewTransition,
  reviewHistory,
} from "./review-model.ts";
import { spatialSnapshot } from "./spatial.ts";
import * as THREE from "three";
import { SpatialSignals } from "./scene/signals.ts";
import type { SceneModel } from "./scene/models.ts";

test("评审中图层、数据与告警独立，回看保留选择、聚焦版本与结构姿态", () => {
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
  state = reviewTransition(state, { type: "alarms", value: false });
  state = reviewTransition(state, { type: "data", value: false });
  state = reviewTransition(state, { type: "analysis", value: true });
  state = reviewTransition(state, {
    type: "scene",
    action: { type: "seek", time: 20 },
  });
  assert.deepEqual(state.scene, { ...before, time: 20, playing: false });
  assert.equal(state.alarms, false);
  assert.equal(state.data, false);
});

test("对象趋势使用所选层级同口径，过期中断、离线留空、停机零值有效", () => {
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

test("关闭告警叠加会移除状态告警轮廓，但保留温度和功耗的数值标记", () => {
  const state = createReview().scene;
  const signals = new SpatialSignals();
  const readings = spatialSnapshot(60).readings;
  const models = {
    server: new THREE.Group(),
    parts: new Map(),
  } as unknown as SceneModel;
  const mark = signals.rackMarks.find((mark) => mark.id === "rack-a01")!;
  signals.update(state, "status", readings, models, 0, 0, 0, true);
  assert.equal(mark.root.visible, true);
  signals.alarmsVisible = false;
  signals.update(state, "status", readings, models, 0, 0, 0, true);
  assert.equal(mark.root.visible, false);
  for (const mode of ["temperature", "power"]) {
    signals.update(state, mode, readings, models, 0, 0, 0, true);
    assert.equal(mark.root.visible, true);
  }
  signals.root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
  });
});
