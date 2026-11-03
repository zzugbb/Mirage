import { boundsFrameDistance } from "./camera.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  entranceSettings as s,
  entranceFixture as fixture,
  entranceOpening,
  entranceRelations,
} from "./entrance.ts";
import { fixtureById, fixtureSightOffsets } from "./fixtures.ts";
import { buildEntrance } from "./scene/entrance.ts";
import { buildRoomShell } from "./scene/room.ts";
import { ShellCutaway } from "./scene/shell-cutaway.ts";

function dispose(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
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
function makeEntrance() {
  const root = new THREE.Group();
  root.position.fromArray(fixture.position);
  root.userData.entityId = fixture.id;
  const pivot = buildEntrance(root);
  root.updateMatrixWorld(true);
  return { root, pivot };
}

test("入口门、门洞与读卡器共用登记位置，只建立布置对应", () => {
  const reader = fixtureById(s.readerId)!;
  assert.deepEqual(
    entranceRelations(fixture.id).map((r) => r.id),
    [reader.id],
  );
  assert.deepEqual(
    entranceRelations(reader.id).map((r) => r.id),
    [fixture.id],
  );
  assert.deepEqual(entranceRelations("unknown"), []);
  assert.equal(fixture.dataStatus, "not-applicable");
  assert.equal(reader.dataStatus, "not-connected");
  assert.equal(fixture.mountId, reader.mountId);
  assert.ok(reader.position[0] + 0.13 / 2 < entranceOpening.left);
  assert.ok(
    Math.abs(entranceOpening.bottom - definition.rendering.floor.surfaceY) <
      1e-8,
  );
  assert.ok(entranceOpening.left > -definition.room.size[0] / 2);
  assert.ok(entranceOpening.right < definition.room.size[0] / 2);
});

test("展示门扇避开地面和门框，双面把手接合，五金随同一铰轴安装且可拾取", () => {
  const { root, pivot } = makeEntrance();
  assert.equal(pivot.rotation.y, s.displayAngle);
  const panel = root.getObjectByName("entrance-leaf") as THREE.Mesh;
  const bounds = new THREE.Box3().setFromObject(panel);
  assert.ok(bounds.min.y > definition.rendering.floor.surfaceY);
  assert.ok(bounds.max.y < entranceOpening.top - s.frameWidth);
  assert.ok(bounds.min.x > entranceOpening.left + s.frameWidth);
  assert.ok(bounds.max.x < entranceOpening.right - s.frameWidth);
  const hinges = root.children.filter((o) => o.name === "entrance-hinge");
  assert.equal(hinges.length, 3);
  for (const hinge of hinges) {
    assert.equal(hinge.position.x, pivot.position.x);
    assert.equal(hinge.position.z, pivot.position.z);
  }
  for (const side of [-1, 1]) {
    const stem = new THREE.Box3().setFromObject(
      root.getObjectByName(`entrance-handle-stem-${side}`)!,
    );
    const plate = new THREE.Box3().setFromObject(
      root.getObjectByName(`entrance-handle-plate-${side}`)!,
    );
    const handle = new THREE.Box3().setFromObject(
      root.getObjectByName(`entrance-handle-${side}`)!,
    );
    assert.ok(stem.intersectsBox(plate));
    assert.ok(stem.intersectsBox(handle));
  }
  const target = panel.localToWorld(
    new THREE.Vector3(0, 0, s.leafThickness / 2),
  );
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(
    panel.getWorldQuaternion(new THREE.Quaternion()),
  );
  const hits = new THREE.Raycaster(
    target.clone().addScaledVector(direction, -1),
    direction,
  ).intersectObject(root, true);
  assert.ok(hits.some((hit) => hit.object === panel));
  // 仅验证装配闭合姿态的间隙；应用不提供动态开门控制。
  pivot.rotation.y = 0;
  root.updateMatrixWorld(true);
  const closed = new THREE.Box3().setFromObject(panel);
  assert.ok(
    Math.abs(closed.min.x - entranceOpening.left - s.frameWidth - s.edgeGap) <
      1e-6,
  );
  assert.ok(
    Math.abs(closed.max.x - entranceOpening.right + s.frameWidth + s.edgeGap) <
      1e-6,
  );
  dispose(root);
});

test("墙体与装饰条绕开真实门洞，门扇附近没有已登记设备穿插", () => {
  const root = new THREE.Group();
  const box = (
    parent: THREE.Object3D,
    size: number[],
    position: number[],
    color: string,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...(size as [number, number, number])),
      new THREE.MeshStandardMaterial({ color }),
    );
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  };
  const { fixtures } = buildRoomShell(root, box, box, () => new THREE.Sprite());
  root.updateMatrixWorld(true);
  const entry = fixtures.get(fixture.id)!;
  const leaf = entry.getObjectByName("entrance-leaf")!;
  const leafBounds = new THREE.Box3().setFromObject(leaf);
  for (const facility of definition.facilities) {
    const bounds = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(...facility.position),
      new THREE.Vector3(...facility.size),
    );
    assert.equal(leafBounds.intersectsBox(bounds), false);
  }
  entry.removeFromParent();
  root.updateMatrixWorld(true);
  for (const x of [fixture.position[0], 4.5]) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(x, 1, -5),
      new THREE.Vector3(0, 0, -1),
      0,
      2,
    );
    assert.equal(ray.intersectObject(root, true).length, 0, "墙缝不能跨过门洞");
  }
  const ray = new THREE.Raycaster(
    new THREE.Vector3(entranceOpening.right + 0.2, 1, -5),
    new THREE.Vector3(0, 0, -1),
    0,
    2,
  );
  assert.ok(ray.intersectObject(root, true).length > 0);
  dispose(entry);
  dispose(root);
});

test("定位入口保护安装墙面，并检查门框与门扇边缘的遮挡", () => {
  const { root } = makeEntrance(),
    wall = new THREE.Group();
  wall.add(root);
  wall.updateMatrixWorld(true);
  const targets = fixtureSightOffsets(fixture.id).map((p) =>
    root.localToWorld(new THREE.Vector3(...p)),
  );
  assert.equal(targets.length, 4);
  const blocker = new THREE.Group();
  blocker.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2)));
  const camera = new THREE.Vector3(4, 3, -1);
  blocker.position.copy(camera).lerp(targets[0], 0.5);
  const cutaway = new ShellCutaway([wall, blocker]);
  assert.equal(cutaway.update(camera, targets, true, root), 1);
  assert.equal(wall.visible, true);
  assert.equal(blocker.visible, false);
  cutaway.enabled = false;
  cutaway.update(camera, targets, true, root);
  assert.equal(blocker.visible, true);
  dispose(root);
  dispose(blocker);
});

test("入口默认定位从右侧通道观察，桌面和窄屏视线避开机柜与邻近设施", () => {
  const { root } = makeEntrance();
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const direction = new THREE.Vector3(...fixture.focus.direction).normalize();
  const blockers = [
    ...definition.installation.racks.map((rack) =>
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(
          rack.position[0],
          rack.position[1] + definition.rack.size[1] / 2,
          rack.position[2],
        ),
        new THREE.Vector3(...definition.rack.size),
      ),
    ),
    ...definition.facilities.map((facility) =>
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(...facility.position),
        new THREE.Vector3(...facility.size),
      ),
    ),
  ];
  const targets = [
    center,
    ...fixtureSightOffsets(fixture.id).map((point) =>
      root.localToWorld(new THREE.Vector3(...point)),
    ),
  ];
  for (const aspect of [852 / 836, 744 / 704, 390 / 580]) {
    const distance = boundsFrameDistance(
      size.toArray(),
      direction.toArray(),
      aspect,
      fixture.focus.distance,
    );
    const camera = center.clone().addScaledVector(direction, distance);
    for (const target of targets) {
      const ray = new THREE.Ray(camera, target.clone().sub(camera).normalize());
      for (const blocker of blockers) {
        const hit = ray.intersectBox(blocker, new THREE.Vector3());
        assert.ok(!hit || camera.distanceTo(hit) >= camera.distanceTo(target));
      }
    }
  }
  dispose(root);
});
