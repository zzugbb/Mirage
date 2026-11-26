import { test } from "node:test";
import assert from "node:assert/strict";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  campusById,
  campusBuildingEntrance,
  campusChildren,
  campusCoverage,
  campusFloorPlan,
  campusNodes,
  campusPath,
  campusPosition,
  campusRoomId,
  campusSitePlan,
} from "./campus-layout.ts";
import { spatialSnapshot } from "./spatial.ts";

test("空间身份及所属层稳定，楼层入口复用现有机房尺寸", () => {
  assert.equal(
    new Set(campusNodes.map(({ id }) => id)).size,
    campusNodes.length,
  );
  assert.deepEqual(
    campusPath(campusRoomId).map(({ id }) => id),
    ["campus-01", "building-a", "floor-a-01", "room-01"],
  );
  assert.deepEqual(campusById(campusRoomId)?.size, definition.room.size);
  assert.deepEqual(
    campusChildren("floor-a-02").map(({ kind }) => kind),
    ["support"],
  );
  for (const node of campusNodes)
    if (node.parent) assert.ok(campusById(node.parent), node.id);
  assert.deepEqual(campusPath("missing"), []);
});

test("楼层门洞、通道和区域内布置共用同一配置", () => {
  const first = campusFloorPlan("floor-a-01")!;
  const room = first.areas.find(({ id }) => id === campusRoomId)!;
  const entrance = definition.room.fixtures.find(
    ({ id }) => id === definition.room.entrance.fixtureId,
  )!;
  assert.deepEqual(room.doorway, {
    x: entrance.position[0],
    z: entrance.position[2],
    width: definition.room.entrance.openingWidth,
  });
  assert.equal(
    room.access.x,
    campusById(campusRoomId)!.origin[0] + room.doorway.x,
  );
  assert.equal(room.equipment.length, definition.installation.racks.length);

  for (const id of ["floor-a-01", "floor-a-02"]) {
    const floor = campusById(id)!;
    const { corridor, areas } = campusFloorPlan(id)!;
    assert.ok(corridor.center[1] - corridor.depth / 2 >= -floor.size[2] / 2);
    for (const area of areas) {
      const node = campusById(area.id)!;
      assert.ok(area.access.length > 0 && area.access.fromZ < area.access.toZ);
      assert.ok(
        Math.abs(area.access.x) + area.doorway.width / 2 <= corridor.width / 2,
      );
      for (const equipment of area.equipment) {
        assert.ok(
          Math.abs(equipment.center[0]) + equipment.width / 2 <
            node.size[0] / 2,
        );
        assert.ok(
          Math.abs(equipment.center[1]) + equipment.depth / 2 <
            node.size[2] / 2,
        );
      }
    }
  }
  assert.equal(campusFloorPlan("campus-01"), null);
});

test("房间局部坐标经建筑朝向变换，楼层标高保留园区基准", () => {
  assert.deepEqual(campusPosition("floor-a-02"), [-7, 5, -4]);
  const first = campusFloorPlan("floor-a-01")!;
  const second = campusFloorPlan("floor-a-02")!;
  assert.deepEqual(first.stair, second.stair);
  const entry = campusBuildingEntrance("building-a")!.point;
  assert.deepEqual(entry, [-17, 0, first.corridor.center[1]]);
  assert.ok(
    campusPosition("building-a", entry)!.every(
      (value, index) => Math.abs(value - [-17.4, 0, 13][index]) < 1e-10,
    ),
  );
  assert.equal(campusBuildingEntrance("campus-01"), null);
  const relative = campusPosition(campusRoomId, [0, 1, 1])!;
  assert.ok(
    relative.every(
      (value, index) => Math.abs(value - [-8.5, 1, 2.5][index]) < 1e-10,
    ),
  );
  assert.equal(campusPosition("missing"), null);
});

test("园区建筑入口、道路和室外设施使用连贯的配置边界", () => {
  const site = campusSitePlan("campus-01")!;
  const entrance = campusBuildingEntrance("building-a")!;
  assert.deepEqual(site.entrance, {
    ...entrance,
    point: campusPosition("building-a", entrance.point),
  });
  assert.ok(
    site.entrance!.point[2] < site.mainRoad.center[1] - site.mainRoad.depth / 2,
  );
  assert.ok(
    Math.abs(
      site.serviceRoad.center[1] +
        site.serviceRoad.depth / 2 -
        (site.mainRoad.center[1] - site.mainRoad.depth / 2),
    ) < 1e-10,
  );
  const campus = campusById("campus-01")!;
  const building = campusById("building-a")!;
  for (const zone of site.zones) {
    const { origin, size } = campusById(zone.id)!;
    assert.ok(
      origin[0] - size[0] / 2 > building.origin[0] + building.size[2] / 2,
    );
    assert.ok(Math.abs(origin[0]) + size[0] / 2 < campus.size[0] / 2);
    assert.ok(Math.abs(origin[2]) + size[2] / 2 < campus.size[2] / 2);
    assert.ok(zone.access.width > 0 && zone.access.depth < size[2]);
    assert.equal(campusCoverage(zone.id, new Map()).rooms, 0);
  }
  assert.equal(campusSitePlan("floor-a-01"), null);
});

test("上层按唯一码汇总同一机房，保留逐指标有效数与未知读数", () => {
  for (const time of [40, 60]) {
    const { readings } = spatialSnapshot(time);
    const room = readings.get(campusRoomId)!;
    for (const id of ["campus-01", "building-a", "floor-a-01", campusRoomId])
      assert.deepEqual(campusCoverage(id, readings), {
        rooms: 1,
        devices: room.count,
        inletDevices: room.coverageTemperature,
        powerDevices: room.coveragePower,
        power: room.power,
        temperature: room.temperature,
      });
    assert.equal(campusCoverage("floor-a-02", readings).rooms, 0);
    assert.equal(campusCoverage("support-a-02", readings).power, null);
    const unavailable = campusCoverage("campus-01", new Map());
    assert.equal(unavailable.power, null);
    assert.equal(unavailable.devices, definition.installation.devices.length);
    assert.equal(
      campusCoverage("campus-01", new Map([[room.id, { ...room, power: 0 }]]))
        .power,
      0,
    );
  }
});
