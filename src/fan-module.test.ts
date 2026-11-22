import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  assemblyLayer,
  layerScopeFor,
  includeSeparatedLayer,
  poseAssemblyLayer,
} from "./scene/assembly-layer.ts";
import {
  switchRear,
  rearMemberLayer,
  rearLayoutFor,
} from "./assembly-pairs.ts";
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
    const root = createFanModule(
      [w, h, d],
      model === "switch-1u" ? "rotor" : "guard",
    );
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
      const blades = root.getObjectsByProperty(
        "name",
        "fan-blade",
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

test("N1 四个风扇槽位各自分离叶轮，轴头、框体与三臂固定，重复落座对孔", () => {
  const assembly = createEquipmentAssembly("switch-1u");
  try {
    for (const part of switchRear.members) {
      const child = assembly.groups.get(part.id)!;
      const layer = assemblyLayer(child);
      const tool = rearMemberLayer(switchRear, part.id);
      if (!switchRear.fans.some((fan) => fan.id === part.id)) {
        assert.equal(layer?.node, "psu-inner-tray");
        assert.equal(tool?.entry, "查看电源内托");
        continue;
      }
      assert.equal(tool?.entry, "查看风扇装配");
      assert.ok(layer);
      const bounds = (node: THREE.Object3D) =>
        new THREE.Box3().setFromObject(node, true);
      child.updateWorldMatrix(true, true);
      const rotor = child.getObjectByName(layer.node)!;
      const blades = rotor.getObjectsByProperty("name", "fan-blade");
      assert.equal(blades.length, definition.fanModule.bladeCount);
      const hub = rotor.getObjectByName("fan-hub")!,
        shaft = child.getObjectByName("fan-shaft")!;
      const housing = child.getObjectByName("fan-rear-frame")!;
      const shaftSeat = bounds(shaft),
        hubSeat = bounds(hub),
        frameSeat = bounds(housing);
      const midpoint = (box: THREE.Box3) => box.getCenter(new THREE.Vector3());
      const center = midpoint(shaftSeat);
      const hubCenter = midpoint(hubSeat);
      assert.ok(
        Math.hypot(center.x - hubCenter.x, center.y - hubCenter.y) < 1e-8,
      );
      // 叶尖在整个轴向行程内均能穿过机后圆孔。
      const opening =
        bounds(child).getSize(new THREE.Vector3()).y *
        definition.fanModule.openingRadiusRatio;
      for (const blade of blades as THREE.Mesh[]) {
        const vertices = blade.geometry.getAttribute("position");
        for (let i = 0; i < vertices.count; i++) {
          const tip = blade.localToWorld(
            new THREE.Vector3().fromBufferAttribute(vertices, i),
          );
          assert.ok(Math.hypot(tip.x - center.x, tip.y - center.y) < opening);
        }
      }
      // 从轮毂背面向盲孔底部射线：轴头伸入背孔且与孔底留隙。
      const ray = new THREE.Raycaster(
        center.clone().setZ(hubSeat.max.z + 0.01),
        new THREE.Vector3(0, 0, -1),
      );
      const bottom = ray.intersectObject(hub)[0].point.z;
      assert.ok(
        hubSeat.min.z < bottom &&
          bottom < shaftSeat.min.z &&
          shaftSeat.min.z < hubSeat.max.z,
      );
      const framed = new THREE.Box3().setFromObject(child);
      includeSeparatedLayer(framed, child, layer);
      for (const separated of [true, true, false, true, false]) {
        poseAssemblyLayer(child, separated);
        child.updateWorldMatrix(true, true);
        const current = bounds(hub);
        assert.ok(
          Math.abs(
            current.min.z - hubSeat.min.z - (separated ? layer.offset[2] : 0),
          ) < 1e-8,
        );
        assert.ok(framed.containsBox(bounds(rotor)));
        if (separated) assert.ok(bounds(rotor).max.z < frameSeat.min.z);
        assert.ok(bounds(shaft).equals(shaftSeat));
        assert.ok(bounds(housing).equals(frameSeat));
        if (!separated) assert.ok(current.equals(hubSeat));
      }
      const walls = child.getObjectsByProperty("name", "fan-side");
      const supports = child.getObjectsByProperty("name", "fan-support");
      assert.equal(supports.length, 3);
      assert.ok(
        supports.every((strut) =>
          walls.some((wall) => bounds(wall).intersectsBox(bounds(strut))),
        ),
      );
    }
  } finally {
    dispose(assembly.root);
  }
});

test("S4 两只风扇的护网各自沿机后方向取下，四个通孔归位对柱，叶轮保持固定", () => {
  const assembly = createEquipmentAssembly("storage-4u");
  const layout = rearLayoutFor("storage-4u")!;
  const bounds = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o, true);
  try {
    for (const part of layout.fans) {
      const child = assembly.groups.get(part.id)!;
      const layer = assemblyLayer(child)!;
      assert.equal(rearMemberLayer(layout, part.id)?.entry, "查看护网与定位柱");
      const guard = child.getObjectByName(layer.node)!;
      const rings = guard.getObjectsByProperty("name", "fan-guard-ring");
      const eyes = guard.getObjectsByProperty("name", "fan-guard-eye");
      const pins = child.getObjectsByProperty("name", "fan-guard-pin");
      const frame = child.getObjectByName("fan-rear-frame")!;
      const hub = child.getObjectByName("fan-hub")!;
      child.updateWorldMatrix(true, true);
      const fixedHub = bounds(hub);
      assert.equal(rings.length, 3);
      assert.equal(eyes.length, 4);
      assert.equal(pins.length, eyes.length);
      const seats = pins.map(bounds);
      const rest = bounds(guard);
      assert.ok(rest.max.z < fixedHub.min.z);
      for (const separated of [true, false, true, false]) {
        poseAssemblyLayer(child, separated);
        child.updateWorldMatrix(true, true);
        const front = bounds(frame).min.z;
        for (const [i, eye] of eyes.entries()) {
          const hole = bounds(eye);
          const pin = seats[i];
          const axis = pin.getCenter(new THREE.Vector3());
          const center = hole.getCenter(new THREE.Vector3());
          assert.ok(Math.hypot(axis.x - center.x, axis.y - center.y) < 1e-8);
          const ray = new THREE.Raycaster(
            axis.clone().setZ(hole.min.z - 0.01),
            new THREE.Vector3(0, 0, 1),
          );
          assert.equal(ray.intersectObject(eye).length, 0);
          assert.ok(ray.intersectObject(pins[i]).length);
          assert.ok(bounds(pins[i]).equals(pin));
          assert.ok(Math.abs(pin.max.z - front) < 1e-8);
          if (separated) assert.ok(hole.max.z < pin.min.z);
          else {
            assert.ok(Math.abs(hole.max.z - front) < 1e-8);
            assert.ok(pin.min.z < hole.min.z);
          }
        }
        assert.ok(bounds(hub).equals(fixedHub));
        if (!separated) assert.ok(bounds(guard).equals(rest));
      }
    }
  } finally {
    dispose(assembly.root);
  }
});

test("S4 两槽的叶轮背孔对轴，轴套止肩抵住电机座，分合后各件恢复原位", () => {
  const assembly = createEquipmentAssembly("storage-4u");
  const bounds = (obj: THREE.Object3D) =>
    new THREE.Box3().setFromObject(obj, true);
  const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7);
  try {
    for (const { id } of rearLayoutFor("storage-4u")!.fans) {
      const fan = assembly.groups.get(id)!;
      const rotor = layerScopeFor(fan, "storage-rotor")!;
      const spindle = layerScopeFor(fan, "storage-spindle")!;
      const hub = rotor.moving.getObjectByName("fan-hub")!;
      const pin = spindle.moving.getObjectByName("fan-shaft")!;
      const sleeve = spindle.moving.getObjectByName("fan-sleeve")!;
      const motor = fan.getObjectByName("fan-motor")!;
      const arms = fan.getObjectsByProperty("name", "fan-support");
      const guard = fan.getObjectByName("fan-guard")!;
      fan.updateWorldMatrix(true, true);
      const initial = [hub, pin, sleeve, motor, guard, ...arms].map(bounds);
      const [hubBox, pinBox, sleeveBox, seat] = initial;
      const center = seat.getCenter(new THREE.Vector3());
      const ray = (dx: number, z: number, dir: number) =>
        new THREE.Raycaster(
          new THREE.Vector3(center.x + dx, center.y, z),
          new THREE.Vector3(0, 0, dir),
        );
      const pinRadius = (pinBox.max.x - pinBox.min.x) / 2;
      const width = seat.max.x - center.x;
      const back = ray(0, seat.min.z - 0.01, 1).intersectObject(motor)[0].point
        .z;
      assert.ok(back > sleeveBox.max.z && back < seat.max.z);
      const blind = ray(0, hubBox.max.z + 0.01, -1).intersectObject(hub)[0]
        .point.z;
      assert.ok(
        hubBox.min.z < blind &&
          blind < pinBox.min.z &&
          pinBox.min.z < hubBox.max.z,
      );
      close(
        ray(width * 0.79, sleeveBox.max.z + 0.01, -1).intersectObject(sleeve)[0]
          .point.z,
        seat.min.z,
      );
      for (const obj of [hubBox, pinBox, sleeveBox]) {
        const c = obj.getCenter(new THREE.Vector3());
        close(c.x, center.x);
        close(c.y, center.y);
      }
      assert.equal(
        ray(pinRadius * 0.95, sleeveBox.min.z - 0.01, 1).intersectObject(sleeve)
          .length,
        0,
      );
      assert.equal(
        ray(width * 0.6, seat.min.z - 0.01, 1).intersectObjects(arms).length,
        0,
      );
      assert.equal(
        rotor.moving.getObjectsByProperty("name", "fan-blade").length,
        7,
      );
      const frame = fan.getObjectByName("fan-motor-frame")!;
      const frameBox = bounds(frame);
      const fanHeight = definition.parts.find((part) => part.id === "sto-fans")!
        .size[1];
      const radius = fanHeight * definition.fanModule.openingRadiusRatio;
      // 三臂均从座壳外圆伸到同一框板的实面，孔内保持净空。
      for (const arm of arms) {
        const axis = bounds(arm).getCenter(new THREE.Vector3()).sub(center);
        axis.z = 0;
        axis.normalize();
        for (const [r, target] of [
          [width * 0.98, motor],
          [radius + 0.0003, frame],
        ] as const) {
          const point = center.clone().addScaledVector(axis, r);
          point.z = frameBox.min.z - 0.02;
          const ray = new THREE.Raycaster(point, new THREE.Vector3(0, 0, 1));
          assert.ok(
            ray.intersectObject(arm).length &&
              ray.intersectObject(target).length,
          );
        }
      }
      const rearView = layerScopeFor(fan, "storage-hub")!;
      assert.equal(rearView.moving, hub);
      assert.deepEqual(rearView.members, [hub, spindle.moving]);
      poseAssemblyLayer(rearView.layerRoot, true);
      fan.updateWorldMatrix(true, true);
      assert.ok(bounds(hub).max.z < pinBox.min.z);
      assert.ok(bounds(pin).equals(pinBox));
      poseAssemblyLayer(rearView.layerRoot, false);
      for (const scope of [rotor, spindle, rotor, spindle]) {
        for (const outer of scope.extractedLayers!)
          poseAssemblyLayer(outer, true);
        poseAssemblyLayer(scope.layerRoot, true);
        fan.updateWorldMatrix(true, true);
        if (scope === rotor) {
          assert.ok(bounds(guard).max.z < bounds(rotor.moving).min.z);
          assert.ok(bounds(pin).equals(pinBox));
        } else {
          assert.ok(bounds(sleeve).max.z < seat.min.z);
          assert.ok(bounds(rotor.moving).max.z < bounds(spindle.moving).min.z);
          assert.ok(bounds(guard).max.z < bounds(rotor.moving).min.z);
        }
        assert.ok(bounds(motor).equals(seat));
        assert.deepEqual(arms.map(bounds), initial.slice(5));
        poseAssemblyLayer(scope.layerRoot, false);
        for (const outer of [...scope.extractedLayers!].reverse())
          poseAssemblyLayer(outer, false);
        fan.updateWorldMatrix(true, true);
        assert.deepEqual(
          [hub, pin, sleeve, motor, guard, ...arms].map(bounds),
          initial,
        );
      }
    }
  } finally {
    dispose(assembly.root);
  }
});

test("M1 八个、M2 四个转子按配置独立核查，固定轴和相邻转子保留在位", () => {
  for (const model of ["server-1u", "server-2u"]) {
    const { root, groups } = createEquipmentAssembly(model);
    const layout = definition.equipmentModels.find(
      (m) => m.id === model,
    )!.fanDuctLayout!;
    for (const { id, rotorX } of layout.modules) {
      const fan = groups.get(id)!;
      for (const [index, x] of rotorX.entries()) {
        const scope = layerScopeFor(fan, "rotor:" + index)!;
        const mechanism = scope.cutaway!;
        const center = mechanism.getWorldPosition(new THREE.Vector3());
        assert.ok(
          center.distanceTo(
            new THREE.Vector3(x, layout.rotorY, layout.rotorZ),
          ) < 1e-7,
        );
        const moving = mechanism.getObjectByName("fan-rotor")!,
          pin = mechanism.getObjectByName("fan-shaft")!;
        const base = moving.getWorldPosition(new THREE.Vector3()),
          fixed = pin.getWorldPosition(new THREE.Vector3());
        for (const open of [true, false]) {
          poseAssemblyLayer(scope.layerRoot, open);
          root.updateWorldMatrix(true, true);
          const dz = base.z - moving.getWorldPosition(new THREE.Vector3()).z;
          if (open) assert.ok(dz > 0.01);
          else assert.equal(dz, 0);
          assert.ok(
            fixed.distanceTo(pin.getWorldPosition(new THREE.Vector3())) < 1e-8,
          );
          for (const [k] of rotorX.entries())
            if (k !== index)
              assert.equal(
                fan
                  .getObjectByName("fan-cutaway-" + (k + 1))!
                  .getObjectByName("fan-rotor")!.position.z,
                0,
              );
        }
        for (const stage of ["guard", "hub", "spindle"])
          assert.equal(
            layerScopeFor(fan, stage + ":" + index)!.cutaway,
            mechanism,
          );
      }
    }
  }
});
