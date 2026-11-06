import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { withoutAnnotationOccluders } from "./scene/annotation-shadows.ts";

test("接触阴影只排除文字精灵，实体和原有隐藏状态保持不变", () => {
  const scene = new THREE.Scene();
  const label = new THREE.Sprite();
  const hiddenLabel = new THREE.Sprite();
  hiddenLabel.visible = false;
  const hiddenParent = new THREE.Group();
  hiddenParent.visible = false;
  const nestedLabel = new THREE.Sprite();
  hiddenParent.add(nestedLabel);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial(),
  );
  const line = new THREE.Line();
  scene.add(label, hiddenLabel, hiddenParent, body, line);
  const original = [
    label,
    hiddenLabel,
    hiddenParent,
    nestedLabel,
    body,
    line,
  ].map((o) => o.visible);
  const material = label.material;
  for (let i = 0; i < 3; i++) {
    const result = withoutAnnotationOccluders(scene, () => {
      assert.equal(label.visible, false);
      assert.equal(hiddenLabel.visible, false);
      assert.equal(nestedLabel.visible, false);
      assert.equal(body.visible, true);
      assert.equal(line.visible, true);
      assert.equal(hiddenParent.visible, false);
      return 42;
    });
    assert.equal(result, 42);
    assert.deepEqual(
      [label, hiddenLabel, hiddenParent, nestedLabel, body, line].map(
        (o) => o.visible,
      ),
      original,
    );
    assert.equal(label.material, material);
  }
});

test("阴影绘制异常或嵌套调用后仍恢复文字，不污染后续标准画质", () => {
  const scene = new THREE.Scene();
  const label = new THREE.Sprite();
  scene.add(label);
  assert.throws(
    () =>
      withoutAnnotationOccluders(scene, () => {
        withoutAnnotationOccluders(scene, () =>
          assert.equal(label.visible, false),
        );
        assert.equal(label.visible, false);
        throw Error("绘制中断");
      }),
    /绘制中断/,
  );
  assert.equal(label.visible, true);
});
