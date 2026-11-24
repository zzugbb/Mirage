import assert from "node:assert/strict";
import { test } from "node:test";
import { Box3, Ray, Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { emergencyHeadBoundaryInspection } from "./emergency-head-boundary.ts";
import { emergencyHeadInspection } from "./emergency-light.ts";

test("双灯头法线沿镜面实际姿态到达样板机房配置范围的首个边界", () => {
  const { heads } = emergencyHeadInspection();
  const { boundary } = emergencyHeadBoundaryInspection();
  const [width, height, depth] = definition.room.size;
  const floor = definition.rendering.floor.surfaceY;
  const room = new Box3(
    new Vector3(-width / 2, floor, -depth / 2),
    new Vector3(width / 2, height, depth / 2),
  );
  assert.deepEqual(
    boundary.map(({ side, surface, label }) => [side, surface, label]),
    [
      [-1, "front", "前侧边界"],
      [1, "east", "东侧边界"],
    ],
  );
  for (const [index, hit] of boundary.entries()) {
    const { face, direction } = heads[index];
    assert.ok(room.containsPoint(face));
    assert.ok(hit.face.equals(face) && hit.direction.equals(direction));
    const ray = new Ray(face, direction);
    const expected = ray.intersectBox(room, new Vector3())!;
    assert.ok(hit.point.distanceTo(expected) < 1e-12);
    assert.ok(Math.abs(hit.point.distanceTo(face) - hit.distance) < 1e-12);
    // 首个边界之前仍在配置范围内，过界不再延伸到理论地坪点。
    assert.ok(room.containsPoint(ray.at(hit.distance - 0.001, new Vector3())));
    assert.ok(!room.containsPoint(ray.at(hit.distance + 0.001, new Vector3())));
    assert.ok(hit.point.y > floor && hit.point.y < height);
  }
  assert.equal(boundary[0].point.z, depth / 2);
  assert.equal(boundary[1].point.x, width / 2);
  assert.deepEqual(
    boundary.map(({ distance }) => distance.toFixed(3)),
    ["12.662", "6.739"],
  );
});

test("场景绘制与标签使用同一对配置交点", () => {
  const { boundary, paths, markers, points } =
    emergencyHeadBoundaryInspection();
  assert.deepEqual(points, paths.flat());
  assert.deepEqual(
    markers.map(({ id, title }) => [id, title]),
    [
      ["entrance-axis-left", "左轴 · 前侧边界"],
      ["entrance-axis-right", "右轴 · 东侧边界"],
    ],
  );
  for (const [i, { face, point }] of boundary.entries()) {
    assert.deepEqual(paths[i], [face, point]);
    assert.equal(markers[i].point, point);
    const guides = paths
      .slice(boundary.length)
      .filter(([start]) => start.x === point.x && start.z === point.z);
    assert.ok(guides[0][0].equals(point));
    assert.ok(
      guides.every(
        ([start, end]) =>
          start.x === end.x && start.z === end.z && start.y > end.y,
      ),
    );
    assert.equal(guides.at(-1)![1].y, definition.rendering.floor.surfaceY);
  }
});
