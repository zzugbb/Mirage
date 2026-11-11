import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Box3,
  Group,
  LineSegments,
  PerspectiveCamera,
  Ray,
  Vector3,
} from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  environmentInspection,
  environmentViewFrame,
} from "./environment-view.ts";
import { environmentProbe } from "./environment-monitoring.ts";
import { EnvironmentViewGeometry } from "./scene/environment-view.ts";

const pair = { firstId: "environment-01", secondId: "environment-02" };
test("双测点布置仅接受已定义的不同探头，中心、独立高度参考与间距来自配置", () => {
  const inspection = environmentInspection(pair)!;
  assert.deepEqual(inspection.pair, pair);
  assert.notEqual(inspection.pair, pair);
  assert.equal(inspection.distance, 4);
  for (const [i, probe] of inspection.probes.entries()) {
    assert.deepEqual(
      probe.point.toArray(),
      environmentProbe(probe.id)!.fixture.position,
    );
    assert.deepEqual(inspection.points[2 * i + 1].toArray(), [
      probe.point.x,
      0,
      probe.point.z,
    ]);
  }
  const reversed = environmentInspection({
    firstId: pair.secondId,
    secondId: pair.firstId,
  })!;
  assert.equal(reversed.distance, inspection.distance);
  assert.equal(reversed.probes[0].id, pair.secondId);
  for (const secondId of [pair.firstId, "smoke-01", "rack-a01", "unknown"])
    assert.equal(environmentInspection({ ...pair, secondId }), null);
});

test("双点取景适配桌面侧栏，完整高度参考入框且探头不被机柜及设施遮住", () => {
  const blockers = [
    ...definition.installation.racks.map((r) =>
      new Box3().setFromCenterAndSize(
        new Vector3(
          r.position[0],
          r.position[1] + definition.rack.size[1] / 2,
          r.position[2],
        ),
        new Vector3(...definition.rack.size),
      ),
    ),
    ...definition.facilities.map((f) =>
      new Box3().setFromCenterAndSize(
        new Vector3(...f.position),
        new Vector3(...f.size),
      ),
    ),
  ];
  const inspection = environmentInspection(pair)!;
  for (const [width, height] of [
    [732, 836],
    [644, 704],
    [1152, 836],
    [1024, 704],
  ]) {
    const rect = {
      left: 40,
      right: width - 150,
      top: 100,
      bottom: height - 280,
    };
    const fit = environmentViewFrame(inspection, width, height, rect);
    const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
    camera.position.copy(fit.position);
    camera.lookAt(fit.target);
    camera.updateMatrixWorld(true);
    for (const point of inspection.points) {
      const p = point.clone().project(camera),
        x = ((p.x + 1) * width) / 2,
        y = ((1 - p.y) * height) / 2;
      assert.ok(
        x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
        `${width}: outside frame`,
      );
    }
    for (const { point } of inspection.probes)
      for (const blocker of blockers) {
        const hit = new Ray(
          fit.position,
          point.clone().sub(fit.position).normalize(),
        ).intersectBox(blocker, new Vector3());
        assert.ok(
          !hit || hit.distanceTo(fit.position) > point.distanceTo(fit.position),
          `${width}: probe obstructed`,
        );
      }
  }
});

test("高度参考没有两点连线或覆盖面，重复观察不累积几何并保留深度与资源释放", () => {
  const drawing = new EnvironmentViewGeometry(),
    parent = new Group();
  parent.add(drawing.root);
  const lines = drawing.root.children[0] as LineSegments;
  const inspection = environmentInspection(pair)!;
  for (let i = 0; i < 3; i++) {
    drawing.update(inspection);
    assert.equal(drawing.root.visible, true);
    const positions = lines.geometry.getAttribute("position");
    assert.equal(positions.count, 108);
    assert.equal(lines.geometry.drawRange.count, 108);
    for (let j = 0; j < positions.count; j += 2)
      assert.ok(Math.abs(positions.getZ(j) - positions.getZ(j + 1)) < 0.25);
    assert.equal((lines.material as { depthTest: boolean }).depthTest, true);
    assert.equal(drawing.root.children.length, 1);
  }
  drawing.update(null);
  assert.equal(drawing.root.visible, false);
  drawing.dispose();
  assert.equal(parent.children.length, 0);
});
