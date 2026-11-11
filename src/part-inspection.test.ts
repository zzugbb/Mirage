import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { PartIsolation } from "./scene/part-isolation.ts";
import { isolatedPart, partInspectionSequence } from "./part-inspection.ts";
import { createReview, reviewTransition } from "./review-model.ts";
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

test("逐项检视只遍历当前机型同级配置，子件返回所属模块且首尾不循环", () => {
  for (const model of ["server-1u", "server-2u", "switch-1u", "storage-4u"]) {
    const device = devices.find((item) => item.modelId === model)!;
    const modules = partsForDevice(device.id),
      children = subpartsForDevice(device.id);
    for (const part of [...modules, ...children]) {
      const sequence = partInspectionSequence(device.id, part.id)!;
      const parent = children.find((item) => item.id === part.id)?.parent;
      const siblings = parent
        ? children.filter((item) => item.parent === parent)
        : modules;
      assert.deepEqual(sequence.siblings, siblings);
      assert.equal(sequence.parent?.id, parent);
      assert.equal(sequence.siblings[sequence.index].id, part.id);
      assert.equal(sequence.previous, siblings[sequence.index - 1] ?? null);
      assert.equal(sequence.next, siblings[sequence.index + 1] ?? null);
      assert.deepEqual(
        sequence.children,
        children.filter((item) => item.parent === part.id),
      );
    }
    assert.equal(partInspectionSequence(device.id, "unknown"), null);
    assert.equal(partInspectionSequence(device.id, device.id), null);
    for (const part of subpartsForDevice("srv-01")) {
      if (!children.some((item) => item.id === part.id))
        assert.equal(partInspectionSequence(device.id, part.id), null);
    }
  }
  assert.equal(partInspectionSequence("unknown", "memory-01"), null);
});

test("连续检视与完整结构返回聚焦目标，保留部分展开、上盖、分析和共享时间", () => {
  for (const model of ["server-1u", "server-2u", "switch-1u", "storage-4u"]) {
    const device = devices.find((item) => item.modelId === model)!;
    let state = createReview();
    state = {
      ...state,
      analysis: true,
      layer: "environment",
      scene: {
        ...state.scene,
        deviceId: device.id,
        level: "device",
        selected: device.id,
        time: 89,
        playing: false,
        explosion: 0.4,
        coverOpen: true,
      },
    };
    for (const part of [
      ...partsForDevice(device.id),
      ...subpartsForDevice(device.id),
    ]) {
      const before = state.scene;
      state = reviewTransition(state, {
        type: "inspect-adjacent-part",
        id: part.id,
      });
      assert.equal(state.selectedId, part.id);
      assert.deepEqual(state.scene, {
        ...before,
        selected: part.id,
      });
      assert.equal(state.analysis, true);
      assert.equal(state.layer, "environment");
    }
    const before = state.scene;
    state = reviewTransition(state, { type: "finish-part-inspection" });
    assert.equal(state.selectedId, device.id);
    assert.deepEqual(state.scene, {
      ...before,
      selected: device.id,
      focusRevision: before.focusRevision + 1,
    });
  }
});

test("未展开、离开设备或安全归位中拒绝逐项检视，外机型部件不可进入", () => {
  const base = createReview();
  const inside = {
    ...base,
    scene: { ...base.scene, level: "device" as const, explosion: 0.4 },
  };
  for (const state of [
    base,
    { ...inside, scene: { ...inside.scene, explosion: 0 } },
    { ...inside, pendingId: "srv-59" },
    { ...inside, pendingEndpoint: { deviceId: "srv-59", partId: "psu-01" } },
  ]) {
    assert.equal(
      reviewTransition(state, {
        type: "inspect-adjacent-part",
        id: "memory-01",
      }),
      state,
    );
    assert.equal(
      reviewTransition(state, { type: "finish-part-inspection" }),
      state,
    );
  }
  assert.equal(
    reviewTransition(inside, { type: "inspect-adjacent-part", id: "unknown" }),
    inside,
  );
  const sw = { ...inside, scene: { ...inside.scene, deviceId: "sw-01" } };
  assert.equal(
    reviewTransition(sw, { type: "inspect-adjacent-part", id: "memory-01" }),
    sw,
  );
});
