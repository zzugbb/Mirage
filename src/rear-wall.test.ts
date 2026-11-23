import assert from "node:assert/strict";
import { test } from "node:test";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { racewaySections } from "./panel-raceway.ts";
import { rearWallItems, rearWallNeighbor, rearWallSize } from "./rear-wall.ts";
import { roomLayoutMatches, roomLayoutScopeItems } from "./room-layout.ts";

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
