import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareModel } from "./prepare-model.mjs";

test("移除的贴图原始字节与元数据均不留在输出，保留几何缓冲区", () => {
  const geometry = Buffer.from("GEOMETRY");
  const texture = Buffer.from("REMOVED_LABEL_BYTES");
  const jsonObject = {
    asset: { version: "2.0", generator: "private-export" },
    buffers: [{ byteLength: geometry.length + texture.length }],
    bufferViews: [
      { buffer: 0, byteLength: geometry.length },
      { buffer: 0, byteOffset: geometry.length, byteLength: texture.length },
    ],
    images: [{ bufferView: 1, mimeType: "image/png" }],
    textures: [{ source: 0 }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
    accessors: [{ bufferView: 0 }],
    nodes: [
      {
        name: "private-node",
        extras: { reference: "private-marker" },
        mesh: 0,
      },
    ],
    meshes: [],
    scenes: [{ nodes: [0] }],
  };
  let json = Buffer.from(JSON.stringify(jsonObject));
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
  const input = Buffer.alloc(
    28 + json.length + geometry.length + texture.length,
  );
  input.writeUInt32LE(0x46546c67, 0);
  input.writeUInt32LE(2, 4);
  input.writeUInt32LE(json.length, 12);
  json.copy(input, 20);
  geometry.copy(input, 28 + json.length);
  texture.copy(input, 28 + json.length + geometry.length);
  const output = prepareModel(input, {
    removeImages: [0],
    nodeNames: { 0: "part_cpu_01" },
  });
  assert.ok(output.includes(geometry));
  assert.ok(!output.includes(texture));
  assert.ok(!output.includes(Buffer.from("private-")));
  const result = JSON.parse(
    output.subarray(20, 20 + output.readUInt32LE(12)).toString(),
  );
  assert.equal(result.nodes[0].name, "part_cpu_01");
  assert.equal(result.images.length, 0);
  assert.equal(
    result.materials[0].pbrMetallicRoughness.baseColorTexture,
    undefined,
  );
  assert.equal(result.accessors[0].bufferView, 0);
});
