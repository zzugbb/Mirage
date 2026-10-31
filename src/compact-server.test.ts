import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mapCompactServer } from "./scene/compact-server.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";

test("精细 1U 模型保留内嵌贴图和材质，维护部件仍与八内存四盘配置一致", async () => {
  const bytes = readFileSync(
    new URL("../assets/public/models/server-1u.glb", import.meta.url),
  );
  const json = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  assert.equal(json.images.length, 23);
  assert.ok(
    json.images.every(
      (image: { bufferView?: number; uri?: string }) =>
        Number.isInteger(image.bufferView) && !image.uri,
    ),
  );
  assert.ok(
    json.nodes.every((n: { name: string }) =>
      /^(compact_|object_)/.test(n.name),
    ),
  );
  const source =
    // Node 中仅替代图像解码，保留真实 GLB 的纹理绑定；实际解码由浏览器页面验证。
    (
      await new GLTFLoader()
        .register(() => ({
          name: "texture-binding-test",
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
  const wrapper = new THREE.Group();
  const bounds = new THREE.Box3().setFromObject(source),
    size = bounds.getSize(new THREE.Vector3()),
    center = bounds.getCenter(new THREE.Vector3());
  source.scale.setScalar(0.45 / size.x);
  source.position.copy(center).multiplyScalar(-0.45 / size.x);
  wrapper.add(source);
  wrapper.updateMatrixWorld(true);
  const textured: {
    mesh: THREE.Mesh;
    material: THREE.MeshStandardMaterial;
    color: number;
    metalness: number;
    roughness: number;
    map: THREE.Texture;
  }[] = [];
  source.traverse((object) => {
    if (
      object instanceof THREE.Mesh &&
      object.material instanceof THREE.MeshStandardMaterial &&
      object.material.map
    ) {
      textured.push({
        mesh: object,
        material: object.material,
        color: object.material.color.getHex(),
        metalness: object.material.metalness,
        roughness: object.material.roughness,
        map: object.material.map,
      });
    }
  });
  assert.ok(textured.length > 20);
  const assembly = mapCompactServer(wrapper);
  for (const { mesh, material, color, metalness, roughness, map } of textured) {
    assert.equal(mesh.material, material, "适配不能用统一材质替换原材质");
    assert.equal(material.map, map);
    assert.equal(material.color.getHex(), color);
    assert.equal(material.metalness, metalness);
    assert.equal(material.roughness, roughness);
  }
  const expected = [...partsForDevice("srv-08"), ...subpartsForDevice("srv-08")]
    .map((p) => p.id)
    .sort();
  assert.deepEqual([...assembly.groups.keys()].sort(), expected);
  for (const [id, group] of assembly.groups) {
    assert.ok(!new THREE.Box3().setFromObject(group).isEmpty(), id);
    assert.equal(group.userData.entityId, id);
  }
  assert.equal(
    assembly.groups.get("dimm-08")!.parent,
    assembly.groups.get("memory-01"),
  );
  assert.equal(
    assembly.groups.get("fan-04")!.parent,
    assembly.groups.get("fans-01"),
  );
  assert.equal(
    assembly.groups.get("disk-04")!.parent,
    assembly.groups.get("drives-01"),
  );
  const before = new THREE.Box3()
    .setFromObject(assembly.groups.get("dimm-01")!)
    .getCenter(new THREE.Vector3());
  assembly.groups.get("memory-01")!.position.y += 0.2;
  wrapper.updateMatrixWorld(true);
  const after = new THREE.Box3()
    .setFromObject(assembly.groups.get("dimm-01")!)
    .getCenter(new THREE.Vector3());
  assert.ok(Math.abs(after.y - before.y - 0.2) < 1e-8);
});
