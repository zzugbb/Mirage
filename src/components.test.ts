import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { parts, subparts, createState, transition } from "./domain.ts";
import { mapSubparts } from "./scene/component-map.ts";

test("子部件保留原装配矩阵，跟随父模组展开与复原，不重复偏移", () => {
  const root = new THREE.Group();
  const groups = new Map<string, THREE.Group>();
  for (const [i, part] of parts.entries()) {
    const group = new THREE.Group();
    group.position.set(i * 0.1, 0.02, 0.03);
    root.add(group);
    groups.set(part.id, group);
  }
  const before = new Map<string, THREE.Matrix4>();
  for (const [i, part] of subparts.entries()) {
    const node = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.02, 0.03));
    node.name = part.modelNode;
    node.position.set(i * 0.001, 0.02, -0.03);
    node.rotation.y = 0.13;
    groups.get(part.parent)!.add(node);
    node.updateWorldMatrix(true, false);
    before.set(part.id, node.matrixWorld.clone());
  }
  mapSubparts(root, groups);
  root.updateMatrixWorld(true);
  for (const part of subparts) {
    const group = groups.get(part.id)!;
    const node = root.getObjectByName(part.modelNode)!;
    assert.equal(group.parent, groups.get(part.parent));
    assert.equal(group.userData.entityId, part.id);
    assert.ok(
      node.matrixWorld.elements.every(
        (value, i) =>
          Math.abs(value - before.get(part.id)!.elements[i]) < 1e-10,
      ),
    );
    const parent = groups.get(part.parent)!;
    const base = parent.position.clone();
    for (let i = 0; i < 10; i++) {
      parent.position.y += 0.2;
      root.updateMatrixWorld(true);
      assert.ok(
        Math.abs(
          node.matrixWorld.elements[13] -
            before.get(part.id)!.elements[13] -
            0.2,
        ) < 1e-10,
      );
      parent.position.copy(base);
      root.updateMatrixWorld(true);
      assert.ok(
        node.matrixWorld.elements.every(
          (value, j) =>
            Math.abs(value - before.get(part.id)!.elements[j]) < 1e-10,
        ),
      );
    }
  }
  const state = transition(
    transition(createState(), { type: "seek", time: 60 }),
    { type: "locate", id: "dimm-07" },
  );
  assert.equal(state.level, "device");
  assert.equal(state.selected, "dimm-07");
  assert.equal(state.time, 60);
});

test("不完整的子件契约在变换前拒绝，不生成无几何的虚假部件", () => {
  const root = new THREE.Group();
  const groups = new Map<string, THREE.Group>();
  assert.throws(() => mapSubparts(root, groups), /缺少/);
  assert.equal(groups.size, 0);
});
