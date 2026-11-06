import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ModelLoading,
  modelAssets,
  type ModelAssetId,
  type ModelLoadState,
} from "./model-loading.ts";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

test("加载结果逐项独立，失败不会覆盖已成功机型；重试仅请求失败项", async () => {
  const calls: ModelAssetId[] = [],
    states: ModelLoadState[] = [];
  let fail = true;
  const loads = new ModelLoading(
    async (id) => {
      calls.push(id);
      if (id === "power-01" && fail) throw Error("failed");
    },
    (state) => states.push(state),
  );
  await loads.start();
  assert.equal(calls.length, 6);
  assert.equal(loads.state["power-01"], "failed");
  assert.equal(loads.state["switch-1u"], "ready");
  assert.equal(
    states[0]["switch-1u"],
    "loading",
    "历史通知为快照，不能被后续状态改写",
  );
  fail = false;
  await loads.retry();
  assert.equal(calls.length, 7);
  assert.equal(calls.at(-1), "power-01");
  assert.ok(Object.values(loads.state).every((s) => s === "ready"));
  await loads.retry();
  await loads.start();
  assert.equal(calls.length, 7);
  loads.dispose();
});

test("多项失败可分别恢复；重试并发互斥且不会重下已就绪模型", async () => {
  let retry = false;
  const wait = deferred(),
    calls: ModelAssetId[] = [];
  const loads = new ModelLoading(
    async (id) => {
      calls.push(id);
      if (id === "server-1u" || id === "server-2u") {
        if (!retry || id === "server-2u") throw Error("failed");
        await wait.promise;
      }
    },
    () => {},
  );
  await loads.start();
  retry = true;
  const first = loads.retry(),
    second = loads.retry();
  wait.resolve();
  await Promise.all([first, second]);
  assert.equal(calls.filter((id) => id === "server-1u").length, 2);
  assert.equal(calls.filter((id) => id === "server-2u").length, 2);
  assert.equal(loads.state["server-1u"], "ready");
  assert.equal(loads.state["server-2u"], "failed");
  loads.dispose();
});

test("超时中止请求并保留可重试状态；销毁取消所有请求且忽略迟到回调", async () => {
  const aborted: ModelAssetId[] = [];
  const loads = new ModelLoading(
    (id, signal) =>
      new Promise((_, reject) =>
        signal.addEventListener(
          "abort",
          () => {
            aborted.push(id);
            reject(Error("aborted"));
          },
          { once: true },
        ),
      ),
    () => {},
    15,
  );
  await loads.start();
  assert.equal(aborted.length, 6);
  assert.ok(Object.values(loads.state).every((s) => s === "failed"));
  loads.dispose();
  const wait = deferred(),
    signals: AbortSignal[] = [],
    updates: ModelLoadState[] = [];
  const closing = new ModelLoading(
    async (_, signal) => {
      signals.push(signal);
      await wait.promise;
    },
    (state) => updates.push(state),
  );
  const started = closing.start(),
    before = updates.length;
  closing.dispose();
  assert.ok(signals.every((s) => s.aborted));
  wait.resolve();
  await started;
  await closing.retry();
  assert.equal(updates.length, before);
  assert.equal(signals.length, modelAssets.length);
});
