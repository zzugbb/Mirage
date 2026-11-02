import { test } from "node:test";
import assert from "node:assert/strict";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { maintenanceAreas, maintenanceSettings } from "./maintenance.ts";
import { MaintenanceGeometry } from "./scene/maintenance.ts";

test("维护范围绑定稳定机柜身份，按正面方向布置，未知对象不生成范围", () => {
  assert.deepEqual(maintenanceAreas("unknown"), []);
  assert.deepEqual(maintenanceAreas("srv-01"), []);
  for (const rack of definition.installation.racks) {
    const [front, rear] = maintenanceAreas(rack.id);
    assert.equal(front.rackId, rack.id);
    assert.equal(rear.rackId, rack.id);
    assert.equal(front.rackName, rack.name);
    assert.ok(
      front.bounds.minZ >=
        rack.position[2] + definition.rack.size[2] / 2 - 1e-8,
    );
    assert.ok(
      rear.bounds.maxZ <= rack.position[2] - definition.rack.size[2] / 2 + 1e-8,
    );
    assert.equal(
      front.width,
      definition.rack.size[0] + maintenanceSettings.sidePadding * 2,
    );
    assert.equal(front.depth, maintenanceSettings.frontDepth);
    assert.equal(rear.depth, maintenanceSettings.rearDepth);
  }
});

test("样板八柜的预留范围在室内，不占其他机柜或已定义设施的平面位置", () => {
  const obstacles = [
    ...definition.installation.racks.map((rack) => ({
      id: rack.id,
      position: rack.position,
      size: definition.rack.size,
    })),
    ...definition.facilities,
  ];
  const halfWall = definition.room.wallThickness / 2;
  for (const rack of definition.installation.racks)
    for (const { bounds } of maintenanceAreas(rack.id)) {
      assert.ok(bounds.minX > -definition.room.size[0] / 2 + halfWall);
      assert.ok(bounds.maxX < definition.room.size[0] / 2 - halfWall);
      assert.ok(bounds.minZ > -definition.room.size[2] / 2 + halfWall);
      assert.ok(bounds.maxZ < definition.room.size[2] / 2 - halfWall);
      for (const obstacle of obstacles.filter(
        (object) => object.id !== rack.id,
      )) {
        const [x, , z] = obstacle.position;
        assert.ok(
          bounds.maxX <= x - obstacle.size[0] / 2 ||
            bounds.minX >= x + obstacle.size[0] / 2 ||
            bounds.maxZ <= z - obstacle.size[2] / 2 ||
            bounds.minZ >= z + obstacle.size[2] / 2,
          `${rack.id} 的范围不得占用 ${obstacle.id}`,
        );
      }
    }
});

test("柜前预留覆盖当前门扇扫掠及导轨抽出投影，不把预留尺寸当作净距", () => {
  const rack = definition.installation.racks[0];
  const front = maintenanceAreas(rack.id)[0];
  const width = definition.rack.size[0];
  // 用整柜宽度保守包络门扇；实际门扇略窄，当前门铰在正面左侧。
  for (
    let angle = 0;
    angle <= definition.rack.motion.doorAngleDegrees;
    angle++
  ) {
    const radians = (angle * Math.PI) / 180;
    const x = rack.position[0] - width / 2 + width * Math.cos(radians);
    const z =
      rack.position[2] +
      definition.rack.size[2] / 2 +
      width * Math.sin(radians);
    assert.ok(x >= front.bounds.minX && x <= front.bounds.maxX);
    assert.ok(z >= front.bounds.minZ - 1e-8 && z <= front.bounds.maxZ);
  }
  assert.ok(front.depth > definition.rack.motion.trayTravel);
  assert.match(maintenanceSettings.description, /非实测净距/);
});

test("维护几何不参与拾取，保留遮挡和缓冲，转场及离开总览时能完整收起", () => {
  const geometry = new MaintenanceGeometry();
  const resources = [
    geometry.geometry,
    geometry.border.material,
    geometry.fill.material,
  ];
  const buffer = geometry.border.instanceMatrix;
  geometry.update(maintenanceAreas("rack-a01"));
  assert.equal(geometry.border.count, 8);
  assert.equal(geometry.fill.count, 2);
  assert.equal(geometry.root.visible, true);
  geometry.setReady(false);
  assert.equal(geometry.root.visible, false);
  geometry.setReady(true);
  assert.equal(geometry.root.visible, true);
  geometry.update(maintenanceAreas("rack-a08"));
  assert.equal(geometry.border.instanceMatrix, buffer);
  for (const mesh of [geometry.border, geometry.fill]) {
    assert.equal(mesh.material.depthTest, true);
    const hits: never[] = [];
    mesh.raycast({} as never, hits);
    assert.deepEqual(hits, []);
  }
  geometry.update([]);
  geometry.setReady(true);
  assert.equal(geometry.root.visible, false);
  assert.equal(geometry.border.count, 0);
  assert.equal(geometry.fill.count, 0);
  let disposed = 0;
  for (const resource of resources)
    resource.addEventListener("dispose", () => disposed++);
  geometry.dispose();
  assert.equal(disposed, 3);
  assert.equal(geometry.root.children.length, 0);
});
