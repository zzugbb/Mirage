import { PerspectiveCamera, Vector3 } from "three";
import { boundsFrameDistance } from "./camera.ts";
import { roomLayoutCameraDirection } from "./room-layout.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  roomLayoutItems,
  layoutDeviceMatches,
  roomLayoutBranches,
  roomLayoutCrossings,
  roomLayoutCeilingFootprints,
  roomLayoutFixtures,
  roomLayoutScopeItems,
  roomLayoutLeakPath,
  roomLayoutSize,
  roomLayoutObject,
  roomLayoutMatches,
  roomLayoutNeighbor,
} from "./room-layout.ts";
import { devices, racks } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { pdus } from "./power-config.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { fixtureCrossing } from "./fixture-crossing.ts";

test("顶灯与桥架：每个图上交叉点都在双方投影内，可往返同一组三维配置表面", () => {
  assert.equal(roomLayoutScopeItems("ceiling").length, 6);
  assert.equal(roomLayoutCeilingFootprints.length, 5);
  for (const item of roomLayoutCrossings) {
    const pair = fixtureCrossing(item.lightId, item.trayId)!;
    assert.equal(pair.id, item.id);
    assert.equal(pair.difference, item.difference);
    for (const id of [item.lightId, item.trayId]) {
      const f = roomLayoutCeilingFootprints.find((f) => f.id === id)!;
      assert.ok(
        Math.abs(item.x - f.x) <= f.width / 2 &&
          Math.abs(item.z - f.z) <= f.depth / 2,
      );
    }
    assert.equal(roomLayoutObject(item.id, "srv-01"), null);
  }
});
test("同一交叉对匹配两端名称和编号，焦点可横向换灯、纵向换排", () => {
  const hits = (query: string) =>
    roomLayoutCrossings
      .filter((item) => roomLayoutMatches(item, query))
      .map((item) => item.id);
  const centerB = "ceiling-light-02:cable-tray-b";
  assert.deepEqual(hits("中央 B 排"), [centerB]);
  assert.deepEqual(hits("LIGHT-02 tray-B"), [centerB]);
  assert.deepEqual(hits("左侧 右侧"), []);
  assert.equal(
    roomLayoutNeighbor(centerB, "ArrowRight", "ceiling"),
    "ceiling-light-03:cable-tray-b",
  );
  assert.equal(
    roomLayoutNeighbor(centerB, "ArrowDown", "ceiling"),
    "ceiling-light-02:cable-tray-a",
  );
});

test("布置图使用八柜、两处主要设施和原入口的配置投影，不补造资源或占地", () => {
  assert.equal(roomLayoutItems.length, 11);
  assert.equal(new Set(roomLayoutItems.map((item) => item.id)).size, 11);
  assert.deepEqual(roomLayoutSize, { width: 14, depth: 12 });
  for (const item of roomLayoutItems) {
    const source =
      racks.find((rack) => rack.id === item.id) ??
      definition.facilities.find((facility) => facility.id === item.id) ??
      definition.room.fixtures.find((fixture) => fixture.id === item.id)!;
    assert.equal(item.x, source.position[0]);
    assert.equal(item.z, source.position[2]);
    assert.ok(item.width > 0 && item.depth > 0);
    assert.ok(
      Math.abs(item.x) + item.width / 2 <= roomLayoutSize.width / 2 + 0.01,
    );
    // 入口中心落在墙厚内，门洞投影允许延伸至墙外缘。
    assert.ok(
      Math.abs(item.z) + item.depth / 2 <=
        roomLayoutSize.depth / 2 + definition.room.wallThickness,
    );
  }
});

test("84台设备、16个PDU及四机型子件回溯明确柜位，无关设施不借用当前设备", () => {
  for (const device of devices)
    assert.equal(roomLayoutObject(device.id, "srv-01"), device.rackId);
  for (const pdu of pdus)
    assert.equal(roomLayoutObject(pdu.id, "srv-01"), pdu.rackId);
  for (const id of ["srv-01", "srv-08", "sw-01", "sto-01"]) {
    const rackId = devices.find((device) => device.id === id)!.rackId;
    for (const part of [...partsForDevice(id), ...subpartsForDevice(id)])
      assert.equal(roomLayoutObject(part.id, id), rackId);
  }
  for (const id of ["room-01", "ceiling-light-01", "cable-tray-a", "unknown"])
    assert.equal(roomLayoutObject(id, "srv-01"), null);
});

test("查找设备只匹配其配置机柜，多词交集不重排或隐藏布置；键盘方向对应固定投影", () => {
  for (const device of devices)
    assert.deepEqual(
      roomLayoutItems
        .filter((item) => roomLayoutMatches(item, device.id.toUpperCase()))
        .map((item) => item.id),
      [device.rackId],
    );
  assert.deepEqual(
    roomLayoutItems
      .filter((item) => roomLayoutMatches(item, "B03 STO"))
      .map((item) => item.id),
    ["rack-a07"],
  );
  assert.equal(
    roomLayoutItems.filter((item) => roomLayoutMatches(item, "不存在")).length,
    0,
  );
  assert.equal(
    roomLayoutItems.filter((item) => roomLayoutMatches(item, " ")).length,
    11,
  );
  assert.equal(roomLayoutNeighbor("rack-a01", "ArrowRight"), "rack-a02");
  assert.equal(roomLayoutNeighbor("rack-a01", "ArrowUp"), "rack-a05");
  assert.equal(roomLayoutNeighbor("rack-a07", "ArrowDown"), "rack-a03");
  assert.equal(roomLayoutNeighbor("rack-a08", "ArrowLeft"), "rack-a07");
  assert.equal(roomLayoutNeighbor("rack-a01", "Enter"), "rack-a01");
});

test("三维机房俯视与布置图同向，桌面可用画幅容纳配置边界并预留顶部工具", () => {
  const direction = new Vector3(...roomLayoutCameraDirection).normalize();
  const center = new Vector3(0, definition.room.size[1] / 2, 0);
  for (const aspect of [0.6, 1, 1.5]) {
    const camera = new PerspectiveCamera(40, aspect, 0.1, 200);
    const distance = boundsFrameDistance(
      definition.room.size,
      direction.toArray(),
      aspect,
      3,
      0.1,
    );
    camera.position.copy(center).addScaledVector(direction, distance);
    camera.lookAt(center);
    camera.updateMatrixWorld(true);
    for (const x of [-7, 7])
      for (const y of [0, 4.2])
        for (const z of [-6, 6]) {
          const point = new Vector3(x, y, z).project(camera);
          assert.ok(Math.abs(point.x) < 1 && point.y < 0.8 && point.y > -1);
        }
    for (const row of [racks.slice(0, 4), racks.slice(4)]) {
      const points = row.map((rack) =>
        new Vector3(...rack.position).project(camera),
      );
      assert.ok(points.every((point, i) => !i || point.x > points[i - 1].x));
    }
    assert.ok(
      new Vector3(...racks[0].position).project(camera).y <
        new Vector3(...racks[4].position).project(camera).y,
    );
  }
});

test("环境与安全层仅复用九处配置中心、位置和高度，不生成占地或覆盖", () => {
  assert.equal(roomLayoutFixtures.length, 9);
  assert.equal(roomLayoutScopeItems("fixtures"), roomLayoutFixtures);
  assert.equal(roomLayoutScopeItems("equipment"), roomLayoutItems);
  for (const item of roomLayoutFixtures) {
    const fixture = definition.room.fixtures.find(
      (source) => source.id === item.id,
    )!;
    assert.ok(fixture);
    assert.deepEqual([item.x, item.height, item.z], fixture.position);
    assert.equal(item.location, fixture.location);
    assert.equal(item.width, 0);
    assert.equal(item.depth, 0);
    assert.equal(roomLayoutObject(item.id, "srv-01"), item.id);
  }
  assert.deepEqual(
    roomLayoutLeakPath.lead,
    definition.room.leakDetection.leadPoints.map(([x, , z]) => [x, z]),
  );
  assert.deepEqual(
    roomLayoutLeakPath.sensing,
    definition.room.leakDetection.sensingPoints.map(([x, , z]) => [x, z]),
  );
});

test("设施查找为同一位置多词交集，方向键只在设施层移动", () => {
  assert.deepEqual(
    roomLayoutFixtures
      .filter((item) => roomLayoutMatches(item, "环境 左墙 后段"))
      .map((item) => item.id),
    ["environment-02"],
  );
  assert.equal(
    roomLayoutFixtures.filter((item) => roomLayoutMatches(item, "环境 烟感"))
      .length,
    0,
  );
  assert.equal(
    roomLayoutNeighbor("environment-01", "ArrowUp", "fixtures"),
    "environment-02",
  );
  assert.equal(
    roomLayoutNeighbor("environment-01", "ArrowRight", "fixtures"),
    "smoke-01",
  );
  assert.equal(
    roomLayoutNeighbor("smoke-01", "ArrowLeft", "fixtures"),
    "environment-01",
  );
  for (const item of roomLayoutFixtures)
    for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"])
      assert.ok(
        roomLayoutFixtures.some(
          (point) => point.id === roomLayoutNeighbor(item.id, key, "fixtures"),
        ),
      );
});

test("柜前格栅按同一代表支路查找，不将同柜其他设备或相邻柜落点算入", () => {
  const items = roomLayoutScopeItems("grilles");
  assert.equal(items.length, 8);
  for (const row of ["A", "B"])
    assert.deepEqual(
      items
        .filter((i) => roomLayoutMatches(i, row + " 排"))
        .map((i) => i.short),
      [1, 2, 3, 4].map((n) => row + "0" + n),
    );
  for (const item of roomLayoutBranches) {
    const { rack, grille, device } = item.branch;
    assert.deepEqual([item.x, item.z], [rack.position[0], rack.position[2]]);
    assert.deepEqual(
      items
        .filter((i) =>
          roomLayoutMatches(i, [item.short, grille.id, device.id].join(" ")),
        )
        .map((i) => i.id),
      [rack.id],
    );
    assert.ok(
      !roomLayoutMatches(
        item,
        devices.find((d) => d.rackId === rack.id && d.id !== device.id)!.id,
      ),
    );
  }
  assert.equal(
    roomLayoutNeighbor("rack-a07", "ArrowDown", "grilles"),
    "rack-a03",
  );
});

test("布置查找按同一设备匹配，柜内结果按安装位从高到低返回", () => {
  const rack = roomLayoutItems.find((i) => i.short === "B03")!;
  assert.equal(roomLayoutMatches(rack, "SRV-54 4U"), false);
  assert.deepEqual(
    layoutDeviceMatches(rack.id, "B03 4U 存储").map((d) => [d.id, d.units]),
    [
      ["sto-02", "U35–38"],
      ["sto-01", "U25–28"],
    ],
  );
  for (const d of devices)
    assert.deepEqual(
      layoutDeviceMatches(d.rackId, d.id).map((hit) => hit.id),
      [d.id],
    );
});

test("布置图按设备占用的任一 U 位与连续区间查找，保留机型高度与安装位的区别", () => {
  const rack = roomLayoutItems.find((item) => item.short === "B03")!;
  const ids = (query: string) =>
    layoutDeviceMatches(rack.id, query).map((row) => row.id);
  for (const query of [
    "B03 U24",
    "Ｂ０３ Ｕ２４",
    "rack-a07 / U23–24 SRV-54",
    "B03机柜 U24 2U",
  ])
    assert.deepEqual(ids(query), ["srv-54"]);
  assert.deepEqual(ids("B03 U24至25"), ["sto-01", "srv-54"]);
  assert.deepEqual(ids("B03 U27–33"), ["srv-55", "sto-01"]);
  assert.deepEqual(ids("U38 4U"), ["sto-02"]);
  for (const query of [
    "B03 U32",
    "U43",
    "U0",
    "B03 U24 4U",
    "U27–24",
    "U23 U25",
    "A01 U24",
  ])
    assert.deepEqual(ids(query), []);
  for (const item of roomLayoutItems)
    assert.equal(roomLayoutMatches(item, "B03 U24"), item.id === rack.id);
});
