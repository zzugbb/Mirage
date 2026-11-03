import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
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

test("十处布置设施的身份、安装对象与场景位置一致，几何可射线选择", () => {
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
  assert.equal(fixtures.size, 10);
  assert.equal(new Set(roomFixtures.map((f) => f.id)).size, 10);
  for (const f of roomFixtures) {
    assert.equal(entityById(f.id)?.kind, "facility");
    assert.equal(entityById(f.id)?.parent, "room-01");
    const group = fixtures.get(f.id)!;
    assert.equal(group.parent, mounts.get(f.mountId));
    assert.equal(group.userData.entityId, f.id);
    assert.equal(
      group.userData.dataStatus,
      ["cable-tray", "entrance"].includes(f.kind)
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
    const point = new THREE.Vector3().fromArray(f.position);
    assert.ok(
      new THREE.Raycaster(
        point.clone().add(new THREE.Vector3(0, 0, 1)),
        new THREE.Vector3(0, 0, -1),
      ).intersectObject(group, true).length > 0,
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
