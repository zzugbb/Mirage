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
import { leakDetection } from "./leak-detection.ts";
import {
  leakInspection,
  leakViews,
  leakViewFrame,
  leakViewIncludes,
} from "./leak-view.ts";
import { LeakViewGeometry } from "./scene/leak-view.ts";

const arrays = (points: Vector3[]) => points.map((p) => p.toArray());
test("检漏观察只沿已登记引线、感应线与封端，不补闭环或覆盖范围", () => {
  const before = JSON.stringify(leakDetection);
  const all = leakInspection("all"),
    lead = leakInspection("lead"),
    sensing = leakInspection("sensing"),
    end = leakInspection("end");
  assert.deepEqual(all.paths.map(arrays), [
    leakDetection.leadPoints,
    leakDetection.sensingPoints,
  ]);
  assert.deepEqual(arrays(lead.points), leakDetection.leadPoints);
  assert.deepEqual(arrays(sensing.points), leakDetection.sensingPoints);
  assert.deepEqual(
    end.points.at(-1)!.toArray(),
    leakDetection.sensingPoints.at(-1),
  );
  assert.equal(all.markers.length, 3);
  assert.deepEqual(
    lead.markers.map((m) => m.id),
    ["leak-origin", "leak-joint"],
  );
  assert.deepEqual(
    sensing.markers.map((m) => m.id),
    ["leak-joint", "leak-end"],
  );
  assert.deepEqual(
    end.markers.map((m) => m.id),
    ["leak-end"],
  );
  assert.ok(Math.abs(all.leadLength - 1.445) < 1e-10);
  assert.ok(Math.abs(all.sensingLength - 4.35) < 1e-10);
  all.paths[0][0].set(0, 0, 0);
  assert.equal(JSON.stringify(leakDetection), before);
  for (const id of [
    leakDetection.controllerId,
    leakDetection.cableId,
    leakDetection.nearbyFacilityId,
  ])
    assert.equal(leakViewIncludes(id), true);
  for (const id of ["power-01", "environment-01", "rack-a01", "unknown"])
    assert.equal(leakViewIncludes(id), false);
});

test("检漏观察的剖切采样覆盖每个转折和直段，间隔不超过 0.3 米", () => {
  for (const { id } of leakViews) {
    const inspection = leakInspection(id);
    for (const point of inspection.points)
      assert.ok(
        inspection.sightPoints.some((p) => p.distanceTo(point) < 1e-10),
      );
    for (let i = 1; i < inspection.sightPoints.length; i++)
      assert.ok(
        inspection.sightPoints[i].distanceTo(inspection.sightPoints[i - 1]) <=
          0.3 + 1e-10,
      );
  }
});

test("两种桌面侧栏和分析画幅中，检漏路径在控件外且不被制冷柜挡住", () => {
  const facility = definition.facilities.find(
    (f) => f.id === leakDetection.nearbyFacilityId,
  )!;
  const box = new Box3().setFromCenterAndSize(
    new Vector3().fromArray(facility.position),
    new Vector3().fromArray(facility.size),
  );
  for (const { id } of leakViews)
    for (const [width, height] of [
      [852, 836],
      [732, 836],
      [744, 704],
      [644, 704],
    ]) {
      const rect = {
        left: 264,
        right: width - 40,
        top: 100,
        bottom: height - 48,
      };
      const inspection = leakInspection(id),
        fit = leakViewFrame(inspection, width, height, rect);
      const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
      camera.position.copy(fit.position);
      camera.lookAt(fit.target);
      camera.updateMatrixWorld(true);
      for (const point of inspection.sightPoints) {
        const p = point.clone().project(camera),
          x = ((p.x + 1) * width) / 2,
          y = ((1 - p.y) * height) / 2;
        assert.ok(
          x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
          `${id}: point outside viewport`,
        );
        const hit = new Ray(
          fit.position,
          point.clone().sub(fit.position).normalize(),
        ).intersectBox(box, new Vector3());
        assert.ok(
          !hit || hit.distanceTo(fit.position) > point.distanceTo(fit.position),
          `${id}: cooling cabinet obstruction`,
        );
      }
    }
});

test("反复切段不会残留旧端点或截断新线段；标记保留深度遮挡并可释放", () => {
  const drawing = new LeakViewGeometry(),
    parent = new Group();
  parent.add(drawing.root);
  const line = drawing.root.children[0] as LineSegments;
  for (const id of ["all", "end", "lead", "sensing", "all"] as const) {
    const inspection = leakInspection(id);
    drawing.update(inspection);
    const count =
      inspection.paths.reduce((n, path) => n + (path.length - 1) * 2, 0) +
      inspection.markers.length * 48;
    assert.equal(line.geometry.getAttribute("position").count, count);
    assert.equal(line.geometry.drawRange.count, count);
    assert.equal(drawing.root.visible, true);
    assert.equal((line.material as { depthTest: boolean }).depthTest, true);
  }
  drawing.update(null);
  assert.equal(drawing.root.visible, false);
  drawing.dispose();
  assert.equal(parent.children.length, 0);
});
