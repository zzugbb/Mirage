import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import { modelById } from "./catalog.ts";

const bounds = (object: THREE.Object3D) =>
  new THREE.Box3().setFromObject(object);
function overlaps(a: THREE.Box3, b: THREE.Box3) {
  const size = a.clone().intersect(b).getSize(new THREE.Vector3());
  return size.x > 1e-7 && size.y > 1e-7 && size.z > 1e-7;
}

test("交换机控制板及板上细节避让四个风扇与两路电源，后部模块互不穿插", () => {
  const assembly = createEquipmentAssembly("switch-1u");
  const modules = [
    "net-fan-01",
    "net-fan-02",
    "net-fan-03",
    "net-fan-04",
    "net-psu-a",
    "net-psu-b",
  ].map((id) => assembly.groups.get(id)!);
  assembly.groups.get("net-board")!.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const module of modules)
      assert.equal(
        overlaps(bounds(object), bounds(module)),
        false,
        `控制板穿入 ${module.userData.entityId}`,
      );
  });
  for (const [i, module] of modules.entries())
    for (const other of modules.slice(i + 1))
      assert.equal(
        overlaps(bounds(module), bounds(other)),
        false,
        `${module.userData.entityId} 与 ${other.userData.entityId} 穿插`,
      );
});

test("交换芯片散热器底面落在控制板上方，板上元件不穿入散热器", () => {
  const assembly = createEquipmentAssembly("switch-1u");
  const board = assembly.groups.get("net-board")!;
  const substrate = bounds(board.children[0]);
  const sink = bounds(assembly.groups.get("net-asic")!);
  assert.ok(Math.abs(substrate.max.y - sink.min.y) < 1e-7);
  assert.ok(substrate.min.x < sink.min.x && substrate.max.x > sink.max.x);
  assert.ok(substrate.min.z < sink.min.z && substrate.max.z > sink.max.z);
  board.traverse((object) => {
    if (object instanceof THREE.Mesh)
      assert.equal(
        overlaps(bounds(object), sink),
        false,
        "控制板元件穿入散热器",
      );
  });
});

test("交换机后部模块处于 1U 机箱范围，四个风扇仍可从后侧独立拾取", () => {
  const model = modelById("switch-1u");
  const assembly = createEquipmentAssembly(model.id);
  for (const id of [
    "net-board",
    "net-asic",
    "net-fans",
    "net-psu-a",
    "net-psu-b",
  ]) {
    const b = bounds(assembly.groups.get(id)!);
    assert.ok(b.min.z > -model.depth / 2 && b.max.z < model.depth / 2, id);
    assert.ok(b.min.y > -(model.units * 0.04445 - 0.003) / 2, id);
    assert.ok(b.max.y < (model.units * 0.04445 - 0.003) / 2, id);
  }
  for (let i = 1; i <= 4; i++) {
    const id = `net-fan-0${i}`,
      fan = assembly.groups.get(id)!;
    const origin = bounds(fan).getCenter(new THREE.Vector3());
    origin.z = -model.depth;
    const hit = new THREE.Raycaster(
      origin,
      new THREE.Vector3(0, 0, 1),
    ).intersectObject(assembly.root)[0];
    assert.ok(hit);
    let object: THREE.Object3D | null = hit.object;
    while (object && !object.userData.entityId) object = object.parent;
    assert.equal(object?.userData.entityId, id);
  }
});
