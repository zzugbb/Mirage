import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import {
  storageContactObjects,
  StorageContactGuide,
} from "./scene/storage-contact.ts";
import { PartIsolation } from "./scene/part-isolation.ts";
import { partsForDevice } from "./catalog.ts";
import { assemblyPartPosition } from "./assembly-motion.ts";
import {
  activeStorageSlots,
  type StorageSlotInspection,
} from "./storage-slots.ts";
import { createReview } from "./review-model.ts";

test("接点标记在同帧跟随盘组和中板位移，不等渲染器刷新父级矩阵", () => {
  const assembly = createEquipmentAssembly("storage-4u");
  const pair = storageContactObjects("sto-01", "sto-disk-01", assembly.groups)!;
  const guide = new StorageContactGuide();
  assembly.root.updateMatrixWorld(true);
  guide.update(pair);
  const positions = (
    guide.root.children[2] as THREE.Line
  ).geometry.getAttribute("position");
  const before = [positions.getZ(0), positions.getY(1)];
  assembly.groups.get("sto-drives")!.position.z += 0.2;
  pair.board.position.y += 0.1;
  guide.update(pair);
  assert.ok(Math.abs(positions.getZ(0) - before[0] - 0.2) < 1e-6);
  assert.ok(Math.abs(positions.getY(1) - before[1] - 0.1) < 1e-6);
});

test("24 盘的接点观察沿用原几何，部分展开与完整展开均只显示两条实体分支", () => {
  const assembly = createEquipmentAssembly("storage-4u"),
    isolation = new PartIsolation();
  const original = new Map<THREE.Object3D, boolean>();
  assembly.root.traverse((o) => original.set(o, o.visible));
  const guide = new StorageContactGuide();
  assert.equal(guide.root.userData.excludeFromContactShadows, true);
  for (const amount of [0, 0.4, 1]) {
    for (const part of partsForDevice("sto-01"))
      assembly.groups
        .get(part.id)!
        .position.fromArray(assemblyPartPosition(part, amount, 1));
    for (let i = 1; i <= 24; i++) {
      const id = `sto-disk-${String(i).padStart(2, "0")}`;
      const pair = storageContactObjects("sto-01", id, assembly.groups)!;
      assert.ok(pair);
      assert.equal(
        pair.socket.name,
        `storage-socket-${String(i).padStart(2, "0")}`,
      );
      assert.equal(
        isolation.applyMany(assembly.root, [pair.disk, pair.board]),
        true,
      );
      const allowed = new Set<THREE.Object3D>();
      pair.disk.traverse((o) => allowed.add(o));
      pair.board.traverse((o) => allowed.add(o));
      assembly.root.traverseVisible((o) => {
        if (o instanceof THREE.Mesh) assert.ok(allowed.has(o));
      });
      guide.update(pair);
      assert.equal(guide.root.visible, true);
      const line = guide.root.children[2] as THREE.Line;
      const positions = line.geometry.getAttribute("position");
      const contact = new THREE.Box3().setFromObject(pair.contact),
        socket = new THREE.Box3().setFromObject(pair.socket);
      assert.ok(Math.abs(positions.getZ(0) - contact.min.z + 0.0008) < 1e-6);
      assert.ok(Math.abs(positions.getZ(1) - socket.max.z - 0.0008) < 1e-6);
      assert.ok(
        Math.abs(positions.getX(0) - contact.getCenter(new THREE.Vector3()).x) <
          1e-6,
      );
      assert.ok(
        Math.abs(positions.getY(1) - socket.getCenter(new THREE.Vector3()).y) <
          1e-6,
      );
    }
  }
  isolation.restore();
  for (const [object, visible] of original)
    assert.equal(object.visible, visible);
  guide.update(null);
  assert.equal(guide.root.visible, false);
  for (const id of [null, "sto-drives", "sto-controller-a", "sto-disk-25"])
    assert.equal(storageContactObjects("sto-01", id, assembly.groups), null);
  assert.equal(
    storageContactObjects("srv-01", "sto-disk-01", assembly.groups),
    null,
  );
});

test("多分支暂隐保留原始隐藏状态，拒绝缺失、隐藏或外部路径且完整恢复", () => {
  const root = new THREE.Group(),
    a = new THREE.Group(),
    b = new THREE.Group(),
    hidden = new THREE.Group();
  root.add(a, b, hidden);
  hidden.visible = false;
  const isolation = new PartIsolation();
  assert.equal(isolation.applyMany(root, [a, b]), true);
  assert.equal(hidden.visible, false);
  assert.equal(isolation.applyMany(root, [a, new THREE.Group()]), false);
  assert.equal(b.visible, true);
  assert.equal(isolation.applyMany(root, [a, hidden]), false);
  assert.equal(a.visible, true);
  assert.equal(isolation.applyMany(root, []), false);
  assert.equal(isolation.applyMany(root, [root]), false);
  assert.equal(hidden.visible, false);
});

test("接点核对可预览中板、回看和换盘，离开实例或复原仍立即失效", () => {
  const visit: StorageSlotInspection = {
    deviceId: "sto-01",
    mode: "contact",
    diskId: "sto-disk-24",
    pending: false,
  };
  const state = {
    ...createReview().scene,
    level: "device" as const,
    deviceId: "sto-01",
    explosion: 0.4,
  };
  for (const selected of ["sto-disk-01", "sto-disk-24", "sto-midplane"])
    assert.equal(
      activeStorageSlots(visit, { ...state, time: 82 }, selected),
      visit,
    );
  assert.equal(
    activeStorageSlots(visit, { ...state, explosion: 0 }, "sto-midplane"),
    null,
  );
  assert.equal(
    activeStorageSlots(visit, { ...state, deviceId: "sto-02" }, "sto-midplane"),
    null,
  );
  assert.equal(
    activeStorageSlots(visit, { ...state, level: "room" }, "sto-midplane"),
    null,
  );
  assert.equal(activeStorageSlots(visit, state, "sto-controller-a"), null);
  assert.equal(
    activeStorageSlots({ ...visit, mode: "group" }, state, "sto-midplane"),
    null,
  );
});
