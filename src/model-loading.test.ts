import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ModelLoading,
  requestedModels,
  modelAssets,
  type ModelAssetId,
  type ModelLoadState,
} from "./model-loading.ts";

const allModels = modelAssets.map(({ id }) => id);

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
  await loads.ensure(allModels);
  assert.equal(calls.length, 6);
  assert.equal(loads.state["power-01"], "failed");
  assert.equal(loads.state["switch-1u"], "ready");
  assert.equal(
    states[0]["switch-1u"],
    "idle",
    "历史通知为快照，不能被后续状态改写",
  );
  fail = false;
  await loads.retry();
  assert.equal(calls.length, 7);
  assert.equal(calls.at(-1), "power-01");
  assert.ok(Object.values(loads.state).every((s) => s === "ready"));
  await loads.retry();
  await loads.ensure(allModels);
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
  await loads.ensure(allModels);
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
  await loads.ensure(allModels);
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
  const started = closing.ensure(allModels),
    before = updates.length;
  closing.dispose();
  assert.ok(signals.every((s) => s.aborted));
  wait.resolve();
  await started;
  await closing.retry();
  assert.equal(updates.length, before);
  assert.equal(signals.length, modelAssets.length);
});

test("机房预览与机柜安装图仅请求两类设施，结构检视按实际机型请求", () => {
  for (const level of ["room", "rack"] as const)
    for (const deviceId of ["srv-01", "srv-59", "sw-01", "sto-01"])
      assert.deepEqual(requestedModels({ level, deviceId }), [
        "cooling-01",
        "power-01",
      ]);
  for (const [deviceId, model] of [
    ["srv-01", "server-2u"],
    ["srv-59", "server-1u"],
    ["sw-01", "switch-1u"],
    ["sto-01", "storage-4u"],
  ])
    assert.deepEqual(requestedModels({ level: "device", deviceId }), [
      "cooling-01",
      "power-01",
      model,
    ]);
});

test("慢设施不阻塞所需设备；重复进入复用在途与已成功请求，失败需明确重试", async () => {
  const slow = deferred(),
    calls: ModelAssetId[] = [];
  const loads = new ModelLoading(
    async (id) => {
      calls.push(id);
      if (id === "cooling-01") await slow.promise;
      if (id === "server-1u") throw Error("failed");
    },
    () => {},
  );
  const room = loads.ensure(
    requestedModels({ level: "room", deviceId: "srv-01" }),
  );
  assert.equal(loads.state["server-2u"], "idle");
  const device = requestedModels({ level: "device", deviceId: "srv-01" });
  await loads.ensure(device);
  assert.equal(loads.state["cooling-01"], "loading");
  assert.equal(loads.state["server-2u"], "ready");
  await loads.ensure(device);
  await loads.ensure(["server-1u"]);
  await loads.ensure(["server-1u"]);
  assert.equal(calls.filter((id) => id === "server-1u").length, 1);
  assert.equal(loads.state["switch-1u"], "idle");
  slow.resolve();
  await room;
  await loads.ensure(device);
  assert.equal(calls.length, 4);
  await loads.retry();
  assert.equal(calls.length, 5);
  assert.equal(calls.at(-1), "server-1u");
  assert.equal(loads.state["storage-4u"], "idle");
  loads.dispose();
  await loads.ensure(["storage-4u"]);
  assert.equal(calls.length, 5);
});
