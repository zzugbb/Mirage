import {
  condensate,
  mouthGap,
  turn,
  elbow,
  rim,
  condensateFloorY,
  drainStands,
  nearestCondensateSensing,
  condensateSensingSegments,
  distanceToReceiver,
} from "./condensate.ts";
import { leakDetection } from "./leak-detection.ts";
import { leakInspection } from "./leak-view.ts";
import { racewayNeighbors } from "./panel-raceway.ts";
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
  assert.equal(fixtures.size, 26);
  assert.equal(new Set(roomFixtures.map((f) => f.id)).size, 26);
  for (const f of roomFixtures) {
    assert.equal(entityById(f.id)?.kind, "facility");
    assert.equal(entityById(f.id)?.parent, "room-01");
    const group = fixtures.get(f.id)!;
    assert.equal(group.parent, mounts.get(f.mountId));
    assert.equal(group.userData.entityId, f.id);
    assert.equal(
      group.userData.dataStatus,
      [
        "patch-panel",
        "wall-raceway",
        "exit-sign",
        "condensate-stand",
        "condensate-pipe",
        "condensate-receiver",
        "cable-tray",
        "entrance",
        "ceiling-light",
        "floor-grille-row",
      ].includes(f.kind)
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

test("后墙线槽沿安装面相接，两处竖段落在各自箱顶且可双向查回", () => {
  const { fixtures } = makeFixtures();
  const { drops, trunk, width, depth } = definition.room.panelRaceway;
  const bounds = (id: string) =>
    new THREE.Box3().setFromObject(fixtures.get(id)!);
  const horizontal = bounds(trunk.id);
  // 在横槽两端和中点沿配置视线检查 B 排桥架，避免取景正好打在桥架侧梁上。
  const tray = bounds("cable-tray-b");
  const sight = new THREE.Vector3()
    .fromArray(trunk.focus.direction)
    .normalize();
  for (const fraction of [0.01, 0.5, 0.99]) {
    const point = horizontal.getCenter(new THREE.Vector3());
    point.x = THREE.MathUtils.lerp(
      horizontal.min.x,
      horizontal.max.x,
      fraction,
    );
    assert.equal(new THREE.Ray(point, sight).intersectsBox(tray), false);
  }
  const near = (a: number, b: number) =>
    assert.ok(Math.abs(a - b) < 1e-6, `${a} / ${b}`);
  assert.deepEqual(
    racewayNeighbors(trunk.id).map((s) => s.id),
    drops.map((d) => d.id),
  );
  for (const drop of drops) {
    const panel = bounds(drop.panelId);
    const vertical = bounds(drop.id);
    near(vertical.min.y, panel.max.y);
    near(vertical.max.y, horizontal.min.y);
    near(vertical.min.z, panel.min.z);
    near(vertical.min.z, horizontal.min.z);
    assert.ok(vertical.min.x > panel.min.x && vertical.max.x < panel.max.x);
    assert.ok(vertical.max.z <= panel.max.z);
    near(vertical.max.x - vertical.min.x, width);
    near(horizontal.max.z - horizontal.min.z, depth + 0.004);
    assert.deepEqual(
      racewayNeighbors(drop.id).map((s) => s.id),
      [drop.panelId, trunk.id],
    );
    assert.deepEqual(
      racewayNeighbors(drop.panelId).map((s) => s.id),
      [drop.id],
    );
  }
  const dropBoxes = drops.map((drop) => bounds(drop.id));
  near(horizontal.min.x, Math.min(...dropBoxes.map((b) => b.min.x)));
  near(horizontal.max.x, Math.max(...dropBoxes.map((b) => b.max.x)));
  assert.deepEqual(racewayNeighbors("srv-01"), []);
});

test("冷凝水管口与接水斗同轴且留有配置间隔，斗口与管口均保持敞开", () => {
  const { fixtures } = makeFixtures();
  const pipe = fixtures.get(condensate.pipe.id)!;
  const receiver = fixtures.get(condensate.receiver.id)!;
  const pipeBox = new THREE.Box3().setFromObject(pipe);
  const bowlBox = new THREE.Box3().setFromObject(receiver);
  assert.ok(Math.abs(pipeBox.min.y - bowlBox.max.y - mouthGap) < 1e-6);
  assert.ok(Math.abs(condensateFloorY - bowlBox.min.y) < 1e-6);
  const center = receiver.position.clone();
  const axis = new THREE.Vector3(0, 1, 0);
  const bore = new THREE.Raycaster(center, axis, 0, mouthGap + 0.03);
  assert.equal(bore.intersectObject(pipe, true).length, 0);
  bore.ray.origin.x += condensate.pipeRadius * 0.9;
  const lip = bore.intersectObject(pipe, true)[0];
  assert.equal(lip.object.name, "condensate-mouth");
  assert.ok(Math.abs(lip.distance - mouthGap) < 1e-6);
  const down = axis.negate();
  const through = new THREE.Raycaster(center.clone(), down);
  assert.equal(through.intersectObject(receiver, true).length, 0);
  through.ray.origin.x += condensate.rimRadius * 0.8;
  assert.equal(
    through.intersectObject(receiver, true)[0].object.name,
    "condensate-receiver",
  );
});

test("斜管两支座从地面底板接到管夹，管夹轴线与管道共线且内壁贴合管外径", () => {
  const { fixtures } = makeFixtures();
  const v = (p: number[]) => new THREE.Vector3().fromArray(p);
  const axis = v(elbow).sub(v(turn)).normalize();
  const pipeLine = new THREE.Line3(v(turn), v(elbow));
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6);
  for (const stand of drainStands) {
    const group = fixtures.get(stand.id)!;
    group.updateWorldMatrix(true, true);
    const clamp = group.getObjectByName(
      "drain-stand-clamp",
    ) as THREE.Mesh<THREE.LatheGeometry>;
    const center = clamp.getWorldPosition(new THREE.Vector3());
    near(
      center.distanceTo(
        pipeLine.closestPointToPoint(center, true, new THREE.Vector3()),
      ),
      0,
    );
    near(center.z - turn[2], stand.offset);
    near(
      new THREE.Vector3(0, 1, 0).applyQuaternion(clamp.quaternion).dot(axis),
      1,
    );
    near(
      Math.min(...clamp.geometry.parameters.points.map((p) => p.x)),
      condensate.pipeRadius,
    );
    const foot = new THREE.Box3().setFromObject(
      group.getObjectByName("drain-stand-foot")!,
    );
    const post = new THREE.Box3().setFromObject(
      group.getObjectByName("drain-stand-post")!,
    );
    const bowl = fixtures.get(condensate.receiver.id)!;
    bowl.updateWorldMatrix(true, true);
    assert.ok(
      !new THREE.Box3()
        .setFromObject(group)
        .intersectsBox(new THREE.Box3().setFromObject(bowl)),
    );
    near(foot.min.y, condensateFloorY);
    near(foot.max.y, post.min.y);
    assert.ok(
      post.max.y >
        center.y - condensate.pipeRadius - condensate.supports.clampThickness &&
        post.max.y < center.y - condensate.pipeRadius,
    );
  }
  const [up, down] = drainStands;
  near(down.axis[2] - up.axis[2], 0.26);
  near(up.axis[1] - down.axis[1], 0.0104);
});

test("逐段最近点与沿线里程使用同一条配置折线，按指定里程重定位仍能核对斗口", () => {
  assert.equal(
    condensateSensingSegments.length,
    leakDetection.sensingPoints.length - 1,
  );
  for (const entry of condensateSensingSegments) {
    const floor = leakInspection("floor", {
      fromJoint: entry.fromJoint,
    }).floor!;
    assert.equal(floor.index, entry.segment - 1);
    assert.ok(
      floor.point.distanceTo(new THREE.Vector3().fromArray(entry.point)) < 1e-9,
    );
    for (let i = 0; i <= 100; i++) {
      const sample = floor.start.clone().lerp(floor.end, i / 100);
      assert.ok(entry.distance <= distanceToReceiver(sample.toArray()) + 1e-9);
    }
    assert.ok(
      Math.abs(entry.distance - distanceToReceiver(floor.point.toArray())) <
        1e-9,
    );
  }
  assert.deepEqual(
    condensateSensingSegments.map((s) => s.fromJoint.toFixed(3)),
    ["1.345", "1.750", "3.005"],
  );
  assert.deepEqual(
    condensateSensingSegments.map((s) => s.distance.toFixed(3)),
    ["0.250", "0.155", "1.100"],
  );
  for (const station of [0, 1.5, 2.85, 4.35]) {
    const f = leakInspection("floor", { fromJoint: station }).floor!;
    assert.equal(
      distanceToReceiver(f.point.toArray()),
      Math.hypot(f.point.x - rim[0], f.point.z - rim[2]),
    );
  }
});

test("接水斗轴线投影定位到已登记感应段的最近点，实际布置留出该点的俯视视线", () => {
  const { fixtures } = makeFixtures();
  const near = nearestCondensateSensing;
  const floor = leakInspection("floor", { fromJoint: near.fromJoint }).floor!;
  assert.equal(condensate.sensingCableId, leakDetection.cableId);
  assert.equal(condensate.sourceId, leakDetection.nearbyFacilityId);
  assert.equal(floor.index + 1, near.segment);
  const perpendicular = floor.point
    .clone()
    .sub(new THREE.Vector3().fromArray(rim));
  perpendicular.y = 0;
  assert.ok(Math.abs(perpendicular.length() - near.distance) < 1e-9);
  assert.ok(
    Math.abs(perpendicular.dot(floor.end.clone().sub(floor.start))) < 1e-9,
  );
  assert.ok(near.distance > condensate.rimRadius + leakDetection.sensingRadius);
  const ray = new THREE.Raycaster(
    floor.point.clone().add(new THREE.Vector3(0, 2, 0)),
    new THREE.Vector3(0, -1, 0),
  );
  const scene = [
    condensate.pipe.id,
    condensate.receiver.id,
    condensate.sensingCableId,
  ].map((id) => fixtures.get(id)!);
  for (const group of scene) group.updateWorldMatrix(true, true);
  assert.equal(
    ray.intersectObjects(scene, true)[0].object.parent?.name,
    "leak-sensing",
  );
});
