import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  createExteriorAssembly,
  poseExterior,
} from "./scene/equipment-exterior.ts";
import {
  modelForDevice,
  partsForDevice,
  subpartsForDevice,
  unitLabel,
} from "./catalog.ts";

for (const [modelId, deviceId, imageCount] of [
  ["switch-1u", "sw-01", 4],
  ["storage-4u", "sto-01", 7],
] as const) {
  test(`${modelId} 的外观资产可独立加载，保留贴图比例；内部示意可展开并完整恢复外观`, async () => {
    const bytes = readFileSync(
      new URL(`../assets/public/models/${modelId}.glb`, import.meta.url),
    );
    const json = JSON.parse(
      bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
    );
    assert.equal(json.images.length, imageCount);
    assert.ok(
      json.images.every(
        (image: { uri?: string; bufferView?: number }) =>
          !image.uri && Number.isInteger(image.bufferView),
      ),
    );
    assert.ok(
      !json.extensionsRequired?.includes("KHR_draco_mesh_compression"),
      "运行时不依赖远程解码器",
    );
    assert.ok(
      json.nodes.every((node: { name: string }) =>
        /^object_\d+$/.test(node.name),
      ),
    );
    const source = (
      await new GLTFLoader()
        .register(() => ({
          name: "exterior-texture-test",
          loadTexture: async () => new THREE.Texture(),
        }))
        .parseAsync(
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
          "",
        )
    ).scene;
    const before = new THREE.Box3()
      .setFromObject(source)
      .getSize(new THREE.Vector3());
    const materials: {
      mesh: THREE.Mesh;
      material: THREE.Material | THREE.Material[];
    }[] = [];
    source.traverse((object) => {
      if (object instanceof THREE.Mesh)
        materials.push({ mesh: object, material: object.material });
    });
    const assembly = createExteriorAssembly(modelId, source);
    const { exterior, schematic } = assembly.representations!;
    const after = new THREE.Box3()
      .setFromObject(exterior)
      .getSize(new THREE.Vector3());
    assert.ok(Math.abs(after.x - 0.45) < 1e-6);
    assert.ok(Math.abs(after.y / after.x - before.y / before.x) < 1e-6);
    assert.ok(Math.abs(after.z / after.x - before.z / before.x) < 1e-6);
    assert.ok(
      Math.abs(after.y - modelForDevice(deviceId).units * 0.04445) < 0.002,
    );
    for (const { mesh, material } of materials)
      assert.equal(mesh.material, material);
    assert.ok(exterior.visible && !schematic.visible);
    const expected = [
      ...partsForDevice(deviceId),
      ...subpartsForDevice(deviceId),
    ]
      .map((p) => p.id)
      .sort();
    assert.deepEqual([...assembly.groups.keys()].sort(), expected);
    poseExterior(assembly, 0.8);
    assert.ok(!exterior.visible && schematic.visible);
    poseExterior(assembly, 0);
    assert.ok(exterior.visible && !schematic.visible);
    assert.equal(source.parent, exterior);
    if (modelId === "storage-4u") {
      const positions = subpartsForDevice(deviceId)
        .filter((p) => p.parent === "sto-drives")
        .map((p) => assembly.groups.get(p.id)!.position);
      assert.equal(positions.length, 24);
      assert.equal(new Set(positions.map((p) => p.x)).size, 4);
      assert.equal(new Set(positions.map((p) => p.y)).size, 6);
      assert.equal(unitLabel("sto-01"), "U25–28");
      assert.equal(unitLabel("sto-04"), "U35–38");
      assert.equal(unitLabel("srv-64"), "U33–34");
    }
  });
}
