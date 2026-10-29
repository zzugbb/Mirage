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
