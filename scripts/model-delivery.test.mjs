import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { packModel } from "./model-delivery.ts";
const manifest = JSON.parse(
  readFileSync(new URL("../assets/manifest.json", import.meta.url)),
);

test("压缩传输只处理完整且摘要已登记的 GLB，不接纳未审核修改", () => {
  const raw = Buffer.alloc(16);
  const hash = (b) => createHash("sha256").update(b).digest("hex");
  assert.throws(() => packModel(raw, "wrong"), /摘要/);
  assert.throws(() => packModel(raw, hash(raw)), /完整/);
  raw.writeUInt32LE(0x46546c67);
  raw.writeUInt32LE(2, 4);
  raw.writeUInt32LE(100, 8);
  assert.throws(() => packModel(raw, hash(raw)), /完整/);
});

test("四类压缩副本可逐字节还原，纹理较多的小模型保留原传输", () => {
  const expected = new Set([
    "server-1u.glb",
    "server-2u.glb",
    "cooling-unit.glb",
    "power-cabinet.glb",
  ]);
  for (const record of manifest.assets.filter((r) => r.kind === "model")) {
    const raw = readFileSync(new URL("../" + record.path, import.meta.url));
    const packed = packModel(raw, record.sha256),
      name = record.path.split("/").at(-1);
    assert.equal(!!packed, expected.has(name), name);
    if (!packed) continue;
    assert.deepEqual(gunzipSync(packed.bytes), raw, name);
    assert.equal(packed.decodedSha256, record.sha256);
    assert.equal(packed.decodedByteLength, raw.length);
    assert.ok(packed.byteLength <= raw.length * 0.9);
    assert.deepEqual(
      packModel(raw, record.sha256),
      packed,
      "输出必须确定且不含生成时间",
    );
  }
});

test("构建输出携带压缩和原始路径，分发清单摘要指向实际压缩字节", async () => {
  const { modelDelivery } = await import("./model-delivery.ts");
  const { fileURLToPath } = await import("node:url");
  const root = fileURLToPath(new URL("../", import.meta.url));
  const delivery = modelDelivery(root),
    emitted = [];
  delivery.plugin.configResolved({ command: "build", base: "/" });
  const context = {
    addWatchFile() {},
    emitFile(asset) {
      emitted.push(asset);
      return String(emitted.length);
    },
  };
  const code = delivery.plugin.load.call(
    context,
    root + "assets/public/models/server-1u.glb?packed",
  );
  assert.match(code, /ROLLUP_FILE_URL_1/);
  assert.match(code, /rawUrl/);
  delivery.plugin.generateBundle.call({
    getFileName(id) {
      return "assets/model-" + id + ".gz";
    },
  });
  const transport = delivery.transportFor("assets/public/models/server-1u.glb");
  assert.equal(transport.path, "assets/model-1.gz");
  assert.equal(
    transport.sha256,
    createHash("sha256").update(emitted[0].source).digest("hex"),
  );
  assert.ok(!("bytes" in transport));
  const small = delivery.plugin.load.call(
    context,
    root + "assets/public/models/switch-1u.glb?packed",
  );
  assert.match(small, /encoding:"identity"/);
  assert.equal(emitted.length, 1);
  assert.equal(
    delivery.transportFor("assets/public/models/switch-1u.glb"),
    undefined,
  );
  assert.throws(
    () =>
      delivery.plugin.load.call(
        context,
        root + "assets/public/models/unregistered.glb?packed",
      ),
    /已获准/,
  );
});

test("开发服务在非根路径提供压缩字节，不依赖 Content-Encoding 或额外原模型请求", async () => {
  const { modelDelivery } = await import("./model-delivery.ts");
  const { fileURLToPath } = await import("node:url");
  const root = fileURLToPath(new URL("../", import.meta.url));
  const { plugin } = modelDelivery(root);
  let middleware;
  plugin.configResolved({ command: "serve", base: "/mirage/" });
  plugin.configureServer({
    middlewares: {
      use(fn) {
        middleware = fn;
      },
    },
  });
  const code = plugin.load.call(
    { addWatchFile() {} },
    root + "assets/public/models/power-cabinet.glb?packed",
  );
  const url = JSON.parse(code.match(/url:("[^"]+")/)[1]);
  assert.ok(url.startsWith("/mirage/@mirage-models/"));
  const headers = {},
    response = {
      setHeader(name, value) {
        headers[name] = value;
      },
      end(bytes) {
        this.bytes = bytes;
      },
    };
  middleware({ url, method: "GET" }, response, () =>
    assert.fail("已生成资源不应遗漏"),
  );
  assert.deepEqual(
    gunzipSync(response.bytes),
    readFileSync(root + "assets/public/models/power-cabinet.glb"),
  );
  assert.equal(headers["Content-Type"], "application/gzip");
  assert.equal(headers["Content-Length"], response.bytes.length);
  assert.equal(headers["Content-Encoding"], undefined);
  let next = false;
  middleware(
    { url: "/mirage/@mirage-models/unknown", method: "GET" },
    response,
    () => (next = true),
  );
  assert.ok(next);
});
