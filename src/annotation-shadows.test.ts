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

test("数据图形整组退出AO，实体透明网格不因材质相同被错误排除", async () => {
  const { createAnnotationGroup } = await import("./scene/annotations.ts");
  const scene = new THREE.Scene();
  const data = createAnnotationGroup("test");
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const marker = new THREE.Mesh(new THREE.PlaneGeometry(), material);
  data.add(marker);
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(), material);
  const disabled = createAnnotationGroup("hidden");
  disabled.visible = false;
  scene.add(data, physical, disabled);
  assert.throws(
    () =>
      withoutAnnotationOccluders(scene, () => {
        const visible: THREE.Object3D[] = [];
        scene.traverseVisible((o) => visible.push(o));
        assert.equal(visible.includes(marker), false);
        assert.equal(visible.includes(physical), true);
        assert.equal(marker.visible, true);
        throw Error("中断");
      }),
    /中断/,
  );
  assert.equal(data.visible, true);
  assert.equal(disabled.visible, false);
  assert.equal(marker.material, material);
  assert.equal(physical.material, material);
});

test("温度、气流、指标、连接、通道和告警均登记数据图形根节点", async () => {
  const { TemperatureSliceGeometry } =
    await import("./scene/temperature-slice.ts");
  const { AirflowGeometry } = await import("./scene/airflow.ts");
  const { ReviewDataGeometry } = await import("./scene/review-data.ts");
  const { PowerGeometry } = await import("./scene/power.ts");
  const { NetworkGeometry } = await import("./scene/network.ts");
  const { MaintenanceGeometry } = await import("./scene/maintenance.ts");
  const { SpatialSignals } = await import("./scene/signals.ts");
  for (const Type of [
    TemperatureSliceGeometry,
    AirflowGeometry,
    ReviewDataGeometry,
    PowerGeometry,
    NetworkGeometry,
    MaintenanceGeometry,
    SpatialSignals,
  ]) {
    const data = new Type();
    const scene = new THREE.Scene();
    scene.add(data.root);
    data.root.visible = true;
    withoutAnnotationOccluders(scene, () =>
      assert.equal(data.root.visible, false),
    );
    assert.equal(data.root.visible, true);
  }
});
