import { test } from "node:test";
import assert from "node:assert/strict";
import { RenderDemand } from "./render-demand.ts";
import { SelectionCorners } from "./scene/selection.ts";
import { Vector3 } from "three";

test("静止视图只绘制首帧；数据、模型和画质失效合并为下一帧", () => {
  const demand = new RenderDemand();
  const view = [1, 0, 0, 1];
  assert.equal(demand.consume(view, false), true);
  for (let i = 0; i < 120; i++)
    assert.equal(demand.consume(view, false), false);
  demand.invalidate();
  demand.invalidate();
  assert.equal(demand.consume(view, false), true);
  assert.equal(demand.consume(view, false), false);
});

test("持续动作逐帧绘制，停止后补绘含阴影的终态再休止", () => {
  const demand = new RenderDemand();
  demand.consume([0], false);
  for (let i = 0; i < 30; i++) assert.equal(demand.consume([0], true), true);
  assert.equal(demand.consume([0], false), true);
  assert.equal(demand.consume([0], false), false);
  assert.equal(demand.consume([0], true), true);
});

test("旋转、平移与投影变化刷新；亚像素抖动累计到阈值仍刷新", () => {
  const demand = new RenderDemand();
  demand.consume([1, 0, 0, 1], false);
  assert.equal(demand.consume([1, 5e-11, 0, 1], false), false);
  assert.equal(demand.consume([1, 2e-10, 0, 1], false), true);
  assert.equal(demand.consume([1, 2e-10, 0, 2], false), true);
  demand.invalidate();
  assert.equal(demand.consume([1, 2e-10, 0, 2], false), true);
});

test("选择角标持续绘制完整收拢；回看不重播，减少动态效果立即静止", () => {
  const corners = new SelectionCorners();
  corners.box.set(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
  corners.update("srv-01", 1000, false);
  assert.equal(corners.animating, true);
  corners.update("srv-01", 1239, false);
  assert.equal(corners.animating, true);
  corners.update("srv-01", 1240, false);
  assert.equal(corners.animating, false);
  corners.update("srv-01", 1400, false);
  assert.equal(corners.animating, false);
  corners.update("srv-02", 1400, false);
  assert.equal(corners.animating, true);
  corners.update(null, 1410, false);
  assert.equal(corners.animating, false);
  corners.update("srv-03", 1420, true);
  assert.equal(corners.animating, false);
  corners.geometry.dispose();
  corners.material.dispose();
});
