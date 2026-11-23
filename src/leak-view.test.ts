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

test("柜旁三段分别取配置端点、机房方位及段中到柜体投影的水平距离", () => {
  const before = JSON.stringify(definition);
  for (const [index, length, distance, side] of [
    [0, 1.5, 0.375, "+Z 侧"],
    [1, 1.35, 0.225, "+X 侧"],
    [2, 1.5, 0.325, "−Z 侧"],
  ] as const) {
    const inspection = leakInspection("floor", index);
    const floor = inspection.floor!;
    assert.equal(floor.index, index);
    assert.deepEqual(
      arrays(inspection.paths[0]),
      leakDetection.sensingPoints.slice(index, index + 2),
    );
    assert.ok(Math.abs(floor.length - length) < 1e-10);
    assert.equal(floor.side, side);
    assert.ok(Math.abs(floor.distance - distance) < 1e-10);
    assert.equal(floor.point.y, floor.edge.y);
    assert.deepEqual(
      inspection.markers.map((m) => m.objectId),
      [leakDetection.cableId, leakDetection.nearbyFacilityId],
    );
    assert.deepEqual(
      arrays(inspection.points.slice(0, 4)),
      leakDetection.sensingPoints,
    );
    assert.equal(floor.corners.length, 8);
    floor.start.set(0, 0, 0);
  }
  for (const invalid of [-1, 3, 0.5, NaN])
    assert.equal(leakInspection("floor", invalid).floor!.index, 0);
  assert.equal(JSON.stringify(definition), before);
});

test("地面尺寸线只标当前段，换段后重画两端刻线", () => {
  const drawing = new LeakViewGeometry();
  const line = drawing.root.children[0] as LineSegments;
  for (const index of [0, 2, 1]) {
    const inspection = leakInspection("floor", index);
    drawing.update(inspection);
    const positions = line.geometry.getAttribute("position");
    const floor = inspection.floor!;
    const footprint = floor.footprint;
    let vertex = 8;
    footprint.forEach((start, i) => {
      const end = footprint[(i + 1) % footprint.length];
      const dashes = Math.ceil(start.distanceTo(end) / 0.13);
      const first = new Vector3().fromBufferAttribute(positions, vertex);
      first.y -= 0.018;
      assert.ok(first.distanceTo(start) < 1e-6);
      vertex += 2 * dashes;
    });
    assert.equal(positions.count, vertex + 48);
    const ringCenter = floor.point.clone();
    ringCenter.y += 0.018;
    for (let i = vertex; i < positions.count; i++)
      assert.ok(
        Math.abs(
          new Vector3()
            .fromBufferAttribute(positions, i)
            .distanceTo(ringCenter) - 0.055,
        ) < 1e-6,
      );
    const measured = [floor.start, floor.end, floor.point, floor.edge];
    measured.forEach((expected, i) => {
      const position = new Vector3().fromBufferAttribute(positions, i);
      position.y -= 0.018;
      assert.ok(position.distanceTo(expected) < 1e-6);
    });
  }
  drawing.dispose();
});

test("检漏观察的剖切采样覆盖每个转折和直段，间隔不超过 0.3 米", () => {
  for (const { id } of leakViews) {
    const inspection = leakInspection(id);
    for (const point of inspection.paths.flat())
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

test("沿感应线由接头计距，折点归入下一段，末端不计引线或闭环", () => {
  for (const [fromJoint, index, x, z] of [
    [0, 0, -6.35, -4.1],
    [0.3, 0, -6.05, -4.1],
    [1.499, 0, -4.851, -4.1],
    [1.5, 1, -4.85, -4.1],
    [1.501, 1, -4.85, -4.101],
    [2.3, 1, -4.85, -4.9],
    [2.85, 2, -4.85, -5.45],
    [3.05, 2, -5.05, -5.45],
    [4.35, 2, -6.35, -5.45],
  ]) {
    const a = leakInspection("floor", { fromJoint });
    const floor = a.floor!;
    assert.equal(floor.index, index);
    assert.ok(floor.point.distanceTo(new Vector3(x, 0.065, z)) < 1e-9);
    assert.ok(Math.abs(floor.fromJoint + floor.toEnd - a.sensingLength) < 1e-9);
    assert.ok(Math.abs(floor.fromJoint - fromJoint) < 1e-9);
    assert.ok(a.markers[0].point.equals(floor.point));
    assert.ok(floor.point.distanceTo(floor.edge) === floor.distance);
  }
});

test("换段仍选段中；反向量距得到相同布置点和尺寸线，投影距离随点移动", () => {
  const middle = leakInspection("floor", 1);
  assert.ok(Math.abs(middle.floor!.fromJoint - 2.175) < 1e-9);
  const a = leakInspection("floor", { fromJoint: 1.5 });
  const b = leakInspection("floor", { fromJoint: a.sensingLength - 2.85 });
  assert.ok(b.floor!.point.equals(a.floor!.point));
  assert.ok(Math.abs(a.floor!.distance - Math.hypot(0.225, 0.375)) < 1e-9);
  assert.ok(Math.abs(a.floor!.distance - middle.floor!.distance) > 0.2);
  const geometry = new LeakViewGeometry();
  geometry.update(a);
  const line = geometry.root.children[0] as LineSegments;
  const positions = line.geometry.getAttribute("position");
  for (const [i, point] of [a.floor!.point, a.floor!.edge].entries()) {
    const drawn = new Vector3().fromBufferAttribute(positions, 2 + i);
    drawn.y -= 0.018;
    assert.ok(drawn.distanceTo(point) < 1e-6);
  }
  geometry.dispose();
});

test("整支路跨过引线接头后与柜旁里程指向同一点，折点归入下一段", () => {
  const samples = [
    [0, 0],
    [0.275, 1],
    [0.975, 2],
    [1.444, 2],
    [1.445, 3],
    [2.945, 4],
    [3.745, 4],
    [4.295, 5],
    [5.795, 5],
  ];
  const points = [
    ...leakDetection.leadPoints,
    ...leakDetection.sensingPoints.slice(1),
  ];
  for (const [at, i] of samples) {
    const inspection = leakInspection("route", { fromController: at }),
      route = inspection.route!;
    assert.equal(route.index, i);
    assert.deepEqual(arrays(inspection.paths[0]), points.slice(i, i + 2));
    assert.ok(Math.abs(route.station - at) < 1e-10);
    assert.ok(Math.abs(route.total - 5.795) < 1e-10);
    assert.ok(
      route.point.distanceTo(route.start) +
        route.point.distanceTo(route.end) -
        route.length <
        1e-10,
    );
    assert.equal(
      inspection.markers[0].objectId,
      at === 0 ? leakDetection.controllerId : leakDetection.cableId,
    );
    if (i < 3) assert.equal(route.fromJoint, null);
    else {
      assert.ok(Math.abs(route.fromJoint! - (at - 1.445)) < 1e-10);
      const floor = leakInspection("floor", {
        fromJoint: route.fromJoint!,
      }).floor!;
      assert.equal(floor.index, i - 3);
      assert.ok(floor.point.distanceTo(route.point) < 1e-10);
    }
  }
  for (let i = 0; i < points.length - 1; i++) {
    const r = leakInspection("route", i).route!;
    assert.ok(r.start.clone().lerp(r.end, 0.5).distanceTo(r.point) < 1e-10);
  }
});
