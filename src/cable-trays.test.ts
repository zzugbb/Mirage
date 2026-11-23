import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  cableTraySettings as s,
  trayEndpoints,
  trayRelations,
  rackTrayRelations,
  trayOuterWidth,
} from "./cable-trays.ts";
import { trayEndSupport } from "./fixture-crossing.ts";
import { fixtureById, fixtureSightOffsets } from "./fixtures.ts";
import { createRackRoof } from "./scene/rack-enclosure.ts";
import { buildCableTray } from "./scene/cable-trays.ts";
import { ShellCutaway } from "./scene/shell-cutaway.ts";
import { createReview, reviewTransition } from "./review-model.ts";

const instanceBounds = (mesh: THREE.InstancedMesh) => {
  mesh.geometry.computeBoundingBox();
  const matrix = new THREE.Matrix4();
  return Array.from({ length: mesh.count }, (_, i) => {
    mesh.getMatrixAt(i, matrix);
    return mesh.geometry.boundingBox!.clone().applyMatrix4(matrix);
  });
};
test("桥架关系中的预览不动镜头，定位在机房聚焦机柜，只有进入才改变层级", () => {
  const tray = reviewTransition(createReview(), {
    type: "focus-resource",
    id: "cable-tray-a",
  });
  const rackId = trayRelations("cable-tray-a")[0].id;
  const preview = reviewTransition(tray, { type: "pick", id: rackId });
  assert.equal(preview.scene.focusRevision, tray.scene.focusRevision);
  const focused = reviewTransition(tray, {
    type: "focus-resource",
    id: rackId,
  });
  assert.equal(focused.scene.selected, rackId);
  assert.equal(focused.scene.level, "room");
  assert.ok(focused.scene.focusRevision > tray.scene.focusRevision);
  assert.equal(focused.scene.time, tray.scene.time);
  const entered = reviewTransition(focused, {
    type: "open-resource",
    id: rackId,
  });
  assert.equal(entered.scene.level, "rack");
});
test("两排桥架端点、下方机柜与室内布置一致，不凭编号推断连接", () => {
  const seen = new Set<string>();
  for (const row of s.rows) {
    const f = fixtureById(row.fixtureId)!;
    assert.equal(f.kind, "cable-tray");
    assert.equal(f.dataStatus, "not-applicable");
    const [a, b] = trayEndpoints(f.id);
    assert.equal(b[0] - a[0], s.length);
    assert.ok(
      a[0] > -definition.room.size[0] / 2 && b[0] < definition.room.size[0] / 2,
    );
    assert.ok(f.position[1] + s.rodTopY < definition.room.size[1]);
    assert.ok(f.position[1] - s.rungSize[1] / 2 > definition.rack.size[1]);
    const relations = trayRelations(f.id);
    assert.equal(relations.length, 4);
    for (const relation of relations) {
      assert.match(relation.relation, /布置对应/);
      const rack = definition.installation.racks.find(
        (r) => r.id === relation.id,
      )!;
      assert.equal(rack.position[2], f.position[2]);
      assert.ok(rack.position[0] > a[0] && rack.position[0] < b[0]);
      assert.ok(!seen.has(rack.id));
      seen.add(rack.id);
    }
  }
  assert.equal(seen.size, 8);
  assert.deepEqual(trayRelations("unknown"), []);
  assert.deepEqual(trayEndpoints("leak-cable-01"), []);
});

test("每个机柜反查到登记的上方桥架，高差与实际横档和柜顶板一致", () => {
  const roof = createRackRoof();
  roof.updateMatrixWorld(true);
  const plate = new THREE.Box3().setFromObject(
    roof.getObjectByName("roof-plate")!,
  );
  for (const row of s.rows) {
    const tray = new THREE.Group();
    tray.position.fromArray(fixtureById(row.fixtureId)!.position);
    buildCableTray(tray);
    tray.updateMatrixWorld(true);
    const rungBottom = new THREE.Box3().setFromObject(tray.children[0]).min.y;
    for (const rack of definition.installation.racks.filter((r) =>
      row.rackIds.includes(r.id),
    )) {
      const relations = rackTrayRelations(rack.id);
      assert.deepEqual(
        relations.map((r) => r.id),
        [row.fixtureId],
      );
      assert.ok(trayRelations(row.fixtureId).some((r) => r.id === rack.id));
      const difference = rungBottom - (plate.max.y + rack.position[1]);
      assert.ok(difference > 0);
      assert.ok(relations[0].relation.includes(`${difference.toFixed(2)} m`));
    }
  }
  for (const id of ["room-01", "cable-tray-b", "srv-01", "unknown"])
    assert.deepEqual(rackTrayRelations(id), []);
});

test("桥架用两个实例批次表达，横档接合侧梁，吊杆接合承托梁，保留实体拾取", () => {
  const root = new THREE.Group();
  root.userData.entityId = "cable-tray-a";
  buildCableTray(root);
  assert.equal(root.children.length, 2);
  const ladder = root.children[0] as THREE.InstancedMesh;
  const supports = root.children[1] as THREE.InstancedMesh;
  const pieces = instanceBounds(ladder),
    beams = instanceBounds(supports);
  const envelope = pieces.reduce(
    (box, piece) => box.union(piece),
    new THREE.Box3(),
  );
  assert.ok(Math.abs(envelope.max.z - envelope.min.z - trayOuterWidth) < 1e-6);
  assert.ok(Math.abs(envelope.min.y + s.rungSize[1] / 2) < 1e-6);
  const rails = [pieces[0], pieces[3]];
  for (const rung of pieces.slice(6))
    for (const rail of rails) assert.ok(rung.intersectsBox(rail));
  for (let i = 0; i < beams.length; i += 5) {
    for (const rail of rails) {
      assert.ok(
        Math.abs(beams[i].max.y - rail.min.y) < 1e-6,
        "托架承接侧梁，不能悬空依赖错位横档",
      );
      assert.ok(beams[i].min.x < rail.max.x && beams[i].max.x > rail.min.x);
      assert.ok(beams[i].min.z < rail.max.z && beams[i].max.z > rail.min.z);
    }
    assert.ok(beams[i].intersectsBox(beams[i + 1]));
    assert.ok(beams[i].intersectsBox(beams[i + 3]));
  }
  root.updateMatrixWorld(true);
  const hits = new THREE.Raycaster(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ).intersectObject(root, true);
  assert.ok(hits.length > 0);
  assert.equal(hits[0].object.parent?.userData.entityId, "cable-tray-a");
  for (const mesh of [ladder, supports]) {
    assert.equal((mesh.material as THREE.Material).depthTest, true);
    assert.equal(mesh.userData.entityId, undefined);
    mesh.dispose();
    (mesh.material as THREE.Material).dispose();
  }
  ladder.geometry.dispose();
});

test("定位长桥架检查远端遮挡并保护自身，关闭建筑剖切恢复背景", () => {
  const f = fixtureById("cable-tray-a")!;
  const mount = new THREE.Group(),
    tray = new THREE.Group();
  tray.position.fromArray(f.position);
  mount.add(tray);
  buildCableTray(tray);
  const targets = fixtureSightOffsets(f.id).map((p) =>
    new THREE.Vector3().fromArray(p).add(tray.position),
  );
  assert.ok(targets.some((p) => p.x === -s.length / 2));
  assert.ok(targets.some((p) => p.x === s.length / 2));
  const obstruction = new THREE.Group();
  obstruction.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshBasicMaterial(),
    ),
  );
  const camera = new THREE.Vector3(0, 7, 9);
  obstruction.position.copy(camera).lerp(targets[0], 0.5);
  const cut = new ShellCutaway([mount, obstruction]);
  assert.equal(cut.update(camera, targets, true, tray), 1);
  assert.equal(mount.visible, true);
  assert.equal(obstruction.visible, false);
  cut.enabled = false;
  assert.equal(cut.update(camera, targets, true, tray), 0);
  assert.equal(obstruction.visible, true);
});

test("两排桥架两端的尺线命中端帽与最近横托，端柜从所属柜排按位置选取", () => {
  const root = new THREE.Group();
  buildCableTray(root);
  const caps = instanceBounds(
    root.getObjectByName("tray-ladder") as THREE.InstancedMesh,
  );
  const supports = instanceBounds(
    root.getObjectByName("tray-supports") as THREE.InstancedMesh,
  );
  for (const row of s.rows) {
    const origin = new THREE.Vector3().fromArray(
      fixtureById(row.fixtureId)!.position,
    );
    for (const side of [-1, 1] as const) {
      const pair = trayEndSupport(row.fixtureId, side)!;
      const [cap, support] = pair.points.map((p) => p.clone().sub(origin));
      const touching = (box: THREE.Box3, point: THREE.Vector3) =>
        box.distanceToPoint(point) < 1e-6;
      assert.ok(
        caps.some(
          (b) =>
            touching(b, cap) &&
            Math.abs(b.max.x - b.min.x - s.capLength) < 1e-6,
        ),
      );
      assert.ok(
        supports.some(
          (b) =>
            touching(b, support) &&
            Math.abs(b.max.z - b.min.z - s.supportWidth) < 1e-6,
        ),
      );
      assert.ok(Math.abs(pair.horizontal - 0.3225) < 1e-6);
      assert.ok(Math.abs(pair.toAxis - 0.35) < 1e-6);
      assert.ok(row.rackIds.includes(pair.rack.id));
      assert.match(pair.rack.name, side === 1 ? /04 机柜$/ : /01 机柜$/);
    }
  }
  assert.equal(trayEndSupport("room-01", 1), null);
});
