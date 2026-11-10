import { test } from "node:test";
import assert from "node:assert/strict";
import { SceneLoop } from "./scene-loop.ts";

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
    cancel: (id: number) => {
      frames.delete(id);
    },
    tick: (time: number) => {
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(time);
    },
  };
}

test("静止不预约帧，多次唤醒合并，单次更新后再次休止", () => {
  const scheduler = clock();
  let count = 0;
  const loop = new SceneLoop(
    () => {
      count++;
      return false;
    },
    scheduler.request,
    scheduler.cancel,
  );
  assert.equal(scheduler.frames.size, 0);
  loop.wake();
  loop.wake();
  loop.wake();
  assert.equal(scheduler.frames.size, 1);
  scheduler.tick(100);
  assert.equal(count, 1);
  assert.equal(scheduler.frames.size, 0);
  scheduler.tick(200);
  assert.equal(count, 1);
  loop.wake();
  scheduler.tick(1000);
  assert.equal(count, 2);
});

test("持续动作保留后续帧，终态完成后停止，休止时长不计入新动作", () => {
  const scheduler = clock(),
    deltas: number[] = [];
  const loop = new SceneLoop(
    (_, delta) => {
      deltas.push(delta);
      return deltas.length < 3;
    },
    scheduler.request,
    scheduler.cancel,
  );
  loop.wake();
  scheduler.tick(100);
  scheduler.tick(120);
  scheduler.tick(140);
  assert.deepEqual(deltas, [0.016, 0.02, 0.02]);
  assert.equal(scheduler.frames.size, 0);
  loop.wake();
  scheduler.tick(10000);
  assert.equal(deltas[3], 0.016);
});

test("帧内资源到达的唤醒不丢失，也不形成并行帧链", () => {
  const scheduler = clock();
  let count = 0;
  const loop = new SceneLoop(
    () => {
      count++;
      if (count === 1) {
        loop.wake();
        loop.wake();
      }
      return count < 2;
    },
    scheduler.request,
    scheduler.cancel,
  );
  loop.wake();
  scheduler.tick(100);
  assert.equal(scheduler.frames.size, 1);
  scheduler.tick(120);
  assert.equal(count, 2);
  assert.equal(scheduler.frames.size, 0);
});

test("隐藏或上下文丢失取消预约，后台通知不唤醒，恢复只预约一次", () => {
  const scheduler = clock(),
    deltas: number[] = [];
  const loop = new SceneLoop(
    (_, delta) => {
      deltas.push(delta);
      return true;
    },
    scheduler.request,
    scheduler.cancel,
  );
  loop.wake();
  scheduler.tick(100);
  const late = [...scheduler.frames.values()][0];
  loop.setEnabled(false);
  loop.wake();
  late(150);
  scheduler.tick(200);
  assert.deepEqual(deltas, [0.016]);
  assert.equal(scheduler.frames.size, 0);
  loop.setEnabled(true);
  loop.setEnabled(true);
  loop.wake();
  assert.equal(scheduler.frames.size, 1);
  late(9999);
  assert.equal(scheduler.frames.size, 1);
  assert.deepEqual(deltas, [0.016]);
  scheduler.tick(10000);
  assert.deepEqual(deltas, [0.016, 0.016]);
  loop.dispose();
});

test("卸载取消所有后续动作，即使帧内卸载或迟到通知也不复活", () => {
  const scheduler = clock();
  let count = 0;
  const loop = new SceneLoop(
    () => {
      count++;
      loop.dispose();
      return true;
    },
    scheduler.request,
    scheduler.cancel,
  );
  loop.wake();
  scheduler.tick(100);
  loop.wake();
  loop.setEnabled(true);
  scheduler.tick(120);
  assert.equal(count, 1);
  assert.equal(scheduler.frames.size, 0);
});

test("活动期间长帧限制推进量，异常逆序时间不倒退机构", () => {
  const scheduler = clock(),
    deltas: number[] = [];
  const loop = new SceneLoop(
    (_, delta) => {
      deltas.push(delta);
      return true;
    },
    scheduler.request,
    scheduler.cancel,
  );
  loop.wake();
  scheduler.tick(100);
  scheduler.tick(1000);
  scheduler.tick(999);
  assert.deepEqual(deltas, [0.016, 0.05, 0]);
  loop.dispose();
});
