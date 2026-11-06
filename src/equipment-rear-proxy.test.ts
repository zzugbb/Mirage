import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { createEquipmentRearProxy } from "./scene/equipment-rear-proxy.ts";

test("四机型后侧外观遵循配置数量、U位和深度，面板互不覆盖", () => {
  for (const model of definition.equipmentModels) {
    const proxy = createEquipmentRearProxy(model.id);
    const height = model.units * 0.04445 - 0.003;
    const bounds = new THREE.Box3().setFromObject(proxy);
    assert.ok(bounds.min.x >= -0.234 && bounds.max.x <= 0.234);
    assert.ok(bounds.min.y >= -height / 2 && bounds.max.y <= height / 2);
    assert.ok(bounds.max.z <= -model.depth / 2 + 1e-6);
    assert.ok(bounds.min.z >= -model.depth / 2 - 0.011);
    assert.equal(model.rearPanels.filter((p) => p.kind === "power").length, 2);
    if (model.category !== "server")
      assert.equal(
        model.rearPanels.filter((p) => p.kind === "vent").length,
        model.fans,
      );
    const panels = model.rearPanels.map(
      (p) =>
        new THREE.Box2(
          new THREE.Vector2(
            p.center[0] - p.size[0] / 2,
            p.center[1] - p.size[1] / 2,
          ),
          new THREE.Vector2(
            p.center[0] + p.size[0] / 2,
            p.center[1] + p.size[1] / 2,
          ),
        ),
    );
    panels.forEach((a, i) =>
      panels
        .slice(i + 1)
        .forEach((b) => assert.equal(a.intersectsBox(b), false)),
    );
    // 所有模块后向都能射线命中，不被整机壳体的原背面遮住。
    for (const panel of model.rearPanels) {
      const hits = new THREE.Raycaster(
        new THREE.Vector3(...panel.center, -model.depth),
        new THREE.Vector3(0, 0, 1),
      ).intersectObject(proxy, true);
      assert.ok(hits.length > 0);
      assert.ok(hits[0].point.z < -model.depth / 2);
    }
  }
});

test("后侧外观只使用三个可实例化材质批次，不增加身份、状态灯或贴图请求", () => {
  for (const model of definition.equipmentModels) {
    const proxy = createEquipmentRearProxy(model.id);
    assert.equal(proxy.children.length, 3);
    proxy.traverse((object) => {
      assert.deepEqual(object.userData, {});
      if (!(object instanceof THREE.Mesh)) return;
      const material = object.material as THREE.MeshStandardMaterial;
      assert.equal(material.map, null);
      assert.equal(material.emissive.getHex(), 0);
      assert.equal(material.transparent, false);
      assert.equal(material.depthTest, true);
      assert.ok(object.geometry.attributes.position.count < 3000);
      assert.ok(object.castShadow && object.receiveShadow);
    });
  }
});
