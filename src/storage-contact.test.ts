import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import {
  storageContactObjects,
  connectorBounds,
  StorageContactGuide,
} from "./scene/storage-contact.ts";
import { PartIsolation } from "./scene/part-isolation.ts";
import { partsForDevice } from "./catalog.ts";
import { assemblyPartPosition } from "./assembly-motion.ts";
import {
  activeStorageSlots,
  storageSlots,
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

test("中板正面 24 个接触片与插座外缘均命中盘位，板面保留中板身份", () => {
  const assembly = createEquipmentAssembly("storage-4u");
  const board = assembly.groups.get("sto-midplane")!;
  board.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster();
  const guide = new StorageContactGuide();
  for (const slot of storageSlots("sto-04")) {
    const pair = storageContactObjects("sto-04", slot.id, assembly.groups)!;
    const bounds = new THREE.Box3().setFromObject(pair.socket);
    const center = bounds.getCenter(new THREE.Vector3());
    for (const fraction of [0, 0.44, 0.7]) {
      const origin = center.clone();
      origin.x += fraction * (bounds.max.x - bounds.min.x);
      origin.z = bounds.max.z + 1;
      ray.set(origin, new THREE.Vector3(0, 0, -1));
      const surface = ray.intersectObject(board)[0].object;
      assert.equal(
        surface.userData.storageSlotIndex,
        fraction > 0.5 ? undefined : slot.index,
      );
    }
    guide.update(pair, true);
    assert.deepEqual(
      guide.root.children.map((object) => object.visible),
      [false, true, false],
    );
    guide.update(pair);
    assert.ok(guide.root.children.every((object) => object.visible));
  }
});

test("24 盘的宽窄插片分别进入同号双腔，端面贴座，换盘和退出恢复原盘尾", () => {
  const assembly = createEquipmentAssembly("storage-4u");
  const guide = new StorageContactGuide();
  const slots = storageSlots("sto-04");
  const pairs = slots.map((s) =>
    storageContactObjects("sto-04", s.id, assembly.groups)!,
  );
  const rest = pairs.map((p) => p.plug.position.clone());
  const box = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o, true);
  const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7);
  for (const amount of [0.4, 1]) {
    for (const part of partsForDevice("sto-04"))
      assembly.groups
        .get(part.id)!
        .position.fromArray(assemblyPartPosition(part, amount, 1));
    assembly.root.updateMatrixWorld(true);
    for (const [i, p] of pairs.entries()) {
      const socket = box(p.socket),
        body = box(p.disk.getObjectByName("storage-drive-body")!);
      const tongues = p.plug.getObjectsByProperty("name", "plug-tongue");
      const contacts = p.socket.getObjectsByProperty("name", "socket-contact");
      const key = box(p.socket.getObjectByName("socket-divider")!);
      assert.equal(tongues.length, 2);
      let frame: THREE.Box3 | undefined;
      for (const pose of [
        "separated",
        "seated",
        "seated",
        "separated",
      ] as const) {
        guide.poseConnector(p, pose);
        const framing = new THREE.Box3();
        connectorBounds(framing, p);
        if (frame) {
          close(framing.min.z, frame.min.z);
          close(framing.max.z, frame.max.z);
        }
        frame = framing;
        assert.ok(box(p.socket).equals(socket));
        assert.ok(
          box(p.disk.getObjectByName("storage-drive-body")!).equals(body),
        );
        if (i) assert.ok(pairs[i - 1].plug.position.equals(rest[i - 1]));
        const shoulder = box(p.contact);
        close(shoulder.min.x, socket.min.x);
        close(
          shoulder.getCenter(new THREE.Vector3()).y,
          socket.getCenter(new THREE.Vector3()).y,
        );
        if (pose === "separated") assert.ok(box(p.plug).min.z > socket.max.z);
        else {
          close(shoulder.min.z, socket.max.z);
          assert.ok(
            box(tongues[0]).max.x < key.min.x &&
              box(tongues[1]).min.x > key.max.x,
          );
          assert.ok(
            box(tongues[0]).getSize(new THREE.Vector3()).x >
              box(tongues[1]).getSize(new THREE.Vector3()).x,
          );
          const pads = p.plug.getObjectsByProperty("name", "plug-pad");
          assert.equal(contacts.length, pads.length);
          pads.forEach((pad, j) => {
            const land = box(pad),
              finger = box(contacts[j]);
            close(land.max.y, finger.min.y);
            assert.ok(land.min.x < finger.min.x && land.max.x > finger.max.x);
            assert.ok(land.min.z < finger.max.z && finger.max.z < land.max.z);
          });
          for (const mesh of [
            ...tongues,
            ...p.plug.getObjectsByProperty("name", "plug-pad"),
          ]) {
            const swept = box(mesh);
            swept.max.z = shoulder.max.z;
            for (const fixed of p.socket.children) {
              const overlap = swept
                .clone()
                .intersect(box(fixed))
                .getSize(new THREE.Vector3());
              assert.ok(Math.min(overlap.x, overlap.y, overlap.z) < 1e-7);
            }
          }
        }
      }
    }
    guide.poseConnector(null);
    assert.ok(pairs.every((p, i) => p.plug.position.equals(rest[i])));
  }
});
