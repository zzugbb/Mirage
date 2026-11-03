import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { racks, devices } from "./installation.ts";
import { modelForDevice } from "./catalog.ts";
import { rackBlankingUnits, unitRanges } from "./rack-blanking.ts";
import {
  createRackBlanking,
  updateRackBlanking,
} from "./scene/rack-blanking.ts";

test("逐柜设备与盲板完整覆盖42U且互不重叠，混合柜不能复用计算柜布局", () => {
  for (const rack of racks) {
    const slots = new Map(rackBlankingUnits(rack.id).map((u) => [u, "blank"]));
    for (const device of devices.filter((d) => d.rackId === rack.id)) {
      for (
        let u = device.startUnit;
        u < device.startUnit + modelForDevice(device.id).units;
        u++
      ) {
        assert.ok(!slots.has(u), `${rack.id} U${u} 不能装设备又装盲板`);
        slots.set(u, device.id);
      }
    }
    assert.deepEqual(
      [...slots.keys()].sort((a, b) => a - b),
      Array.from({ length: 42 }, (_, i) => i + 1),
    );
  }
  assert.ok(rackBlankingUnits("rack-a01").includes(25));
  assert.ok(!rackBlankingUnits("rack-a07").includes(25));
  assert.ok(rackBlankingUnits("rack-a03").includes(24));
  assert.ok(!rackBlankingUnits("rack-a01").includes(24));
  assert.deepEqual(rackBlankingUnits("unknown"), []);
  assert.equal(unitRanges([5, 2, 1, 5, 8, 6]), "U1–2、U5–6、U8");
});

test("实例化盲板逐U定位且有接缝，42U上沿不与柜顶或门框重叠", () => {
  const root = createRackBlanking("rack-a01");
  const panels = root.getObjectByName("blanking-panels") as THREE.InstancedMesh;
  const fasteners = root.getObjectByName(
    "blanking-fasteners",
  ) as THREE.InstancedMesh;
  const local = new THREE.Box3().setFromBufferAttribute(
    panels.geometry.attributes.position as THREE.BufferAttribute,
  );
  const matrix = new THREE.Matrix4();
  for (const rack of racks) {
    const units = updateRackBlanking(root, rack.id);
    assert.equal(panels.count, units.length);
    assert.equal(fasteners.count, units.length * 2);
    for (const [i, u] of units.entries()) {
      panels.getMatrixAt(i, matrix);
      const bounds = local.clone().applyMatrix4(matrix);
      const middle = definition.rack.unitOrigin + u * definition.rack.unitPitch;
      assert.ok(
        Math.abs(bounds.getCenter(new THREE.Vector3()).y - middle) < 1e-6,
      );
      assert.ok(bounds.min.y > middle - definition.rack.unitPitch / 2);
      assert.ok(bounds.max.y < middle + definition.rack.unitPitch / 2);
      assert.ok(bounds.max.y < definition.rack.size[1] - 0.065 / 2);
      assert.ok(bounds.max.y < definition.rack.size[1] - 0.015 - 0.034 / 2);
      assert.ok(bounds.max.z < 0.57 - 0.025 / 2, "保留柜门运动空间");
    }
  }
  for (const mesh of [panels, fasteners]) {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }
});

test("远景机柜克隆与活动柜各自持有矩阵；反复切柜不串布局、不重建几何", () => {
  const active = createRackBlanking("rack-a01"),
    other = active.clone(true);
  const a = active.getObjectByName("blanking-panels") as THREE.InstancedMesh;
  const b = other.getObjectByName("blanking-panels") as THREE.InstancedMesh;
  updateRackBlanking(other, "rack-a07");
  const retained = Array.from(b.instanceMatrix.array),
    geometry = a.geometry;
  assert.notEqual(a.instanceMatrix, b.instanceMatrix);
  assert.equal(a.geometry, b.geometry);
  for (let pass = 0; pass < 3; pass++)
    for (const rack of racks) updateRackBlanking(active, rack.id);
  assert.equal(a.geometry, geometry);
  assert.deepEqual(Array.from(b.instanceMatrix.array), retained);
  assert.deepEqual(other.userData.units, rackBlankingUnits("rack-a07"));
  for (const mesh of active.children as THREE.InstancedMesh[]) {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }
  for (const mesh of other.children as THREE.InstancedMesh[]) mesh.dispose();
});
