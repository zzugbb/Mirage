import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { racewaySections } from "./panel-raceway.ts";
import {
  rearWallCrossing,
  rearWallCrossingFrame,
  rearWallItems,
  rearWallNeighbor,
  rearWallSize,
} from "./rear-wall.ts";
import { roomLayoutMatches, roomLayoutScopeItems } from "./room-layout.ts";
import { roomFixtures } from "./fixtures.ts";
import { buildRoomFixtures } from "./scene/fixtures.ts";

test("后墙立面与三维使用同一组安装点和槽段，按水平位置和高度排列", () => {
  const mounted = [...definition.room.fixtures, ...racewaySections].filter(
    (f) => f.mountId === "shell-back-wall",
  );
  assert.equal(mounted.length, 9);
  assert.deepEqual(
    rearWallItems.map((f) => f.id),
    mounted
      .sort(
        (a, b) =>
          a.position[0] - b.position[0] || a.position[1] - b.position[1],
      )
      .map((f) => f.id),
  );
  for (const [i, item] of rearWallItems.entries()) {
    assert.deepEqual([item.x, item.height, item.z], mounted[i].position);
    assert.ok(Math.abs(item.x) + item.width / 2 <= rearWallSize.width / 2);
    assert.ok(item.height + item.boxHeight / 2 <= rearWallSize.height);
  }
  assert.deepEqual(
    roomLayoutScopeItems("wall")
      .filter((f) => roomLayoutMatches(f, "后墙 PP-02"))
      .map((f) => f.id),
    ["patch-panel-02"],
  );
  const entrance = definition.room.entrance;
  for (const [id, size] of [
    [entrance.readerId, entrance.readerBodySize],
    [
      entrance.fixtureId,
      [entrance.openingWidth, entrance.openingHeight, entrance.frameDepth],
    ],
    [entrance.lighting.lampId, entrance.lighting.lampBodySize],
    ...racewaySections.map((s) => [s.id, s.sectionSize] as const),
  ] as const) {
    const f = rearWallItems.find((item) => item.id === id)!;
    assert.deepEqual([f.width, f.boxHeight, f.depth], size);
  }
});

test("后墙最近布置按不同组的矩形外缘量取，包含高度重叠和斜向分离", () => {
  const neighbors = rearWallItems.map(rearWallNeighbor);
  assert.deepEqual(
    neighbors.map((n) => n.peer.id),
    [
      "access-reader-01",
      "access-reader-01",
      "entrance-01",
      "access-reader-01",
      "access-reader-01",
      "patch-panel-02",
      "patch-panel-02",
      "raceway-horizontal",
      "patch-panel-02",
    ],
  );
  for (const [i, near] of neighbors.entries()) {
    const f = rearWallItems[i];
    assert.notEqual(f.system, near.peer.system);
    assert.ok(near.distance > 0);
    assert.equal(
      near.distance,
      Math.hypot(near.x2 - near.x1, near.y2 - near.y1),
    );
  }
  const panel = neighbors[4],
    reader = neighbors[5],
    drop = neighbors[3];
  assert.equal(panel.distance.toFixed(3), "0.345");
  assert.deepEqual(
    [panel.x1, panel.y1, panel.x2, panel.y2],
    [reader.x2, reader.y2, reader.x1, reader.y1],
  );
  assert.equal(panel.y1, panel.y2);
  assert.ok(drop.x2 > drop.x1 && drop.y2 < drop.y1);
  assert.equal(drop.distance.toFixed(3), "0.685");
});

test("后墙三维量距沿用立面对应边，投影到同一深度后保持原距离", () => {
  for (const item of rearWallItems) {
    const near = rearWallNeighbor(item);
    const pair = rearWallCrossing(item.id)!;
    assert.deepEqual([pair.upper.id, pair.lower.id], [item.id, near.peer.id]);
    assert.equal(pair.distance, near.distance);
    assert.deepEqual(
      pair.ends.map((point) => [point.x, point.y]),
      [
        [near.x1, near.y1],
        [near.x2, near.y2],
      ],
    );
    assert.ok(
      Math.abs(
        pair.projected[0].distanceTo(pair.projected[1]) - near.distance,
      ) < 1e-12,
    );
    for (const [i, fixture] of [item, near.peer].entries()) {
      assert.equal(pair.ends[i].z, fixture.z + fixture.depth / 2);
      assert.ok(pair.projected[i].z > pair.ends[i].z);
      const span = new THREE.Box3().setFromPoints(pair.outlines[i]);
      assert.ok(Math.abs(span.max.x - span.min.x - fixture.width) < 1e-12);
      assert.ok(Math.abs(span.max.y - span.min.y - fixture.boxHeight) < 1e-12);
    }
  }
  const sign = rearWallCrossing("exit-sign-01")!;
  const trunk = rearWallCrossing(sign.lower.id)!;
  assert.equal(sign.lower.id, "raceway-horizontal");
  assert.equal(trunk.lower.id, "entrance-01");
  assert.equal(rearWallCrossing("smoke-01"), null);
});

test("两档场景取景中后墙标记及量距端点均在观察范围内，标记指向对应设施几何", () => {
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
        new THREE.BoxGeometry(...size),
        new THREE.MeshStandardMaterial({ color }),
      );
      mesh.position.fromArray(position);
      parent.add(mesh);
      return mesh;
    },
  );
  for (const mount of mounts.values()) mount.updateMatrixWorld(true);
  for (const [width, height] of [
    [740, 800],
    [680, 686],
  ]) {
    const rect = {
      left: 36,
      right: width - 40,
      top: 104,
      bottom: height - 120,
    };
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 120);
    for (const { id } of rearWallItems) {
      const pair = rearWallCrossing(id)!;
      const fit = rearWallCrossingFrame(pair, width, height, rect);
      camera.position.copy(fit.position);
      camera.lookAt(fit.target);
      camera.updateMatrixWorld();
      for (const point of pair.points) {
        const p = point.clone().project(camera);
        const x = ((p.x + 1) * width) / 2;
        const y = ((1 - p.y) * height) / 2;
        assert.ok(
          x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
          id,
        );
      }
      for (const [i, { point }] of pair.markers.entries()) {
        const direction = point.clone().sub(camera.position).normalize();
        const hit = new THREE.Raycaster(
          camera.position,
          direction,
        ).intersectObjects([...fixtures.values()])[0];
        let fixture: THREE.Object3D | null = hit?.object ?? null;
        while (fixture && !fixture.userData.entityId) fixture = fixture.parent;
        assert.equal(
          fixture?.userData.entityId,
          [pair.upper.id, pair.lower.id][i],
          id,
        );
      }
    }
  }
});
