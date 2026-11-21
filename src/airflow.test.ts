import { test } from "node:test";
import assert from "node:assert/strict";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  airflowSettings,
  airflowSnapshot,
  airflowVisualTime,
  flowPoint,
  roundedFlowPath,
} from "./airflow.ts";
import { devices, racks, deviceHeight, rackForDevice } from "./installation.ts";
import { spatialSnapshot } from "./spatial.ts";
import { simulate } from "./simulation.ts";
import { AirflowGeometry } from "./scene/airflow.ts";
import { placeFlowLabel } from "./airflow-label-layout.ts";
import { modelForDevice, unitLabel } from "./catalog.ts";
import { Matrix4, Vector3, Color } from "three";

test("气流代表路径绑定已登记冷却关系，选中设备与机柜排都有明确范围", () => {
  const readings = spatialSnapshot(60).readings;
  const room = airflowSnapshot(60, readings);
  assert.equal(room.routes.length, 1);
  assert.equal(room.routes[0].rackId, "rack-a01");
  const selected = devices.find((device) => device.rackId === "rack-a07")!;
  const device = airflowSnapshot(60, readings, selected.id);
  assert.equal(device.routes.length, 1);
  assert.equal(device.routes[0].deviceId, selected.id);
  const rack = airflowSnapshot(60, readings, "rack-a07");
  assert.equal(rack.routes[0].rackId, "rack-a07");
  const row = airflowSnapshot(60, readings, "rack-a01", "srv-01", "row-b");
  assert.equal(row.routes.length, 1);
  assert.equal(row.routes[0].rackId, "rack-a05");
  for (const route of [
    ...room.routes,
    ...device.routes,
    ...rack.routes,
    ...row.routes,
  ]) {
    const relation = definition.installation.relations.find(
      (relation) => relation.id === route.id,
    )!;
    assert.equal(relation.target, route.deviceId);
    assert.equal(relation.source, route.sourceId);
    assert.equal(relation.kind, "cooling");
  }
  for (const model of definition.equipmentModels)
    assert.equal(
      airflowSettings.modelDirections[
        model.id as keyof typeof airflowSettings.modelDirections
      ],
      "front-to-rear-assumed",
    );
});

test("四个气流端点对应已配置设施、格栅与设备，读数不扩展为环境或排风测点", () => {
  for (const device of devices) {
    const readings = spatialSnapshot(60).readings;
    const route = airflowSnapshot(60, readings, device.id).routes[0];
    const [supply, floor, intake, returning] = route.endpoints;
    assert.deepEqual(
      route.endpoints.map((endpoint) => endpoint.kind),
      ["supply", "floor", "intake", "return"],
    );
    assert.deepEqual(supply.point, route.segments[0].points[0]);
    assert.deepEqual(intake.point, route.segments[1].points[0]);
    const row = definition.temperatureSlice.vertical.rows.find((row) =>
      row.rackIds.includes(device.rackId),
    )!;
    assert.equal(
      floor.point[2],
      airflowSettings.floorOutlets.find((outlet) => outlet.rowId === row.id)!.z,
    );
    const grid = airflowSettings.floorGrid;
    assert.ok(
      Math.abs(
        (floor.point[0] - grid.startX) / grid.step -
          Math.round((floor.point[0] - grid.startX) / grid.step),
      ) < 1e-8,
    );
    assert.ok(floor.point[2] > intake.point[2]);
    assert.equal(returning.point[1], airflowSettings.returnHeight);
    assert.ok(returning.point[2] < route.segments[1].points[1][2]);
    assert.match(returning.detail, /无排风测点/);
    assert.doesNotMatch(returning.detail, /°C|m\/s/);
    assert.ok(intake.detail.includes(unitLabel(device.id)));
    assert.ok(intake.detail.includes(device.name));
    assert.equal(intake.label.includes("°C"), route.animated);
    if (route.animated)
      assert.match(
        intake.detail,
        new RegExp(`${readings.get(device.id)!.temperature!.toFixed(1)} °C`),
      );
    else {
      assert.match(intake.detail, /静态/);
      assert.doesNotMatch(intake.detail, /°C/);
    }
  }
});

test("气流标签就近避开控件、已放标签和边界，空间不足时不覆盖控件", () => {
  const bounds = { left: 0, top: 0, right: 390, bottom: 500 };
  const control = { left: 10, top: 350, right: 280, bottom: 490 };
  const first = placeFlowLabel(180, 320, 150, 40, bounds, [control])!;
  assert.ok(first);
  const second = placeFlowLabel(180, 320, 150, 40, bounds, [control, first])!;
  assert.ok(second);
  assert.ok(
    second.bottom + 8 <= first.top ||
      first.bottom + 8 <= second.top ||
      second.right + 8 <= first.left ||
      first.right + 8 <= second.left,
  );
  assert.ok(placeFlowLabel(5, 5, 140, 40, bounds, []));
  assert.equal(placeFlowLabel(180, 320, 150, 40, bounds, [bounds]), null);
});

test("端口排占满横向空间时，读数避开整个部件与上方控件", () => {
  const viewport = { left: 0, top: 0, right: 400, bottom: 400 };
  const ports = { left: 35, top: 140, right: 380, bottom: 200 };
  const controls = { left: 0, top: 0, right: 400, bottom: 135 };
  const label = placeFlowLabel(
    210,
    170,
    120,
    35,
    viewport,
    [ports, controls],
    false,
    ports,
  );
  assert.ok(label);
  assert.ok(
    label.top >= ports.bottom + 8 && label.bottom <= viewport.bottom - 8,
  );
});

test("送风与回风绕开柜体，穿柜沿实际U位从正面向背面，回风不穿过上方桥架", () => {
  const readings = spatialSnapshot(60).readings;
  for (const device of devices) {
    const route = airflowSnapshot(60, readings, device.id).routes[0];
    assert.ok(route);
    const [supply, through, returnPath] = route.segments;
    assert.deepEqual(supply.points.at(-1), through.points[0]);
    assert.deepEqual(through.points.at(-1), returnPath.points[0]);
    assert.equal(through.points[0][1], deviceHeight(device.id));
    assert.equal(through.points[0][0], rackForDevice(device.id).position[0]);
    assert.ok(through.points[0][2] > through.points[1][2]);
    assert.equal(
      Math.max(...returnPath.points.map((point) => point[1])),
      airflowSettings.returnHeight,
    );
    assert.ok(airflowSettings.returnHeight > definition.rack.size[1]);
    assert.ok(airflowSettings.returnHeight < 3.35);
    for (const segment of [supply, returnPath])
      for (let i = 0; i <= 64; i++) {
        const [x, y, z] = flowPoint(segment.points, i / 64);
        assert.ok(
          Math.abs(x) < definition.room.size[0] / 2 &&
            Math.abs(z) < definition.room.size[2] / 2 &&
            y > 0 &&
            y < definition.room.size[1],
        );
        for (const rack of racks)
          assert.ok(
            !(
              Math.abs(x - rack.position[0]) < definition.rack.size[0] / 2 &&
              Math.abs(z - rack.position[2]) < definition.rack.size[2] / 2 &&
              y < definition.rack.size[1] + 0.05
            ),
            `${device.id}: 路径不得穿过${rack.id}`,
          );
      }
  }
  const path = roundedFlowPath([
    [0, 0.1, 0],
    [1, 0.1, 0],
    [1, 1, 0],
  ]);
  assert.ok(
    path.every((point) => point[1] >= 0.1 && point[0] >= 0 && point[0] <= 1),
  );
});

test("停机、维护和无效观测不演示运行气流，过期时路径不跳到另一台设备", () => {
  for (const condition of [
    "offline",
    "missing",
    "stale",
    "stopped",
    "maintenance",
  ]) {
    const device = devices.find(
      (device) =>
        device.telemetry === condition || device.lifecycle === condition,
    )!;
    assert.ok(device);
    const snapshot = airflowSnapshot(
      60,
      spatialSnapshot(60).readings,
      device.id,
    );
    assert.equal(snapshot.routes[0].animated, false, condition);
    assert.match(snapshot.label, /静态/);
  }
  const stale = devices.find((device) => device.telemetry === "stale")!;
  const before = airflowSnapshot(44, spatialSnapshot(44).readings, stale.id);
  const after = airflowSnapshot(45, spatialSnapshot(45).readings, stale.id);
  assert.equal(before.routes[0].animated, true);
  assert.equal(after.routes[0].animated, false);
  assert.deepEqual(before.routes[0].segments, after.routes[0].segments);
});

test("冷却输入、温度和事件取同一确定性时间，任意顺序回看不累计路径变化", () => {
  const warm = airflowSnapshot(60, spatialSnapshot(60).readings);
  for (const time of [0, 20, 26, 60, 70, 78, 120, 0, 60]) {
    const snapshot = airflowSnapshot(time, spatialSnapshot(time).readings);
    assert.equal(snapshot.coolingCapacity, simulate(time).coolingCapacity);
    assert.deepEqual(
      snapshot.routes.map((route) => route.segments),
      warm.routes.map((route) => route.segments),
    );
  }
  assert.equal(warm.coolingCapacity, 35);
  assert.deepEqual(airflowSnapshot(60, spatialSnapshot(60).readings), warm);
  const paused = { time: 60, playing: false, playbackRate: 2 as const };
  assert.equal(airflowVisualTime(paused, 900), 60);
  assert.equal(airflowVisualTime({ ...paused, playing: true }, 250), 60.5);
  assert.equal(airflowVisualTime({ ...paused, playing: true }, 900, true), 60);
  assert.equal(airflowVisualTime({ ...paused, playing: true }, Infinity), 60);
  assert.equal(
    airflowVisualTime({ ...paused, time: 120, playing: true }, 900),
    120,
  );
});

test("气流几何复用缓冲与材质，粒子可重复定位，减少动态效果保留静态箭头", () => {
  const geometry = new AirflowGeometry(),
    snapshot = airflowSnapshot(60, spatialSnapshot(60).readings);
  geometry.update(snapshot);
  assert.equal(geometry.endpoints.count, snapshot.routes.length * 2);
  assert.equal(geometry.endpoints.material.depthTest, true);
  const buffers = geometry.batches.map((batch) => [
    batch.band.geometry,
    batch.band.material,
    batch.band.instanceMatrix,
    batch.arrows.geometry,
    batch.sparks.geometry,
  ]);
  geometry.animate(60.25);
  const poses = geometry.batches.map((batch) => [
    ...batch.sparks.instanceMatrix.array,
  ]);
  geometry.animate(12);
  geometry.animate(60.25);
  geometry.batches.forEach((batch, index) =>
    assert.deepEqual([...batch.sparks.instanceMatrix.array], poses[index]),
  );
  const reducedSupply = geometry.batches[0].band.material.opacity;
  geometry.update(airflowSnapshot(0, spatialSnapshot(0).readings));
  assert.ok(geometry.batches[0].band.material.opacity > reducedSupply);
  geometry.batches.forEach((batch, index) => {
    assert.deepEqual(
      [
        batch.band.geometry,
        batch.band.material,
        batch.band.instanceMatrix,
        batch.arrows.geometry,
        batch.sparks.geometry,
      ],
      buffers[index],
    );
    assert.ok(batch.band.count > 0);
    assert.equal(batch.band.material.depthTest, true);
    assert.ok(batch.arrows.count > 0);
    assert.ok(batch.sparks.count > 0);
    assert.equal(batch.arrows.material.depthTest, true);
    assert.equal(batch.sparks.material.depthTest, true);
  });
  geometry.animate(60, true);
  assert.ok(
    geometry.batches.every(
      (batch) =>
        !batch.sparks.visible &&
        batch.sparks.count === 0 &&
        batch.arrows.count > 0,
    ),
  );
  geometry.animate(60, false, false);
  assert.equal(geometry.root.visible, false);
  geometry.animate(60, false, true);
  assert.equal(geometry.root.visible, true);
  const offline = devices.find((device) => device.telemetry === "offline")!;
  geometry.update(
    airflowSnapshot(60, spatialSnapshot(60).readings, offline.id),
  );
  assert.ok(geometry.batches.every((batch) => batch.sparks.count === 0));
  for (const batch of geometry.batches)
    for (const object of [batch.arrows, batch.sparks, batch.band]) {
      const intersections: unknown[] = [];
      object.raycast({} as never, intersections as never);
      assert.deepEqual(intersections, []);
    }
  let disposed = 0;
  for (const resource of [
    geometry.cone,
    geometry.sphere,
    geometry.ribbon,
    geometry.endpointGeometry,
    geometry.floorFrameGeometry,
    geometry.floorFrames.material,
    geometry.deviceFrames.material,
    geometry.faceArrows.material,
    geometry.endpoints.material,
    ...geometry.batches.flatMap((batch) => [
      batch.arrows.material,
      batch.sparks.material,
      batch.band.material,
    ]),
  ])
    resource.addEventListener("dispose", () => disposed++);
  geometry.update(null);
  assert.equal(geometry.root.visible, false);
  geometry.dispose();
  assert.equal(disposed, 18);
  assert.equal(geometry.root.children.length, 0);
});

test("四种机型的前后柜面轮廓对应实际 U 位，静态箭头在柜外并保留深度遮挡", () => {
  const geometry = new AirflowGeometry();
  const matrix = new Matrix4();
  for (const device of devices) {
    const route = airflowSnapshot(60, spatialSnapshot(60).readings, device.id);
    geometry.update(route);
    const { faceSize, segments } = route.routes[0];
    assert.equal(
      faceSize[1],
      modelForDevice(device.id).units * definition.rack.unitPitch - 0.003,
    );
    assert.equal(geometry.deviceFrames.count, 8);
    assert.equal(geometry.faceArrows.count, 2);
    const [front, rear] = segments.find(
      (segment) => segment.kind === "through",
    )!.points;
    for (const [index, face] of [front, rear].entries()) {
      for (let edge = 0; edge < 4; edge++) {
        geometry.deviceFrames.getMatrixAt(index * 4 + edge, matrix);
        const center = new Vector3().setFromMatrixPosition(matrix);
        assert.equal(center.z, Math.fround(face[2]));
        assert.ok(
          Math.abs(center.y - deviceHeight(device.id)) <=
            faceSize[1] / 2 + 1e-6,
        );
        assert.ok(Math.abs(center.x - face[0]) <= faceSize[0] / 2 + 1e-6);
      }
      geometry.faceArrows.getMatrixAt(index, matrix);
      const center = new Vector3().setFromMatrixPosition(matrix);
      assert.ok(
        index === 0 ? center.z > face[2] + 0.1 : center.z < face[2] - 0.1,
      );
      const direction = new Vector3(0, 1, 0).transformDirection(matrix);
      assert.ok(direction.distanceTo(new Vector3(0, 0, -1)) < 1e-6);
      assert.ok(Math.abs(center.y - deviceHeight(device.id)) < 1e-6);
    }
    geometry.animate(60, true);
    for (const mesh of [geometry.deviceFrames, geometry.faceArrows]) {
      assert.equal(mesh.material.depthTest, true);
      assert.equal(mesh.material.depthWrite, false);
      const intersections: unknown[] = [];
      mesh.raycast({} as never, intersections as never);
      assert.deepEqual(intersections, []);
      if (!route.routes[0].animated) {
        const color = new Color();
        mesh.getColorAt(0, color);
        const expected = new Color(airflowSettings.colors.unknown).toArray();
        assert.ok(
          color.toArray().every((n, i) => Math.abs(n - expected[i]) < 1e-6),
        );
      }
    }
  }
  const before = [...geometry.faceArrows.instanceMatrix.array];
  geometry.animate(10);
  geometry.animate(60);
  assert.deepEqual([...geometry.faceArrows.instanceMatrix.array], before);
  geometry.update(null);
  assert.equal(geometry.deviceFrames.count, 0);
  assert.equal(geometry.faceArrows.count, 0);
  geometry.dispose();
});
