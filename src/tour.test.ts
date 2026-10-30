import { test } from "node:test";
import assert from "node:assert/strict";
import { presentationKey } from "./domain.ts";
import { createExperience, experienceTransition, tourSteps } from "./tour.ts";
import type { Experience } from "./tour.ts";
import type { SceneFeedback } from "./mechanics.ts";

const ready = (state: Experience): SceneFeedback => ({
  key: presentationKey(state.scene),
  phase: tourSteps[state.tour.step].phase,
  settled: true,
});
const tick = (
  state: Experience,
  feedback: SceneFeedback | null = ready(state),
  delta = 0.1,
) => experienceTransition(state, { type: "tour-tick", delta, feedback });
const completeStep = (state: Experience) => {
  const revision = state.tour.revision;
  for (let i = 0; i < 100 && state.tour.revision === revision; i++)
    state = tick(state);
  assert.notEqual(state.tour.revision, revision);
  return state;
};

test("巡游默认播放，减少动态效果偏好可从自由探索开始", () => {
  assert.equal(createExperience().tour.mode, "playing");
  assert.equal(createExperience(false).tour.mode, "manual");
});

test("只有当前结构与镜头就绪才计时，旧回调和后台长间隔不能跳段", () => {
  const state = createExperience();
  assert.equal(tick(state, null), state);
  assert.equal(tick(state, { ...ready(state), settled: false }), state);
  assert.equal(tick(state, { ...ready(state), key: "旧姿态" }), state);
  assert.equal(tick(state, { ...ready(state), phase: "opening" }), state);
  assert.equal(tick(state, ready(state), 100).tour.elapsed, 0.25);
  assert.equal(tick(state, ready(state), NaN), state);
  const mid = tick(state);
  assert.equal(tick(mid, { ...ready(mid), settled: false }).tour.elapsed, 0);
});

test("完整巡游循环可重复，归位后关闭柜门，不修改模拟时钟", () => {
  let state = createExperience();
  for (let cycle = 0; cycle < 2; cycle++) {
    for (let step = 0; step < tourSteps.length; step++) {
      assert.equal(state.tour.step, step);
      if (step === 2) assert.equal(state.scene.trayExtended, true);
      if (step === 4) assert.equal(state.scene.explosion, 1);
      if (step === 5) assert.equal(state.scene.selected, "cpu-01");
      if (step === 6) assert.equal(state.scene.explosion, 0);
      if (step === 7) {
        assert.equal(state.scene.doorOpen, false);
        assert.equal(state.scene.trayExtended, false);
      }
      assert.equal(state.scene.time, 0);
      state = completeStep(state);
    }
    assert.equal(state.tour.cycle, cycle + 1);
    assert.equal(state.scene.level, "room");
    assert.equal(state.scene.explosion, 0);
  }
});

test("暂停保留章节和进度，手动接管保留当前场景，重新开始只重置巡游", () => {
  let state = tick(completeStep(createExperience()));
  state = experienceTransition(state, { type: "tour-pause" });
  assert.equal(tick(state), state);
  const paused = state;
  state = experienceTransition(state, { type: "tour-resume" });
  assert.equal(state.tour.elapsed, paused.tour.elapsed);
  assert.equal(state.tour.step, paused.tour.step);
  state = experienceTransition(state, { type: "takeover" });
  assert.equal(state.tour.mode, "manual");
  assert.deepEqual(state.scene, paused.scene);
  state = experienceTransition(state, { type: "simulation-tick" });
  state = experienceTransition(state, { type: "tour-resume" });
  assert.equal(state.tour.step, 0);
  assert.equal(state.scene.time, 1);
  assert.equal(state.scene.level, "room");
});

test("模拟播放与巡游独立，普通业务操作立即接管", () => {
  let state = createExperience();
  state = experienceTransition(state, {
    type: "scene",
    action: { type: "play" },
  });
  assert.equal(state.scene.playing, false);
  assert.equal(state.tour.mode, "playing");
  const next = completeStep(state);
  assert.equal(next.scene.playing, false);
  state = experienceTransition(next, {
    type: "scene",
    action: { type: "tray", extended: true },
  });
  assert.equal(state.tour.mode, "manual");
  assert.equal(state.scene.trayExtended, true);
  const manual = state;
  assert.equal(tick(manual), manual);
});
