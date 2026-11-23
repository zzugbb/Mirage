import { test } from "node:test";
import assert from "node:assert/strict";
import {
  frameDistance,
  inspectionReturnDistance,
  boundsFrameDistance,
  pointsFrameDistance,
  cameraMinimumDistance,
} from "./camera.ts";
import { PerspectiveCamera, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

test("窄视口按水平视野重新取景，机房宽度不被裁切", () => {
  const width = 8.6;
  for (const aspect of [1.5, 0.78, 0.5]) {
    const distance = frameDistance(width, aspect, 3);
    const visibleWidth = 2 * distance * Math.tan((40 * Math.PI) / 360) * aspect;
    assert.ok(visibleWidth >= width, `aspect=${aspect}`);
  }
  assert.ok(frameDistance(width, 0.78, 3) > frameDistance(width, 1.5, 3));
  assert.ok(frameDistance(0.05, 1.5, 0.35) >= 0.35);
});

test("设备包围盒按角点取景，窄屏和展开姿态仍有边距", async () => {
  const { boundsFrameDistance } = await import("./camera.ts");
  for (const size of [
    [0.4826, 0.089, 0.9],
    [0.9, 0.6, 1.2],
    [0.002, 0.03, 0.14],
  ]) {
    for (const direction of [
      [0.85, 0.85, 1.05],
      [0, 0.13, 1],
      [0.001, 1, 0.001],
      [1, 0.2, 0.001],
    ]) {
      for (const aspect of [0.5, 1, 2.8]) {
        const distance = boundsFrameDistance(size, direction, aspect, 0.27);
        const length = Math.hypot(...direction);
        const n = direction.map((v) => v / length);
        const horizontal = Math.hypot(n[0], n[2]);
        const right = [n[2] / horizontal, 0, -n[0] / horizontal];
        const up = [
          (-n[1] * n[0]) / horizontal,
          horizontal,
          (-n[1] * n[2]) / horizontal,
        ];
        const tangent = Math.tan((40 * Math.PI) / 360);
        for (const x of [-size[0] / 2, size[0] / 2])
          for (const y of [-size[1] / 2, size[1] / 2])
            for (const z of [-size[2] / 2, size[2] / 2]) {
              const dot = (axis: number[]) =>
                [x, y, z].reduce((sum, v, i) => sum + v * axis[i], 0);
              const depth = distance - dot(n);
              assert.ok(depth > 0);
              assert.ok(
                Math.abs(dot(right)) / (depth * tangent * aspect) < 0.9,
              );
              assert.ok(Math.abs(dot(up)) / (depth * tangent) < 0.9);
            }
      }
    }
  }
});

test("小部件聚焦遵循旋转控制器的最近距离，镜头能够收敛并恢复就绪", () => {
  for (const aspect of [0.5, 1, 2.8]) {
    const camera = new PerspectiveCamera(40, aspect, 0.01, 150);
    camera.position.set(1, 1, 2);
    const controls = new OrbitControls(camera, null);
    controls.minDistance = cameraMinimumDistance.device;
    controls.enableDamping = true;
    const direction = new Vector3(0.85, 0.85, 1.05).normalize();
    const distance = boundsFrameDistance(
      [0.08, 0.04, 0.08],
      direction.toArray(),
      aspect,
      controls.minDistance,
    );
    const target = direction.multiplyScalar(distance);
    for (let frame = 0; frame < 300; frame++) {
      camera.position.lerp(target, 1 - Math.exp(-4.5 / 60));
      controls.update();
    }
    assert.ok(camera.position.distanceTo(target) < 0.001, `aspect=${aspect}`);
  }
});

test("定位机柜和长桥架时所有角点落在顶部工具下方，横向仍完整入镜", () => {
  const direction = new Vector3(0.85, 0.85, 1.05).normalize();
  for (const [w, h, inset] of [
    [852, 836, 70],
    [390, 580, 118],
  ]) {
    for (const size of [
      [0.6, 2.16, 1.1],
      [9.5, 0.8, 0.54],
    ]) {
      const distance = boundsFrameDistance(
        size,
        direction.toArray(),
        w / h,
        3,
        inset / h,
      );
      const camera = new PerspectiveCamera(40, w / h, 0.01, 150);
      camera.position.copy(direction).multiplyScalar(distance);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      for (const x of [-size[0] / 2, size[0] / 2])
        for (const y of [-size[1] / 2, size[1] / 2])
          for (const z of [-size[2] / 2, size[2] / 2]) {
            const screen = new Vector3(x, y, z).project(camera);
            assert.ok(((1 - screen.y) * h) / 2 > inset && screen.y > -1);
            assert.ok(Math.abs(screen.x) < 1);
          }
    }
  }
});

test("整机展开的最低部件避开底部操作条", () => {
  const points = [
    [0, -0.45, 0.35],
    [0, 0.45, -0.35],
  ];
  const direction = [0, 0, 1];
  for (const height of [704, 836]) {
    const distance = pointsFrameDistance(
      points,
      direction,
      1.2,
      0.35,
      0,
      64 / height,
    );
    const camera = new PerspectiveCamera(40, 1.2, 0.01, 150);
    camera.position.z = distance;
    camera.updateMatrixWorld();
    for (const point of points) {
      const { y } = new Vector3().fromArray(point).project(camera);
      const screenY = ((1 - y) * height) / 2;
      assert.ok(screenY > 0 && screenY < height - 64);
    }
  }
});

test("展开整机从后侧转至斜侧时按当前投影留出上下操作区", () => {
  const size = [1.1, 0.48, 1.6];
  for (const aspect of [0.57, 1.45, 2.1]) {
    const camera = new PerspectiveCamera(40, aspect, 0.01, 150);
    const point = new Vector3();
    for (let angle = 0; angle < 360; angle += 10) {
      const yaw = (angle * Math.PI) / 180;
      const direction = new Vector3(
        Math.cos(yaw),
        0.2,
        Math.sin(yaw),
      ).normalize();
      const distance = boundsFrameDistance(
        size,
        direction.toArray(),
        aspect,
        0.35,
        0.13,
        0.1,
      );
      camera.position.copy(direction).multiplyScalar(distance);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      for (const x of [-size[0] / 2, size[0] / 2])
        for (const y of [-size[1] / 2, size[1] / 2])
          for (const z of [-size[2] / 2, size[2] / 2]) {
            point.set(x, y, z).project(camera);
            assert.ok(
              Math.abs(point.x) < 1 &&
                point.y < 1 - 2 * 0.13 &&
                point.y > -1 + 2 * 0.1,
            );
          }
    }
  }
});

test("单件返回原视角时保留缩放，换窄画幅后的目标仍能在原轨道到达", () => {
  for (const [initial, aspect, expected] of [
    [3, 2, 3],
    [2, 0.8, 3],
    [5, 0.8, 5],
    [0.1, 1.2, 0.35],
  ]) {
    const camera = new PerspectiveCamera(40, aspect, 0.01, 150);
    const controls = new OrbitControls(camera, null);
    controls.minDistance = 0.35;
    controls.maxDistance = 5;
    const distance = inspectionReturnDistance(
      initial,
      1.2,
      aspect,
      controls.minDistance,
      controls.maxDistance,
    );
    assert.ok(Math.abs(distance - expected) < 1e-9);
    const target = new Vector3(1, 1, 2).setLength(distance);
    camera.position.copy(target);
    controls.update();
    assert.ok(camera.position.distanceTo(target) < 1e-9);
  }
});
