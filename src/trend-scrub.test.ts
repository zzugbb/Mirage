import { test } from "node:test";
import assert from "node:assert/strict";
import { beginTrendScrub, moveTrendScrub } from "./trend-scrub.ts";
import { trendTimeAtX } from "./trend-geometry.ts";
import { createWorkspace, reviewTransition } from "./review-model.ts";
import { workspacePreset } from "./workspace-presets.ts";

const pointer = (x: number, y = 40, pointerId = 1) => ({
  pointerId,
  clientX: x,
  clientY: y,
});

test("鼠标连续回看逐秒去重，双向拖出图表限制在 0–120 秒，结束位置仍提交", () => {
  let scrub = beginTrendScrub(pointer(100), false, 22);
  assert.equal(scrub.lastTime, 22);
  for (const [x, expected] of [
    [100, null],
    [110, 27],
    [-60, 0],
    [500, 120],
    [200, 66],
  ] as const) {
    const next = moveTrendScrub(scrub, pointer(x), trendTimeAtX(x, 340));
    assert.equal(next.seek, expected);
    scrub = next.scrub;
  }
  assert.equal(moveTrendScrub(scrub, pointer(180), 57, true).seek, 57);
});

test("触摸轻点提交，横向意图成立前不改变时间，纵向滚动一经确认不转成回看", () => {
  const start = beginTrendScrub(pointer(100), true, 20);
  assert.equal(start.lastTime, null);
  assert.equal(moveTrendScrub(start, pointer(103, 42), 21).seek, null);
  assert.equal(moveTrendScrub(start, pointer(103, 42), 21, true).seek, 21);
  const horizontal = moveTrendScrub(start, pointer(120, 43), 30);
  assert.equal(horizontal.seek, 30);
  assert.equal(
    moveTrendScrub(horizontal.scrub, pointer(140, 100), 40).seek,
    40,
  );
  const vertical = moveTrendScrub(start, pointer(102, 52), 21);
  assert.equal(vertical.scrub.phase, "scrolling");
  assert.equal(vertical.seek, null);
  assert.equal(
    moveTrendScrub(vertical.scrub, pointer(180, 52), 57, true).seek,
    null,
  );
});

test("额外触点不改变当前手势、时间或结束位置", () => {
  const start = beginTrendScrub(pointer(100), false, 20);
  const next = moveTrendScrub(start, pointer(180, 40, 2), 57, true);
  assert.equal(next.scrub, start);
  assert.equal(next.seek, null);
});

test("连续回看接管播放与巡游，保留展开设备、镜头修订、选择及图层", () => {
  let state = workspacePreset(createWorkspace(), "structure");
  state = reviewTransition(state, { type: "scene", action: { type: "play" } });
  const before = state.scene;
  assert.equal(before.explosion, 0.8);
  assert.equal(before.playing, true);
  for (const time of [36, 12, 0, 120, 73]) {
    state = reviewTransition(state, {
      type: "scene",
      action: { type: "seek", time },
    });
    assert.equal(state.scene.time, time);
    assert.equal(state.scene.playing, false);
    assert.equal(state.tour.mode, "manual");
    for (const key of [
      "deviceId",
      "selected",
      "level",
      "explosion",
      "coverOpen",
      "doorOpen",
      "trayExtended",
      "focusRevision",
    ] as const)
      assert.equal(state.scene[key], before[key]);
    assert.equal(state.layer, "overview");
  }
});
