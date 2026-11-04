import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SelectionCorners } from "./scene/selection.ts";
import { SpatialSignals, visibleSignal } from "./scene/signals.ts";
import { spatialSnapshot } from "./spatial.ts";
import { createState } from "./domain.ts";
import { rackForDevice } from "./installation.ts";
import type { SceneModel } from "./scene/models.ts";

test("选择角标只有24条短边，跟随包围范围并复用缓冲；射线不选中辅助标记", () => {
  const mark = new SelectionCorners();
  const geometry = mark.geometry,
    positions = mark.positions;
  mark.box.set(new THREE.Vector3(-1, 0, -0.5), new THREE.Vector3(1, 3, 0.5));
  mark.update("rack", 100, true, 0);
  assert.equal(mark.visible, true);
  assert.equal(mark.geometry.attributes.position.count, 48);
  for (let i = 0; i < positions.length; i += 6) {
    const a = new THREE.Vector3().fromArray(positions, i),
      b = new THREE.Vector3().fromArray(positions, i + 3);
    assert.ok(mark.box.containsPoint(a));
    assert.ok(mark.box.containsPoint(b));
    assert.ok(a.distanceTo(b) > 0 && a.distanceTo(b) < 0.5);
  }
  mark.box.translate(new THREE.Vector3(2, 1, 3));
  mark.update("rack", 500, true, 0);
  assert.equal(mark.geometry, geometry);
  assert.equal(mark.positions, positions);
  assert.ok(
    mark.geometry.boundingSphere!.center.distanceTo(
      new THREE.Vector3(2, 2.5, 3),
    ) < 1e-6,
  );
  assert.deepEqual(
    new THREE.Raycaster(
      new THREE.Vector3(2, 2.5, 10),
      new THREE.Vector3(0, 0, -1),
    ).intersectObject(mark),
    [],
  );
  mark.update(null, 600, false);
  assert.equal(mark.visible, false);
  mark.geometry.dispose();
  mark.material.dispose();
});
test("选择收拢只播放一次，时间回看不重触发；减少动态效果立即静止", () => {
  const m = new SelectionCorners();
  m.box.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
  m.update("cpu:1", 100, false, 0);
  const first = m.positions[0];
  m.update("cpu:1", 340, false, 0);
  const settled = Array.from(m.positions);
  assert.ok(first < settled[0]);
  m.update("cpu:1", 800, false, 0);
  assert.deepEqual(Array.from(m.positions), settled);
  m.update("cpu:2", 900, false, 0);
  assert.equal(m.positions[0], first);
  m.update("memory:2", 910, true, 0);
  assert.deepEqual(Array.from(m.positions), settled);
  assert.equal(m.material.depthTest, true);
  assert.equal(m.material.depthWrite, false);
  m.geometry.dispose();
  m.material.dispose();
});
test("告警符号只在告警视图出现，运行状态、数据质量和模型评估不混入", () => {
  const readings = spatialSnapshot(60).readings;
  for (const mode of ["object", "status", "temperature", "power"])
    for (const reading of readings.values())
      assert.equal(visibleSignal(reading, mode), null);
  assert.equal(visibleSignal(readings.get("rack-a01"), "alarms"), "critical");
  assert.equal(visibleSignal(readings.get("rack-a02"), "alarms"), "warning");
  for (const id of ["rack-a03", "srv-25", "cpu-01"])
    assert.equal(visibleSignal(readings.get(id), "alarms"), null);
});
test("告警图形按层级定位，当前设备随抽出位移；深度、相机朝向与资源释放完整", () => {
  const marks = new SpatialSignals(),
    state = createState(),
    readings = spatialSnapshot(60).readings;
  const server = new THREE.Group();
  server.position.set(1, 1, 1);
  server.updateMatrixWorld();
  const models = { server } as SceneModel,
    camera = new THREE.PerspectiveCamera();
  camera.rotation.y = 0.6;
  marks.update(state, "alarms", readings, models, 0, camera);
  assert.ok(marks.rackMarks.some((m) => m.root.visible));
  assert.ok(marks.deviceMarks.every((m) => !m.root.visible));
  assert.equal(
    marks.rackMarks.find((m) => m.id === "rack-a03")!.root.visible,
    false,
  );
  for (const m of marks.rackMarks.filter((m) => m.root.visible)) {
    assert.deepEqual(m.root.quaternion.toArray(), camera.quaternion.toArray());
    assert.equal(m.material.depthTest, true);
    assert.equal(m.material.transparent, true);
  }
  const rackState = { ...state, level: "rack" as const, deviceId: "srv-01" };
  marks.update(rackState, "alarms", readings, models, 0, camera);
  assert.ok(marks.rackMarks.every((m) => !m.root.visible));
  const mark = marks.deviceMarks.find((m) => m.id === "srv-01")!;
  assert.equal(mark.root.visible, true);
  const z = mark.root.position.z;
  server.position.z += 0.58;
  server.updateMatrixWorld();
  marks.update(rackState, "alarms", readings, models, 0, camera);
  assert.ok(Math.abs(mark.root.position.z - z - 0.58) < 1e-6);
  assert.ok(
    marks.deviceMarks
      .filter((m) => m.root.visible)
      .every((m) => rackForDevice(m.id).id === rackForDevice("srv-01").id),
  );
  marks.update(
    { ...rackState, level: "device" },
    "alarms",
    readings,
    models,
    1,
    camera,
  );
  assert.ok(
    [...marks.rackMarks, ...marks.deviceMarks].every((m) => !m.root.visible),
  );
  let disposed = 0;
  Object.values(marks.geometries).forEach((g) =>
    g.addEventListener("dispose", () => disposed++),
  );
  marks.dispose();
  assert.equal(disposed, 2);
  assert.equal(marks.root.children.length, 0);
});

test("装机角标复用安装外廓，忽略隐藏的展开部件并跟随导轨位移", () => {
  const material = new THREE.MeshBasicMaterial();
  const proxy = new THREE.Mesh(
    new THREE.BoxGeometry(0.4826, 0.089, 0.9),
    material,
  );
  proxy.position.set(-3, 1, 2);
  const active = new THREE.Group();
  active.position.copy(proxy.position);
  const hidden = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), material);
  hidden.visible = false;
  hidden.position.set(0, 4, 0);
  active.add(hidden);
  const marker = new SelectionCorners();
  for (const travel of [0, 0.45, 0]) {
    active.position.z = proxy.position.z + travel;
    marker.setInstalledBox(active, proxy);
    const expected = new THREE.Box3()
      .setFromObject(proxy)
      .translate(new THREE.Vector3(0, 0, travel));
    assert.ok(
      marker.box.min.distanceTo(expected.min) < 1e-8 &&
        marker.box.max.distanceTo(expected.max) < 1e-8,
    );
  }
  marker.geometry.dispose();
  marker.material.dispose();
  hidden.geometry.dispose();
  proxy.geometry.dispose();
  material.dispose();
});
