import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { createFanModule } from "./scene/fan-module.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";

function dispose(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        materials.add(m);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

for (const [model, groupId, count] of [
  ["switch-1u", "net-fans", 4],
  ["storage-4u", "sto-fans", 2],
] as const) {
  test(`${model} 风扇框体贯通，叶间保留空隙，细节均在原模块尺寸内`, () => {
    const config = definition.parts.find((p) => p.id === groupId)!;
    const [w, h, d] = [
      (config.size[0] / count) * 0.9,
      config.size[1],
      config.size[2],
    ];
    const root = createFanModule([w, h, d]);
    try {
      root.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(root);
      for (const [axis, size] of [
        ["x", w],
        ["y", h],
        ["z", d],
      ] as const) {
        assert.ok(b.min[axis] >= -size / 2 - 1e-8);
        assert.ok(b.max[axis] <= size / 2 + 1e-8);
      }
      const frames = root.children.filter(
        (o) => o.name.includes("frame") || o.name === "fan-side",
      );
      const radius = Math.min(w, h) * definition.fanModule.openingRadiusRatio;
      let through = 0,
        bladeHits = 0;
      for (let i = 0; i < 120; i++) {
        const angle = (i * Math.PI * 2) / 120;
        const x = Math.cos(angle) * radius * 0.75,
          y = Math.sin(angle) * radius * 0.75;
        for (const side of [-1, 1]) {
          const ray = new THREE.Raycaster(
            new THREE.Vector3(x, y, side * d),
            new THREE.Vector3(0, 0, -side),
          );
          assert.equal(
            ray.intersectObjects(frames).length,
            0,
            "端框或侧壁堵住开口",
          );
          const hits = ray.intersectObject(root);
          if (!hits.length) through++;
          if (hits.some((hit) => hit.object.name === "fan-blade")) bladeHits++;
        }
      }
      assert.ok(through > 20, "叶轮必须保留可见叶间空隙");
      assert.ok(bladeHits > 20, "不能以空框代替叶轮");
      const hubRay = new THREE.Raycaster(
        new THREE.Vector3(0, 0, -d),
        new THREE.Vector3(0, 0, 1),
      );
      assert.equal(hubRay.intersectObject(root)[0].object.name, "fan-hub");
      const blades = root.children.filter(
        (o) => o.name === "fan-blade",
      ) as THREE.Mesh[];
      assert.equal(
        new Set(blades.map((o) => o.geometry)).size,
        1,
        "同一叶轮复用叶片几何",
      );
      assert.ok(
        root.children.every((o) => !o.userData.entityId),
        "细节不新增测点或资源身份",
      );
    } finally {
      dispose(root);
    }
  });

  test(`${model} 风扇保留独立身份，装配与展开后从两端均能选中原子件`, () => {
    const assembly = createEquipmentAssembly(model);
    try {
      const ids = definition.subparts
        .filter((p) => p.parent === groupId)
        .map((p) => p.id);
      assert.equal(ids.length, count);
      const group = assembly.groups.get(groupId)!;
      const base = group.position.clone();
      for (const offset of [0, 0.2, 0]) {
        group.position.copy(base).add(new THREE.Vector3(0, offset, -offset));
        assembly.root.updateMatrixWorld(true);
        for (const id of ids) {
          const child = assembly.groups.get(id)!;
          assert.deepEqual(
            child.userData.focusDirection,
            definition.fanModule.focusDirection,
          );
          const b = new THREE.Box3().setFromObject(child);
          const center = b.getCenter(new THREE.Vector3());
          const view = new THREE.Vector3()
            .fromArray(child.userData.focusDirection)
            .normalize();
          const focusedHit = new THREE.Raycaster(
            center.clone().addScaledVector(view, 0.2),
            view.negate(),
          ).intersectObject(child)[0];
          assert.ok(focusedHit);
          assert.match(
            focusedHit.object.name,
            /^fan-(hub|blade)$/,
            "定位视线应到达叶轮，不能被框体挡住",
          );
          for (const side of [-1, 1]) {
            const ray = new THREE.Raycaster(
              new THREE.Vector3(
                center.x,
                center.y,
                side < 0 ? b.min.z - 0.05 : b.max.z + 0.05,
              ),
              new THREE.Vector3(0, 0, -side),
            );
            const hit = ray.intersectObject(group)[0];
            assert.ok(hit);
            let o: THREE.Object3D | null = hit.object;
            while (o && !o.userData.entityId) o = o.parent;
            assert.equal(o?.userData.entityId, id);
          }
        }
      }
      assert.ok(group.position.equals(base));
    } finally {
      dispose(assembly.root);
    }
  });
}
