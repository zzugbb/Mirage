import { test } from "node:test";
import assert from "node:assert/strict";
import { FrameTask } from "./frame-task.ts";
import { AnchorProjection } from "./anchor-projection.ts";

function clock() {
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  return {
    frames,
    request: (callback: FrameRequestCallback) => {
      const next = id++;
      frames.set(next, callback);
      return next;
    },
    cancel: (frame: number) => {
      frames.delete(frame);
    },
    tick: () => {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(0));
    },
  };
}

test("静止时不安排布局，多项控件变化合并为下一帧一次布局", () => {
  const scheduler = clock();
  let count = 0;
  const task = new FrameTask(
    () => count++,
    scheduler.request,
    scheduler.cancel,
  );
  scheduler.tick();
  assert.equal(count, 0);
  task.invalidate();
  task.invalidate();
  task.invalidate();
  assert.equal(scheduler.frames.size, 1);
  scheduler.tick();
  assert.equal(count, 1);
  scheduler.tick();
  assert.equal(count, 1);
});

test("投影完成立即布局并取消旧预约，不留下下一帧重复布局", () => {
  const scheduler = clock();
  let count = 0;
  const task = new FrameTask(
    () => count++,
    scheduler.request,
    scheduler.cancel,
  );
  task.invalidate();
  task.flush();
  assert.equal(count, 1);
  assert.equal(scheduler.frames.size, 0);
  scheduler.tick();
  assert.equal(count, 1);
  task.flush();
  assert.equal(count, 2);
});

test("布局过程中的新失效保留到下一帧，销毁后迟到通知不再运行", () => {
  const scheduler = clock();
  let count = 0;
  const task = new FrameTask(
    () => {
      count++;
      if (count === 1) task.invalidate();
    },
    scheduler.request,
    scheduler.cancel,
  );
  task.invalidate();
  scheduler.tick();
  assert.equal(count, 1);
  assert.equal(scheduler.frames.size, 1);
  const late = [...scheduler.frames.values()][0];
  task.dispose();
  late(0);
  task.invalidate();
  task.flush();
  scheduler.tick();
  assert.equal(count, 1);
  assert.equal(scheduler.frames.size, 0);
});

test("投影忽略亚像素尾差，累计移动和可见性变化仍提交", () => {
  const projections = new AnchorProjection(),
    label = {};
  assert.deepEqual(projections.update(label, 20, 30, false), {
    x: 20,
    y: 30,
    hidden: false,
  });
  assert.equal(projections.update(label, 20.000001, 30.000001, false), null);
  assert.deepEqual(projections.update(label, 20.01, 30, false), {
    x: 20.01,
    y: 30,
    hidden: false,
  });
  assert.deepEqual(projections.update(label, 20.01, 30, true), {
    x: 20.01,
    y: 30,
    hidden: true,
  });
  assert.equal(projections.update(label, 20.01, 30, true), null);
  assert.equal(projections.update(label, 20.01, 30, false)?.hidden, false);
});

test("同身份的新标签重新投影，无效坐标隐藏且恢复后重新出现", () => {
  const projections = new AnchorProjection(),
    first = {},
    replacement = {};
  projections.update(first, 20, 30, false);
  assert.ok(projections.update(replacement, 20, 30, false));
  assert.deepEqual(projections.update(first, NaN, Infinity, false), {
    x: 0,
    y: 0,
    hidden: true,
  });
  assert.equal(projections.update(first, NaN, Infinity, false), null);
  assert.equal(projections.update(first, 20, 30, false)?.hidden, false);
});
