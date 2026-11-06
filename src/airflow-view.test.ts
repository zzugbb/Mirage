import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PerspectiveCamera,
  Vector3,
  Group,
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
} from "three";
import { ShellCutaway } from "./scene/shell-cutaway.ts";
import { airflowSnapshot } from "./airflow.ts";
import {
  airflowViews,
  airflowViewFrame,
  airflowViewPoints,
  airflowViewSightPoints,
} from "./airflow-view.ts";
import { spatialSnapshot } from "./spatial.ts";
import { racks } from "./installation.ts";

test("四种气流观察按现有路径取点，进风同时保留格栅和前后柜面", () => {
  const route = airflowSnapshot(60, spatialSnapshot(60).readings).routes[0];
  assert.deepEqual(
    airflowViewPoints(route, "supply"),
    route.segments[0].points,
  );
  assert.deepEqual(
    airflowViewPoints(route, "return"),
    route.segments[2].points,
  );
  assert.deepEqual(
    airflowViewPoints(route, "all"),
    route.segments.flatMap((s) => s.points),
  );
  assert.deepEqual(airflowViewPoints(route, "intake"), [
    route.floorGrille.position,
    ...route.segments[1].points,
  ]);
});

test("八柜代表路径在两种桌面可用画幅内完整取景，绕开图例与顶部工具", () => {
  const readings = spatialSnapshot(60).readings;
  for (const rack of racks) {
    const route = airflowSnapshot(60, readings, rack.id).routes[0];
    for (const view of airflowViews)
      for (const [width, height, top] of [
        [852, 836, 78],
        [744, 704, 110],
      ]) {
        const rect = { left: 290, top, right: width - 20, bottom: height - 24 };
        const fit = airflowViewFrame(route, view.id, width, height, rect);
        const camera = new PerspectiveCamera(40, width / height, 0.01, 150);
        camera.position.copy(fit.position);
        camera.lookAt(fit.target);
        camera.updateMatrixWorld();
        assert.ok(Number.isFinite(fit.distance) && fit.distance > 0);
        for (const p of airflowViewPoints(route, view.id)) {
          const projected = camera.position
            .clone()
            .fromArray(p)
            .project(camera);
          const x = ((projected.x + 1) * width) / 2,
            y = ((1 - projected.y) * height) / 2;
          assert.ok(
            x > rect.left && x < rect.right,
            `${rack.id}/${view.id}: x ${x}`,
          );
          assert.ok(
            y > rect.top && y < rect.bottom,
            `${rack.id}/${view.id}: y ${y}`,
          );
          assert.ok(projected.z > -1 && projected.z < 1);
        }
      }
  }
});

test("回看与无效观测只改变读数和动效，不改变同一设备的观察构图", () => {
  for (const device of ["srv-01", "srv-59"]) {
    const routes = [0, 60, 120].map(
      (t) => airflowSnapshot(t, spatialSnapshot(t).readings, device).routes[0],
    );
    for (const view of airflowViews) {
      const frames = routes.map((route) =>
        airflowViewFrame(route, view.id, 852, 836, {
          left: 290,
          right: 832,
          top: 78,
          bottom: 812,
        }),
      );
      assert.deepEqual(frames[0], frames[1]);
      assert.deepEqual(frames[1], frames[2]);
    }
  }
});

test("长直路径中部的背景障碍可剖切，取消自动剖切后恢复", () => {
  const route = airflowSnapshot(60, spatialSnapshot(60).readings).routes[0];
  const raw = airflowViewPoints(route, "return").map((p) => new Vector3(...p));
  let index = 1;
  for (let i = 2; i < raw.length; i++)
    if (raw[i].distanceTo(raw[i - 1]) > raw[index].distanceTo(raw[index - 1]))
      index = i;
  const middle = raw[index - 1].clone().lerp(raw[index], 0.5);
  const camera = middle.clone().add(new Vector3(0, 3, 0));
  const group = new Group();
  const mesh = new Mesh(
    new BoxGeometry(0.3, 0.1, 0.3),
    new MeshBasicMaterial(),
  );
  mesh.position.copy(middle).add(new Vector3(0, 1, 0));
  group.add(mesh);
  const cutaway = new ShellCutaway([group]);
  assert.equal(cutaway.update(camera, raw, true), 0);
  assert.equal(
    cutaway.update(camera, airflowViewSightPoints(route, "return"), true),
    1,
  );
  assert.equal(group.visible, false);
  cutaway.enabled = false;
  assert.equal(
    cutaway.update(camera, airflowViewSightPoints(route, "return"), true),
    0,
  );
  assert.equal(group.visible, true);
  mesh.geometry.dispose();
  mesh.material.dispose();
});
