import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  ceilingLights,
  diffuserBottom,
  lightTrayRelations,
} from "./ceiling-lights.ts";
import { roomFixtures } from "./fixtures.ts";
import { entityById, presentationKey } from "./domain.ts";
import { findResources } from "./review-resources.ts";
import {
  createReview,
  reviewTransition,
  reviewHistories,
} from "./review-model.ts";
import { selectedReading, spatialSnapshot } from "./spatial.ts";
import { visibleResourceRows } from "./workspace-presets.ts";
import { buildRoomFixtures } from "./scene/fixtures.ts";

function makeFixtures() {
  const mounts = new Map(
    [...new Set(roomFixtures.map((f) => f.mountId))].map((id) => [
      id,
      new THREE.Group(),
    ]),
  );
  const fixtures = buildRoomFixtures(
    mounts,
    (parent, size, position, color) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...(size as [number, number, number])),
        new THREE.MeshStandardMaterial({ color }),
      );
      mesh.position.fromArray(position);
      parent.add(mesh);
      return mesh;
    },
  );
  return { mounts, fixtures };
}

test("机房布置设施的身份、安装对象与场景位置一致，几何可射线选择", () => {
  const { mounts, fixtures } = makeFixtures();
  assert.equal(fixtures.size, 13);
  assert.equal(new Set(roomFixtures.map((f) => f.id)).size, 13);
  for (const f of roomFixtures) {
    assert.equal(entityById(f.id)?.kind, "facility");
    assert.equal(entityById(f.id)?.parent, "room-01");
    const group = fixtures.get(f.id)!;
    assert.equal(group.parent, mounts.get(f.mountId));
    assert.equal(group.userData.entityId, f.id);
    assert.equal(
      group.userData.dataStatus,
      ["cable-tray", "entrance", "ceiling-light"].includes(f.kind)
        ? "not-applicable"
        : "not-connected",
    );
    group.updateWorldMatrix(true, true);
    assert.deepEqual(
      group.getWorldPosition(new THREE.Vector3()).toArray(),
      f.position,
    );
    assert.ok(Math.abs(f.position[0]) < definition.room.size[0] / 2);
    assert.ok(f.position[1] > 0 && f.position[1] < definition.room.size[1]);
    assert.ok(Math.abs(f.position[2]) < definition.room.size[2] / 2);
    const origin = new THREE.Vector3().fromArray(f.position);
    origin.z = new THREE.Box3().setFromObject(group).max.z + 1;
    assert.ok(
      new THREE.Raycaster(origin, new THREE.Vector3(0, 0, -1)).intersectObject(
        group,
        true,
      ).length > 0,
    );
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
  }
});

test("设施可按类型、编号和安装位置查找，不参加设备告警、汇总或伪造曲线", () => {
  const state = createReview().scene;
  assert.equal(findResources(state, "烟感", "facility").length, 2);
  assert.equal(
    findResources(state, "左墙 后段", "all")[0].id,
    "environment-02",
  );
  for (const f of roomFixtures) {
    assert.equal(findResources(state, f.id, "all")[0].id, f.id);
    assert.ok(findResources(state, "", "all").some((r) => r.id === f.id));
    for (const time of [0, 60, 120]) {
      const snapshot = spatialSnapshot(time);
      assert.equal(snapshot.readings.get("room-01")!.count, 84);
      assert.equal(
        selectedReading({ ...state, selected: f.id }, snapshot.readings),
        null,
      );
      assert.equal(
        visibleResourceRows(
          findResources(state, f.id, "all"),
          snapshot.readings,
          true,
        ).length,
        0,
      );
    }
    const histories = reviewHistories(f.id, state.deviceId);
    assert.ok(
      Object.values(histories)
        .flat()
        .every((point) => point.value === null && point.count === 0),
    );
  }
});

test("设施预览不改变镜头与设备姿态；跨层定位先归位，再返回设施，共享时间不重置", () => {
  let review = createReview();
  const before = review.scene;
  review = reviewTransition(review, { type: "pick", id: "environment-01" });
  assert.deepEqual(review.scene, { ...before, selected: "environment-01" });
  review = reviewTransition(review, { type: "open-resource", id: "srv-01" });
  review = reviewTransition(review, { type: "open-resource", id: "srv-01" });
  review = reviewTransition(review, {
    type: "scene",
    action: { type: "explode", amount: 1 },
  });
  const expanded = review.scene;
  review = reviewTransition(review, { type: "pick", id: "access-reader-01" });
  assert.equal(review.scene, expanded);
  review = reviewTransition(review, {
    type: "open-resource",
    id: "access-reader-01",
  });
  assert.equal(review.pendingId, "access-reader-01");
  assert.equal(review.scene.level, "rack");
  assert.equal(review.scene.explosion, 0);
  review = reviewTransition(review, {
    type: "navigation-ready",
    key: presentationKey(review.scene),
  });
  assert.equal(review.scene.level, "room");
  assert.equal(review.scene.selected, "access-reader-01");
  assert.equal(review.pendingId, null);
  assert.equal(review.scene.time, before.time);
  assert.equal(review.scene.coverOpen, false);
});

test("三条顶灯与两段桥架的投影逐一相交，灯体和吊杆均避开桥架实体", () => {
  const { fixtures } = makeFixtures();
  const trays = roomFixtures.filter((f) => f.kind === "cable-tray");
  const blockers: THREE.Box3[] = [];
  for (const tray of trays) {
    const group = fixtures.get(tray.id)!;
    group.updateWorldMatrix(true, true);
    for (const mesh of group.children as THREE.InstancedMesh[]) {
      mesh.geometry.computeBoundingBox();
      const matrix = new THREE.Matrix4();
      for (let index = 0; index < mesh.count; index++) {
        mesh.getMatrixAt(index, matrix);
        blockers.push(
          mesh.geometry
            .boundingBox!.clone()
            .applyMatrix4(matrix.premultiply(mesh.matrixWorld)),
        );
      }
    }
    assert.deepEqual(
      lightTrayRelations(tray.id).map((r) => r.id),
      ceilingLights.map((l) => l.id),
    );
  }
  for (const light of ceilingLights) {
    assert.deepEqual(
      lightTrayRelations(light.id).map((r) => r.id),
      trays.map((t) => t.id),
    );
    const group = fixtures.get(light.id)!;
    const bounds = new THREE.Box3().setFromObject(group);
    assert.ok(Math.abs(bounds.max.y - definition.room.size[1]) < 1e-6);
    assert.ok(
      Math.abs(bounds.min.y - (light.position[1] + diffuserBottom)) < 1e-6,
    );
    for (const part of group.children) {
      const piece = new THREE.Box3().setFromObject(part);
      assert.ok(
        blockers.every((box) => !piece.intersectsBox(box)),
        light.id,
      );
    }
    // 取灯罩两端内侧的真实向上射线，确认查找到的对象与可见发光面相同。
    group.updateWorldMatrix(true, true);
    for (const side of [-1, 1]) {
      const origin = new THREE.Vector3(
        light.position[0],
        bounds.min.y - 0.1,
        light.position[2] + side * (light.length / 2 - 0.01),
      );
      const hit = new THREE.Raycaster(
        origin,
        new THREE.Vector3(0, 1, 0),
        0,
        0.2,
      ).intersectObject(group, true)[0];
      assert.equal(hit?.object.parent?.userData.entityId, light.id);
      assert.ok(Math.abs(hit.point.y - bounds.min.y) < 1e-6);
    }
  }
});
