import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import { assemblyCheck } from "./assembly-pairs.ts";
import { devices } from "./installation.ts";
import { sourcePorts } from "./network.ts";
import { modelById } from "./catalog.ts";

const bounds = (object: THREE.Object3D) =>
  new THREE.Box3().setFromObject(object);
const center = (object: THREE.Object3D) =>
  bounds(object).getCenter(new THREE.Vector3());
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-7, `${a} ≠ ${b}`);

test("存储 24 盘的后部接触面与竖直中板逐位对齐，接点不再排在板顶", () => {
  const assembly = createEquipmentAssembly("storage-4u");
  const plane = assembly.groups.get("sto-midplane")!;
  const board = bounds(plane.getObjectByName("storage-midplane-board")!);
  assert.equal(
    plane.children.filter((o) => o.name.startsWith("storage-socket-")).length,
    24,
  );
  for (let i = 1; i <= 24; i++) {
    const suffix = String(i).padStart(2, "0");
    const disk = assembly.groups.get(`sto-disk-${suffix}`)!;
    const socket = plane.getObjectByName(`storage-socket-${suffix}`)!;
    const contact = disk.getObjectByName("storage-drive-contact")!;
    close(center(socket).x, center(contact).x);
    close(center(socket).y, center(contact).y);
    close(bounds(socket).max.z, bounds(contact).min.z);
    close(bounds(socket).min.z, board.max.z);
    assert.ok(
      bounds(socket).min.y > board.min.y && bounds(socket).max.y < board.max.y,
    );
  }
});

test("24 个带托架盘位不互相穿插，正面射线仍分别选择原有硬盘子件", () => {
  const assembly = createEquipmentAssembly("storage-4u");
  const drives = assembly.groups.get("sto-drives")!;
  const disks = [...assembly.groups].filter(([id]) =>
    id.startsWith("sto-disk-"),
  );
  assert.equal(disks.length, 24);
  for (const [i, [id, disk]] of disks.entries()) {
    const b = bounds(disk);
    for (const [, other] of disks.slice(i + 1))
      assert.equal(
        b.intersectsBox(bounds(other)),
        false,
        `${id} 与相邻盘位穿插`,
      );
    const origin = center(disk);
    origin.z = b.max.z + 1;
    const hit = new THREE.Raycaster(
      origin,
      new THREE.Vector3(0, 0, -1),
    ).intersectObject(drives)[0];
    assert.ok(hit);
    let object: THREE.Object3D | null = hit.object;
    while (object && !object.userData.entityId) object = object.parent;
    assert.equal(object?.userData.entityId, id);
  }
});

test("存储后部电源及其接口保留在当前机箱深度内，四盘列六层保持 4U 高度", () => {
  const model = modelById("storage-4u");
  const assembly = createEquipmentAssembly(model.id);
  for (const id of [
    "sto-psu-a",
    "sto-psu-b",
    "sto-controller-a",
    "sto-controller-b",
    "sto-fans",
  ]) {
    const b = bounds(assembly.groups.get(id)!);
    assert.ok(b.min.z >= -model.depth / 2, `${id} 超出机箱后沿`);
    assert.ok(b.max.z <= model.depth / 2);
    assert.ok(b.min.y > (-model.units * 0.04445) / 2);
    assert.ok(b.max.y < (model.units * 0.04445) / 2);
  }
  const disks = [...assembly.groups].filter(([id]) =>
    id.startsWith("sto-disk-"),
  );
  assert.equal(new Set(disks.map(([, disk]) => disk.position.x)).size, 4);
  assert.equal(new Set(disks.map(([, disk]) => disk.position.y)).size, 6);
});

test("S4 核查选择与配置槽位、逻辑端口归属及后面板拾取一致", () => {
  const assembly = createEquipmentAssembly("storage-4u");
  for (const device of devices) {
    const check = assemblyCheck(device.id);
    assert.equal(
      check?.tool === "storage-controllers",
      device.modelId === "storage-4u",
    );
    if (check?.tool !== "storage-controllers") continue;
    const [{ primary, companion }] = check.pairs;
    assert.deepEqual([primary.slot, companion.slot], ["CTRL-A", "CTRL-B"]);
    for (const part of [primary, companion]) {
      const controller = assembly.groups.get(part.id)!;
      const panel = controller.getObjectByName("controller-rear-panel")!;
      const pcb = controller.getObjectByName("controller-board")!;
      assert.ok(bounds(panel).max.z < bounds(pcb).min.z);
      assert.ok(sourcePorts(device.id).some((port) => port.partId === part.id));
      const origin = center(panel);
      origin.z -= 0.02;
      const hit = new THREE.Raycaster(
        origin,
        new THREE.Vector3(0, 0, 1),
      ).intersectObject(assembly.root)[0];
      let owner: THREE.Object3D | null = hit?.object ?? null;
      while (owner && !owner.userData.entityId) owner = owner.parent;
      assert.equal(owner?.userData.entityId, part.id);
    }
    const a = bounds(assembly.groups.get(primary.id)!);
    const b = bounds(assembly.groups.get(companion.id)!);
    assert.ok(a.max.x < b.min.x);
    for (const id of ["sto-psu-a", "sto-psu-b", "sto-fans", "sto-midplane"]) {
      const other = bounds(assembly.groups.get(id)!);
      assert.ok(!a.intersectsBox(other) && !b.intersectsBox(other), id);
    }
  }
});
