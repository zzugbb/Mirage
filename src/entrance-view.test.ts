import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Box3,
  Group,
  LineSegments,
  Mesh,
  PerspectiveCamera,
  Ray,
  Vector3,
} from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  entranceFixture,
  entranceLeaf,
  exitSign,
  emergencyLight,
  entranceOpening,
  entranceSettings,
} from "./entrance.ts";
import {
  entranceHandlePoint,
  entranceInspection,
  entranceViewFrame,
  entranceViews,
  entranceViewIncludes,
} from "./entrance-view.ts";
import { buildEntranceLighting } from "./scene/entrance-lighting.ts";
import { buildEntrance } from "./scene/entrance.ts";
import { EntranceViewGeometry } from "./scene/entrance-view.ts";

test("入口核对沿用门区已登记设施，洞口与高度来自既有配置且不修改静态门扇", () => {
  const before = JSON.stringify(definition.room);
  for (const id of [
    entranceSettings.fixtureId,
    entranceSettings.readerId,
    entranceSettings.lighting.signId,
    entranceSettings.lighting.lampId,
  ])
    assert.equal(entranceViewIncludes(id), true);
  for (const id of ["room-01", "power-01", "rack-a08", "smoke-01", "unknown"])
    assert.equal(entranceViewIncludes(id), false);
  const all = entranceInspection("all"),
    opening = entranceInspection("opening"),
    access = entranceInspection("access");
  assert.equal(all.markers.length, 3);
  assert.equal(opening.markers.length, 1);
  assert.equal(access.markers.length, 2);
  assert.ok(
    Math.abs(
      opening.paths[1][0].distanceTo(opening.paths[1][1]) -
        entranceSettings.openingWidth,
    ) < 1e-10,
  );
  assert.ok(
    Math.abs(
      opening.paths[2][0].distanceTo(opening.paths[2][1]) -
        entranceSettings.openingHeight,
    ) < 1e-10,
  );
  assert.equal(access.paths.length, 2);
  for (const path of access.paths) {
    assert.equal(path[0].x, path[1].x);
    assert.equal(path[0].z, path[1].z);
    assert.equal(path[0].y, 0);
  }
  assert.equal(access.readerHeight, 1.35);
  assert.ok(
    Math.abs(
      access.handleHeight -
        entranceOpening.bottom -
        entranceSettings.handleHeight,
    ) < 1e-10,
  );
  all.points[0].set(0, 0, 0);
  assert.equal(JSON.stringify(definition.room), before);
});

test("门区横向尺寸取读卡器中心与近侧门框外缘，两个端点投到同一尺寸平面", () => {
  const inspection = entranceInspection("jamb");
  const [line, ...ticks] = inspection.paths;
  const reader = definition.room.fixtures.find(
    (f) => f.id === entranceSettings.readerId,
  )!;
  const door = new Group();
  door.position.fromArray(entranceFixture.position);
  buildEntrance(door);
  door.updateMatrixWorld(true);
  const frame = new Box3().setFromObject(
    door.getObjectByName("entrance-jamb--1")!,
  );
  assert.equal(inspection.jamb?.side, "左");
  assert.ok(Math.abs(inspection.jamb!.distance - 0.25) < 1e-10);
  assert.equal(line[0].x, reader.position[0]);
  assert.ok(Math.abs(line[1].x - frame.min.x) < 1e-8);
  assert.equal(line[0].y, line[1].y);
  assert.equal(line[0].z, line[1].z);
  assert.equal(line[0].distanceTo(line[1]), inspection.jamb!.distance);
  for (const [index, tick] of ticks.entries()) {
    assert.equal(tick[0].x, line[index].x);
    assert.equal(tick[1].x, line[index].x);
    assert.ok(tick[0].y < line[index].y && line[index].y < tick[1].y);
    assert.equal(inspection.markers[index].point.x, line[index].x);
    assert.equal(inspection.markers[index].point.y, reader.position[1]);
  }
});

test("把手标记与实际参数化门扇的室内侧把手轴重合，不使用未旋转的位置", () => {
  const root = new Group();
  root.position.fromArray(entranceFixture.position);
  const pivot = buildEntrance(root);
  root.updateMatrixWorld(true);
  const handle = root.getObjectByName("entrance-handle-1")!;
  const axis = handle.localToWorld(
    new Vector3(entranceSettings.handleSize[0] / 2, 0, 0),
  );
  assert.ok(entranceHandlePoint().distanceTo(axis) < 1e-10);
  assert.equal(pivot.rotation.y, entranceSettings.displayAngle);
  for (const { id } of entranceViews) entranceInspection(id);
  assert.equal(pivot.rotation.y, entranceSettings.displayAngle);
  root.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose();
      for (const material of Array.isArray(o.material)
        ? o.material
        : [o.material])
        material.dispose();
    }
  });
});

test("入口门两种姿态从门板自由边厚度中点量至配电柜配置投影", () => {
  const facility = definition.facilities.find(
    (f) => f.id === definition.installation.powerDistribution.sourceId,
  )!;
  const cabinet = new Box3().setFromCenterAndSize(
    new Vector3(...facility.position),
    new Vector3(...facility.size),
  );
  const inspection = entranceInspection("cabinet");
  assert.ok(entranceViewIncludes(facility.id, inspection.view));
  assert.ok(!entranceViewIncludes(facility.id, "opening"));
  assert.equal(inspection.view, "cabinet");
  const placement = inspection.cabinet;
  const root = new Group();
  root.position.fromArray(entranceFixture.position);
  const pivot = buildEntrance(root);
  const panel = root.getObjectByName("entrance-leaf")!;
  for (const [pose, angle] of [
    [placement.displayed, entranceSettings.displayAngle],
    [placement.closed, 0],
  ] as const) {
    pivot.rotation.y = angle;
    root.updateMatrixWorld(true);
    const freeEnd = panel.localToWorld(
      new Vector3(entranceLeaf.width / 2, 0, 0),
    );
    const nearest = cabinet.clampPoint(freeEnd, new Vector3());
    assert.ok(freeEnd.setY(pose.edge.y).distanceTo(pose.edge) < 1e-10);
    assert.ok(nearest.setY(pose.edge.y).distanceTo(pose.cabinet) < 1e-10);
    assert.ok(Math.abs(nearest.distanceTo(freeEnd) - pose.distance) < 1e-10);
  }
  assert.ok(placement.displayed.distance < placement.closed.distance);
  assert.equal(placement.footprint.length, 4);
});

test("入口各段取景适配桌面侧栏和分析画幅，已登记机柜及设施不遮住核对位置", () => {
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
  for (const { id } of entranceViews)
    for (const [width, height] of [
      [852, 836],
      [732, 836],
      [744, 704],
      [644, 704],
      [1152, 836],
      [1024, 704],
    ]) {
      const rect = {
        left: 264,
        right: width - 40,
        top: 100,
        bottom: height - 48,
      };
      const inspection = entranceInspection(id),
        fit = entranceViewFrame(inspection, width, height, rect);
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
          `${id}/${width}: outside frame`,
        );
        for (const blocker of blockers) {
          const hit = new Ray(
            fit.position,
            point.clone().sub(fit.position).normalize(),
          ).intersectBox(blocker, new Vector3());
          assert.ok(
            !hit ||
              hit.distanceTo(fit.position) > point.distanceTo(fit.position),
            `${id}/${width}: obstructed`,
          );
        }
      }
    }
});

test("入口轮廓与端点切换不残留，保留深度遮挡并独立释放", () => {
  const drawing = new EntranceViewGeometry(),
    parent = new Group();
  parent.add(drawing.root);
  const lines = drawing.root.children[0] as LineSegments;
  for (const id of [
    "all",
    "jamb",
    "access",
    "opening",
    "jamb",
    "all",
  ] as const) {
    const inspection = entranceInspection(id);
    drawing.update(inspection);
    assert.equal(drawing.root.visible, true);
    const count =
      inspection.paths.reduce((n, path) => n + (path.length - 1) * 2, 0) +
      inspection.markers.length * 48;
    assert.equal(lines.geometry.getAttribute("position").count, count);
    assert.equal(lines.geometry.drawRange.count, count);
    assert.equal((lines.material as { depthTest: boolean }).depthTest, true);
  }
  drawing.update(null);
  assert.equal(drawing.root.visible, false);
  drawing.dispose();
  assert.equal(parent.children.length, 0);
});

test("门上标志与应急灯贴合内墙，两个核对范围的尺寸线取实际外壳与门框", () => {
  const door = new Group();
  door.position.fromArray(entranceFixture.position);
  buildEntrance(door);
  door.updateMatrixWorld(true);
  const head = new Box3().setFromObject(door.getObjectByName("entrance-head")!);
  const cases = [exitSign, emergencyLight].map((f) => {
    const group = new Group();
    group.position.fromArray(f.position);
    buildEntranceLighting(group, f.id === exitSign.id);
    group.updateMatrixWorld(true);
    return new Box3().setFromObject(
      group.getObjectByName(
        f.id === exitSign.id ? "exit-sign-case" : "emergency-light-case",
      )!,
    );
  });
  const [sign, lamp] = cases;
  const wallFace =
    -definition.room.size[2] / 2 + definition.room.wallThickness / 2;
  const close = (a: number, b: number) =>
    assert.ok(Math.abs(a - b) < 1e-6, `${a} / ${b}`);
  for (const body of cases) close(body.min.z, wallFace);
  assert.ok(sign.min.y > head.max.y && sign.max.x < lamp.min.x);
  const lintel = entranceInspection("lintel"),
    lights = entranceInspection("lights");
  assert.ok("measure" in lintel && "measure" in lights);
  close(lintel.measure, sign.min.y - head.max.y);
  close(lintel.paths[0][0].y, head.max.y);
  close(lintel.paths[0][1].y, sign.min.y);
  close(
    lights.measure,
    lamp.getCenter(new Vector3()).x - sign.getCenter(new Vector3()).x,
  );
  close(lights.paths[0][0].distanceTo(lights.paths[0][1]), lights.measure);
});
