import assert from "node:assert/strict";
import { test } from "node:test";
import { PerspectiveCamera } from "three";
import { airflowSnapshot } from "./airflow.ts";
import { airflowViewFrame } from "./airflow-view.ts";
import { coolingTerminalFace } from "./cooling-terminal-face.ts";

function close(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} / ${expected}`);
}

test("两排登记支路的逻辑端点沿 Z 轴投到同一配置柜面", () => {
  for (const deviceId of ["srv-13", "srv-55"]) {
    const [route] = airflowSnapshot(40, new Map(), deviceId).routes;
    const face = coolingTerminalFace(route);
    assert.ok(face);
    assert.equal(face.source.id, "cooling-01");
    close(face.faceZ, -4.475);
    close(face.floorY, 0.0445);
    close(face.separation, 1.45);
    assert.deepEqual(
      face.terminals.map(({ kind }) => kind),
      ["supply", "receiver"],
    );
    for (const [index, terminal] of face.terminals.entries()) {
      const endpoint = route.endpoints.find(
        (item) => item.kind === terminal.kind,
      )!;
      assert.deepEqual(terminal.point.toArray(), endpoint.point);
      assert.deepEqual(terminal.projection.toArray(), [
        endpoint.point[0],
        endpoint.point[1],
        face.faceZ,
      ]);
      assert.deepEqual(face.rulers[index * 3], [
        terminal.projection,
        terminal.point,
      ]);
      close(terminal.heightAboveFloor, [0.2555, 1.7055][index]);
      close(terminal.offset, 0.125);
    }
    assert.ok(face.outline.flat().every((point) => point.z > face.faceZ));
  }
});

test("柜面偏移保留符号，未登记制冷源或缺少端点时没有量尺", () => {
  const [route] = airflowSnapshot(40, new Map(), "srv-55").routes;
  const face = coolingTerminalFace(route)!;
  const moved = coolingTerminalFace({
    ...route,
    endpoints: route.endpoints.map((endpoint) =>
      endpoint.kind === "supply"
        ? {
            ...endpoint,
            point: [endpoint.point[0], endpoint.point[1], face.faceZ - 0.2],
          }
        : endpoint,
    ),
  });
  assert.ok(moved);
  close(moved.terminals[0].offset, -0.2);
  close(moved.terminals[1].offset, 0.125);
  close(face.terminals[0].offset, 0.125);
  for (const sourceId of ["unknown", "power-01"]) {
    assert.equal(coolingTerminalFace({ ...route, sourceId }), null);
  }
  for (const kind of ["supply", "receiver"]) {
    assert.equal(
      coolingTerminalFace({
        ...route,
        endpoints: route.endpoints.filter((endpoint) => endpoint.kind !== kind),
      }),
      null,
    );
  }
});

test("制冷柜送回风取景容纳两种桌面画幅的柜面轮廓与量尺", () => {
  const [route] = airflowSnapshot(40, new Map(), "srv-13").routes;
  const face = coolingTerminalFace(route)!;
  for (const [width, height] of [
    [852, 836],
    [744, 704],
  ]) {
    const rect = { left: 290, top: 90, right: width - 30, bottom: height - 24 };
    const fit = airflowViewFrame(route, "terminal-face", width, height, rect);
    const camera = new PerspectiveCamera(40, width / height, 0.01, 150);
    camera.position.copy(fit.position);
    camera.lookAt(fit.target);
    camera.updateMatrixWorld();
    for (const point of face.points) {
      const projected = point.clone().project(camera);
      const x = ((projected.x + 1) * width) / 2;
      const y = ((1 - projected.y) * height) / 2;
      assert.ok(
        x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
      );
    }
  }
});
