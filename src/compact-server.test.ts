import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mapCompactServer } from "./scene/compact-server.ts";
import { assemblyChecks } from "./assembly-pairs.ts";
import { assemblyPartPosition } from "./assembly-motion.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import { devices, rackForDevice } from "./installation.ts";
import sceneDefinition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { createState, transition } from "./domain.ts";
import { powerScene } from "./power-paths.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";

test("精细 1U 模型保留内嵌贴图和材质，维护部件仍与八内存四盘配置一致", async (t) => {
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
  const scale = sceneDefinition.server.size[0] / size.x;
  source.scale.setScalar(scale);
  source.position.copy(center).multiplyScalar(-scale);
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
  await t.test(
    "M1 两路封装贴合各自精模的底部接触面，简模与复原坐标一致",
    () => {
      const check = assemblyChecks("srv-44").find(
        (item) => item.tool === "processor-pair",
      )!;
      const fallback = createEquipmentAssembly("server-1u");
      for (const { primary, companion } of check.pairs) {
        const sink = assembly.groups.get(companion.id)!;
        const chip = assembly.groups.get(primary.id)!;
        const bounds = new THREE.Box3().setFromObject(chip);
        const top = bounds.getCenter(new THREE.Vector3());
        top.y = bounds.max.y;
        const above = new THREE.Vector3(0, 1, 0);
        // 中心及接触区四角均应向上命中实物网格的同一底面。
        for (const [dx, dz] of [
          [0, 0],
          [-0.01, -0.014],
          [-0.01, 0.014],
          [0.01, -0.014],
          [0.01, 0.014],
        ]) {
          const ray = new THREE.Raycaster(
            top.clone().add(new THREE.Vector3(dx, -0.001, dz)),
            above,
          );
          const hit = ray.intersectObject(sink)[0];
          assert.ok(
            hit && Math.abs(hit.distance - 0.001) < 1e-6,
            companion.slot,
          );
        }
        const simpleCap = new THREE.Box3().setFromObject(
          fallback.groups.get(primary.id)!,
        );
        const simpleSink = new THREE.Box3().setFromObject(
          fallback.groups.get(companion.id)!,
        );
        assert.ok(
          simpleCap.min.distanceTo(bounds.min) < 1e-7 &&
            simpleCap.max.distanceTo(bounds.max) < 1e-7,
        );
        assert.ok(Math.abs(simpleSink.min.y - top.y) < 1e-7);
        assert.deepEqual(
          assembly.positions.get(primary.id)?.toArray(),
          chip.position.toArray(),
        );
      }
    },
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
  await t.test(
    "M1 两个电源槽与精模、安装简图及供电端点同位，展开全程保持顺序",
    () => {
      const deviceId = "srv-44";
      const check = assemblyChecks(deviceId).find(
        (check) => check.tool === "server-power",
      );
      assert.ok(check);
      const { primary, companion } = check.pairs[0];
      assert.deepEqual([primary.slot, companion.slot], ["PSU-01", "PSU-02"]);
      for (const device of devices)
        assert.equal(
          assemblyChecks(device.id).some((item) => item.tool === check.tool),
          ["server-1u", "server-2u"].includes(device.modelId),
        );
      const fallback = createEquipmentAssembly("server-1u");
      const rack = rackForDevice(deviceId);
      const state = transition(createState(), {
        type: "navigate",
        level: "rack",
        id: deviceId,
      });
      const paths = powerScene(state, deviceId)!.paths;
      for (const [part, feed] of [
        [primary, "A"],
        [companion, "B"],
      ] as const) {
        const endpointX =
          paths.find((path) => path.feed === feed)!.points.at(-1)![0] -
          rack.position[0];
        assert.ok(Math.abs(endpointX - part.position[0]) < 1e-6);
        const imported = assembly.groups.get(part.id)!;
        assert.ok(Math.abs(imported.position.x - endpointX) < 0.001);
        assert.equal(fallback.positions.get(part.id)!.x, part.position[0]);
        const slot = new THREE.Box3().setFromObject(
          fallback.groups.get(part.id)!,
        );
        for (const [id, other] of fallback.groups) {
          if (id === part.id) continue;
          other.traverse((mesh) => {
            if (mesh instanceof THREE.Mesh)
              assert.ok(
                !slot.intersectsBox(new THREE.Box3().setFromObject(mesh, true)),
                id,
              );
          });
        }
      }
      for (const model of [assembly, fallback]) {
        for (const amount of [0, check.startExplosion, 1, 0]) {
          const [a, b] = [primary, companion].map((part) => {
            const group = model.groups.get(part.id)!;
            const position = model.positions.get(part.id)!.toArray();
            group.position.fromArray(
              assemblyPartPosition({ ...part, position }, amount, 1),
            );
            return new THREE.Box3().setFromObject(group);
          });
          assert.ok(b.max.x < a.min.x, "机后观察，输入 B 始终在输入 A 右侧");
        }
      }
    },
  );
});
