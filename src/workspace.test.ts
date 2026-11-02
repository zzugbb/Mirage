import { test } from "node:test";
import assert from "node:assert/strict";
import { workspaceRoute } from "./workspace-route.ts";
import {
  createReview,
  createWorkspace,
  reviewTransition,
} from "./review-model.ts";
import type { ReviewState } from "./review-model.ts";
import { presentationKey } from "./domain.ts";
import { tourSteps } from "./tour.ts";

test("统一工作区为默认入口，评审书签与原型对照入口保留各自启动方式", () => {
  assert.equal(workspaceRoute(""), "workspace");
  assert.equal(workspaceRoute("?foo=bar"), "workspace");
  assert.equal(workspaceRoute("?review"), "review");
  assert.equal(workspaceRoute("?design"), "review");
  assert.equal(workspaceRoute("?prototype&review"), "prototype");
  const main = createWorkspace();
  assert.equal(main.scene.time, 60);
  assert.equal(main.scene.playing, true);
  assert.equal(main.tour.mode, "playing");
  assert.equal(createWorkspace(true).tour.mode, "manual");
  assert.equal(createWorkspace(true).scene.playing, true);
  assert.equal(createReview().scene.playing, false);
  assert.equal(createReview().tour.mode, "manual");
});
const ready = (s: ReviewState) => ({
  key: presentationKey(s.scene),
  phase: tourSteps[s.tour.step].phase,
  settled: true,
});
const tick = (s: ReviewState) =>
  reviewTransition(s, { type: "tour-tick", delta: 0.25, feedback: ready(s) });

test("工作区巡游使用场景就绪信号，完整循环同步对象选择而不重置模拟时钟", () => {
  let s = createWorkspace();
  assert.equal(
    reviewTransition(s, { type: "tour-tick", delta: 0.25, feedback: null }),
    s,
  );
  for (let cycle = 0; cycle < 2; cycle++)
    for (let step = 0; step < tourSteps.length; step++) {
      assert.equal(s.tour.step, step);
      assert.equal(s.selectedId, s.scene.selected);
      if (step === 2) assert.equal(s.selectedId, "srv-01");
      if (step === 4) assert.equal(s.scene.explosion, 1);
      if (step === 5) assert.equal(s.selectedId, "cpu-01");
      const revision = s.tour.revision;
      for (let i = 0; i < 30 && revision === s.tour.revision; i++) s = tick(s);
      assert.notEqual(s.tour.revision, revision);
      assert.equal(s.scene.time, 60);
    }
  assert.equal(s.scene.level, "room");
  assert.equal(s.tour.cycle, 2);
});

test("数据播放与巡游暂停独立；查找、图层和时间分析接管当前姿态", () => {
  let s = tick(createWorkspace());
  s = reviewTransition(s, { type: "scene", action: { type: "play" } });
  assert.equal(s.tour.mode, "playing");
  assert.equal(s.scene.playing, false);
  s = reviewTransition(s, { type: "tour-pause" });
  const paused = s;
  assert.equal(tick(s), s);
  s = reviewTransition(s, { type: "tour-resume" });
  assert.equal(s.tour.elapsed, paused.tour.elapsed);
  assert.equal(s.scene.playing, false);
  for (const action of [
    { type: "pick", id: "srv-59" },
    { type: "layer", layer: "environment" },
    { type: "analysis", value: true },
    { type: "takeover" },
  ] as const) {
    const initial = createWorkspace();
    const manual = reviewTransition(initial, action);
    assert.equal(manual.tour.mode, "manual");
    assert.equal(manual.scene.time, initial.scene.time);
    assert.equal(manual.scene.focusRevision, initial.scene.focusRevision);
  }
  const seek = reviewTransition(createWorkspace(), {
    type: "scene",
    action: { type: "seek", time: 30 },
  });
  assert.equal(seek.tour.mode, "manual");
  assert.equal(seek.scene.time, 30);
});

test("从其他机型开始巡游先归位旧实例，等待反馈后切换到巡游示例设备", () => {
  let s = reviewTransition(createReview(), {
    type: "scene",
    action: { type: "locate", id: "sto-01" },
  });
  s = reviewTransition(s, {
    type: "scene",
    action: { type: "explode", amount: 1 },
  });
  s = reviewTransition(s, { type: "tour-resume" });
  assert.equal(s.pendingTour, true);
  assert.equal(s.scene.deviceId, "sto-01");
  assert.equal(s.scene.explosion, 0);
  assert.equal(s.scene.level, "rack");
  const returning = s;
  assert.equal(
    reviewTransition(s, { type: "navigation-ready", key: "旧姿态" }),
    s,
  );
  s = reviewTransition(s, {
    type: "navigation-ready",
    key: presentationKey(s.scene),
  });
  assert.equal(s.pendingTour, false);
  assert.equal(s.pendingId, null);
  assert.equal(s.scene.deviceId, "srv-01");
  assert.equal(s.scene.level, "room");
  assert.equal(s.scene.time, 60);
  assert.equal(s.tour.mode, "playing");
  const cancelled = reviewTransition(returning, { type: "takeover" });
  assert.equal(cancelled.pendingTour, false);
  assert.equal(cancelled.pendingId, null);
  assert.equal(cancelled.scene.deviceId, "sto-01");
  assert.equal(
    reviewTransition(cancelled, {
      type: "navigation-ready",
      key: presentationKey(cancelled.scene),
    }),
    cancelled,
  );
});
