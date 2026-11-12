import { test } from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import { racks } from "./installation.ts";
import { rangeViewPoints, rangeViewFrame } from "./range-view.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

test("八柜的低位、高位与整柜范围在前后侧桌面画幅内，保留括线短标空间", () => {
  for (const rack of racks)
    for (const [first, last] of [
      [1, 1],
      [4, 5],
      [25, 28],
      [41, 42],
      [1, 42],
    ])
      for (const side of ["front", "rear"] as const)
        for (const [width, height] of [
          [852, 836],
          [732, 836],
          [744, 704],
          [644, 704],
        ]) {
          const points = rangeViewPoints(
            { rackId: rack.id, first, last },
            side,
          );
          const original = points.map((point) => point.clone());
          const rect = {
            left: 20,
            right: width - 40,
            top: 100,
            bottom: height - 48,
          };
          const fit = rangeViewFrame(points, side, width, height, rect);
          const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
          camera.position.copy(fit.position);
          camera.lookAt(fit.target);
          camera.updateMatrixWorld(true);
          for (const point of points) {
            const projected = point.clone().project(camera);
            const x = ((projected.x + 1) * width) / 2;
            const y = ((1 - projected.y) * height) / 2;
            assert.ok(
              x > rect.left &&
                x < rect.right &&
                y > rect.top &&
                y < rect.bottom,
            );
          }
          assert.ok(fit.position.y > 0);
          assert.equal(fit.position.z > rack.position[2], side === "front");
          assert.deepEqual(points, original);
        }
});

test("安装边界沿用 U 位配置，前后观察只改变柜面，不虚构空位或随抽出移动", () => {
  const range = { rackId: racks[0].id, first: 4, last: 5 };
  const front = rangeViewPoints(range, "front"),
    rear = rangeViewPoints(range, "rear");
  for (let i = 0; i < front.length; i++) {
    assert.equal(front[i].x, rear[i].x);
    assert.equal(front[i].y, rear[i].y);
    assert.ok(
      Math.abs(front[i].z - rear[i].z - definition.rack.size[2] - 0.07) < 1e-10,
    );
  }
  assert.equal(
    front[0].y,
    racks[0].position[1] +
      definition.rack.unitOrigin +
      3.5 * definition.rack.unitPitch,
  );
  const other = rangeViewPoints({ ...range, rackId: racks[7].id }, "front");
  const offset = new Vector3(...racks[7].position).sub(
    new Vector3(...racks[0].position),
  );
  for (let i = 0; i < other.length; i++)
    assert.ok(other[i].distanceTo(front[i].clone().add(offset)) < 1e-10);
});

test("缺失、跨界、倒置与小数范围不可观察", () => {
  assert.deepEqual(rangeViewPoints(null, "front"), []);
  for (const range of [
    { rackId: "unknown", first: 1, last: 2 },
    { rackId: racks[0].id, first: 0, last: 2 },
    { rackId: racks[0].id, first: 40, last: 43 },
    { rackId: racks[0].id, first: 5, last: 4 },
    { rackId: racks[0].id, first: 1.5, last: 2 },
  ])
    assert.deepEqual(rangeViewPoints(range, "rear"), []);
});
