import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const scene = JSON.parse(
  readFileSync(
    new URL("../assets/public/scenes/room-01.json", import.meta.url),
  ),
);
function readGLB(path) {
  const bytes = readFileSync(new URL(path, import.meta.url));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
}
test("贡献服务器的部件映射完整，节点不能重复归属或依赖名称猜测", () => {
  const model = readGLB("../assets/public/models/server-2u.glb");
  const names = new Set(model.nodes.map((node) => node.name));
  const mapped = new Set();
  for (const part of scene.parts) {
    assert.ok(part.modelNodes.length > 0);
    for (const name of part.modelNodes) {
      assert.ok(names.has(name), name);
      assert.ok(!mapped.has(name));
      mapped.add(name);
    }
  }
  assert.ok(model.meshes.length > 50);
  assert.ok(
    model.accessors
      .filter((a) => a.type === "VEC3")
      .reduce((n, a) => n + a.count, 0) > 10000,
  );
});
test("公开贡献模型不包含外部依赖、原始节点名或导出附加元数据", () => {
  for (const file of ["server-2u", "cooling-unit", "power-cabinet"]) {
    const model = readGLB("../assets/public/models/" + file + ".glb");
    assert.ok(model.buffers.every((b) => !b.uri));
    assert.ok((model.images ?? []).every((image) => !image.uri));
    assert.ok(
      model.nodes.every((node) =>
        /^object_\d+$|^part_[a-z]+_\d+$/.test(node.name),
      ),
    );
    const visit = (value) => {
      if (!value || typeof value !== "object") return;
      assert.ok(!Object.hasOwn(value, "extras"));
      for (const child of Object.values(value)) visit(child);
    };
    visit(model);
  }
});
