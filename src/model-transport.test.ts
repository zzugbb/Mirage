import { test } from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { fetchModelBytes, type ModelTransport } from "./model-transport.ts";

const raw = new ArrayBuffer(32),
  view = new DataView(raw);
view.setUint32(0, 0x46546c67, true);
view.setUint32(4, 2, true);
view.setUint32(8, raw.byteLength, true);
const packed = gzipSync(new Uint8Array(raw));
const asset: ModelTransport = {
  url: "https://example.test/assets/model.glb.gz",
  rawUrl: "https://example.test/assets/model.glb",
  encoding: "gzip",
  byteLength: raw.byteLength,
};

test("原生解包还原 GLB 原字节；服务已解包时不重复处理", async (t) => {
  const calls: string[] = [];
  let automatic = false;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    calls.push(url);
    return new Response(automatic ? raw : packed);
  });
  for (automatic of [false, true]) {
    const result = await fetchModelBytes(asset, new AbortController().signal);
    assert.deepEqual(result.data, raw);
    assert.equal(result.baseUrl, "https://example.test/assets/");
  }
  assert.deepEqual(calls, [asset.url, asset.url]);
});

test("缺少原生能力或不支持 gzip 时只请求原始兼容资源", async (t) => {
  const Native = globalThis.DecompressionStream;
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    calls.push(url);
    return new Response(raw);
  });
  try {
    Object.defineProperty(globalThis, "DecompressionStream", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    assert.deepEqual(
      (await fetchModelBytes(asset, new AbortController().signal)).data,
      raw,
    );
    Object.defineProperty(globalThis, "DecompressionStream", {
      configurable: true,
      writable: true,
      value: class {
        constructor() {
          throw Error("unsupported");
        }
      },
    });
    assert.deepEqual(
      (await fetchModelBytes(asset, new AbortController().signal)).data,
      raw,
    );
    assert.deepEqual(calls, [asset.rawUrl, asset.rawUrl]);
  } finally {
    Object.defineProperty(globalThis, "DecompressionStream", {
      configurable: true,
      writable: true,
      value: Native,
    });
  }
});

test("损坏、截断、HTTP 失败或长度不符明确失败，不静默重下大模型", async (t) => {
  let response = new Response();
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    calls.push(url);
    return response;
  });
  for (response of [
    new Response(packed.subarray(0, 15)),
    new Response("bad"),
    new Response(raw.slice(0, 15)),
    new Response(null, { status: 503 }),
  ])
    await assert.rejects(fetchModelBytes(asset, new AbortController().signal));
  response = new Response(raw);
  await assert.rejects(
    fetchModelBytes({ ...asset, byteLength: 36 }, new AbortController().signal),
    /不完整/,
  );
  assert.ok(calls.every((url) => url === asset.url));
});

test("原始与压缩传输共用中止信号，迟到内容不进入解析", async (t) => {
  const abort = new AbortController();
  t.mock.method(
    globalThis,
    "fetch",
    async (_: string, options: RequestInit) => {
      assert.equal(options.signal, abort.signal);
      abort.abort();
      return new Response(packed);
    },
  );
  await assert.rejects(fetchModelBytes(asset, abort.signal), {
    name: "AbortError",
  });
});
