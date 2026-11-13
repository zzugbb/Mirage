import { PerspectiveCamera, Vector3 } from "three";
import { boundsFrameDistance } from "./camera.ts";
import { roomLayoutCameraDirection } from "./room-layout.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  roomLayoutItems,
  roomLayoutSize,
  roomLayoutObject,
  roomLayoutMatches,
  roomLayoutNeighbor,
} from "./room-layout.ts";
import { devices, racks } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { pdus } from "./power-config.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

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
  for (const id of ["room-01", "environment-01", "smoke-01", "unknown"])
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
