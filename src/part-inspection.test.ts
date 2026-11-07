import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { PartIsolation } from "./scene/part-isolation.ts";
import { isolatedPart } from "./part-inspection.ts";
import { createState } from "./domain.ts";
import { devices } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";

test("单部件暂隐保留目标子树与原有隐藏状态，切换和恢复不改变变换或材质", () => {
  const root = new THREE.Group(),
    assembly = new THREE.Group(),
    module = new THREE.Group();
  const child = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial(),
  );
  const sibling = child.clone(),
    hidden = child.clone(),
    other = child.clone();
  hidden.visible = false;
  root.add(assembly, other);
  assembly.add(module, sibling);
  module.add(child, hidden);
  module.position.set(1, 2, 3);
  const matrix = module.matrix.clone(),
    material = child.material;
  const isolation = new PartIsolation();
  assert.equal(isolation.apply(root, module), true);
  assert.equal(other.visible, false);
  assert.equal(sibling.visible, false);
  assert.equal(child.visible, true);
  assert.equal(hidden.visible, false);
  assert.equal(isolation.apply(root, child), true);
  assert.equal(isolation.apply(root, sibling), true);
  assert.equal(module.visible, false);
  assert.equal(sibling.visible, true);
  assert.equal(isolation.apply(root, new THREE.Group()), false);
  assert.equal(module.visible, true);
  assert.equal(other.visible, true);
  assert.equal(hidden.visible, false);
  assert.equal(child.material, material);
  assert.deepEqual(module.matrix, matrix);
  assert.deepEqual(module.position.toArray(), [1, 2, 3]);
  assert.equal(isolation.apply(root, hidden), false);
  assert.equal(isolation.apply(root, undefined), false);
  isolation.restore();
  child.geometry.dispose();
  material.dispose();
});

test("四种配置的所有模块和子件均可独立检视，切换模型后缓存完整恢复", () => {
  const isolation = new PartIsolation();
  const assemblies = ["server-1u", "server-2u", "switch-1u", "storage-4u"].map(
    (id) => createEquipmentAssembly(id),
  );
  for (const assembly of assemblies) {
    const before = new Map<THREE.Object3D, boolean>();
    assembly.root.traverse((object) => before.set(object, object.visible));
    for (const [id, group] of assembly.groups) {
      assert.equal(isolation.apply(assembly.root, group), true, id);
      const visible: THREE.Object3D[] = [];
      assembly.root.traverseVisible((object) => {
        if (object instanceof THREE.Mesh) visible.push(object);
      });
      assert.ok(visible.length > 0, id);
      const allowed = new Set<THREE.Object3D>();
      group.traverse((object) => allowed.add(object));
      assert.ok(
        visible.every((object) => allowed.has(object)),
        id,
      );
    }
    isolation.restore();
    for (const [object, visible] of before)
      assert.equal(object.visible, visible);
  }
});

test("单部件会话保留部分展开、回看和同机部件切换；复原、离开和换机立即结束", () => {
  for (const model of ["server-1u", "server-2u", "switch-1u", "storage-4u"]) {
    const device = devices.find((device) => device.modelId === model)!;
    const state = {
      ...createState(),
      level: "device" as const,
      deviceId: device.id,
      explosion: 0.5,
    };
    for (const part of [
      ...partsForDevice(device.id),
      ...subpartsForDevice(device.id),
    ]) {
      assert.equal(isolatedPart(state, part.id, device.id), part.id);
      assert.equal(
        isolatedPart({ ...state, time: 120 }, part.id, device.id),
        part.id,
      );
      assert.equal(
        isolatedPart({ ...state, explosion: 0 }, part.id, device.id),
        null,
      );
      assert.equal(
        isolatedPart({ ...state, explosion: 0.01 }, part.id, device.id),
        null,
      );
      assert.equal(
        isolatedPart({ ...state, level: "rack" }, part.id, device.id),
        null,
      );
      assert.equal(isolatedPart(state, part.id, "another-device"), null);
    }
    assert.equal(isolatedPart(state, device.id, device.id), null);
    assert.equal(isolatedPart(state, "missing", device.id), null);
    assert.equal(isolatedPart(state, "psu-01", null), null);
  }
});
