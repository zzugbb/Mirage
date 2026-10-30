import { test } from "node:test";
import assert from "node:assert/strict";
import { frameDistance } from "./camera.ts";

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
