import assert from "node:assert/strict";
import test from "node:test";
import { Group, Raycaster, Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { airflowSnapshot, type FlowPoint } from "./airflow.ts";
import { airflowReturnTray } from "./airflow-return-tray.ts";
import { devices } from "./installation.ts";
import { buildCableTray } from "./scene/cable-trays.ts";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} / ${expected}`);

test("每台设备按既有回风折线核对侧梁，两排结果分别为两根与无交会", () => {
  for (const { id, rackId } of devices) {
    const route = airflowSnapshot(40, new Map(), id).routes[0];
    assert.equal(route.deviceId, id);
    const result = airflowReturnTray(route);
    if (!definition.room.cableTrays.rows[0].rackIds.includes(rackId)) {
      assert.deepEqual(result, {
        crossings: [],
        points: [],
        paths: [],
        markers: [],
      });
      continue;
    }
    assert.equal(result.crossings.length, 2);
    assert.equal(result.markers.length, 2);
    assert.equal(result.paths.length, 6);
    for (const [index, crossing] of result.crossings.entries()) {
      assert.equal(crossing.fixtureId, "cable-tray-b");
      assert.equal(crossing.side, index ? -1 : 1);
      close(crossing.path.x, -4.7);
      close(crossing.path.y, 2.65);
      close(crossing.path.z, index ? -2 : -1.6);
      assert.equal(crossing.path.x, crossing.bottom.x);
      assert.equal(crossing.path.z, crossing.bottom.z);
      close(crossing.bottom.y, 3.345);
      close(crossing.clearance, 0.695);
      assert.deepEqual(result.paths[index * 3], [
        crossing.path,
        crossing.bottom,
      ]);
      assert.equal(result.markers[index].objectId, crossing.fixtureId);
      assert.equal(result.markers[index].id, crossing.id);
    }
  }
});

test("沿量距线向上拾取两根侧梁的底面与原桥架实例", () => {
  const fixture = definition.room.fixtures.find(
    ({ id }) => id === "cable-tray-b",
  )!;
  const object = new Group();
  object.position.fromArray(fixture.position);
  buildCableTray(object);
  object.updateMatrixWorld(true);

  const route = airflowSnapshot(40, new Map(), "srv-07").routes[0];
  const { crossings, markers } = airflowReturnTray(route);
  assert.equal(crossings.length, 2);
  for (const [index, crossing] of crossings.entries()) {
    const ray = new Raycaster(crossing.path, new Vector3(0, 1, 0));
    const [hit] = ray.intersectObject(object, true);
    assert.equal(hit.object.name, "tray-ladder");
    assert.equal(hit.instanceId, crossing.instanceId);
    close(hit.point.distanceTo(crossing.bottom), 0);
    close(hit.point.distanceTo(crossing.path), crossing.clearance);
    close(ray.ray.distanceToPoint(markers[index].point), 0);
  }
});

test("重复折点按一次交会处理，相切和梁长之外没有交会，高差保留符号", () => {
  const route = airflowSnapshot(40, new Map(), "srv-07").routes[0];
  const at = (...points: FlowPoint[]) =>
    airflowReturnTray({ ...route, segments: [{ kind: "return", points }] })
      .crossings;
  const corner: FlowPoint = [-4.7, 4, -1.6];
  const agreed = at([-4.7, 4, -1.2], corner, corner, [-4.7, 4, -2.4]);
  assert.equal(agreed.length, 2);
  close(agreed[0].clearance, -0.655);
  close(agreed[1].clearance, -0.655);
  assert.deepEqual(at([-4.7, 4, -1.2], corner, [-4.55, 4, -1.2]), []);
  assert.deepEqual(
    at([-4.7, 4, -1.2], corner, [-4.55, 4, -1.6], [-4.55, 4, -1.85]),
    [],
  );
  assert.deepEqual(at([-4.95, 4, -1.2], [-4.95, 4, -2.4]), []);
});
