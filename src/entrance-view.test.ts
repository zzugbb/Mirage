import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Box3,
  BoxGeometry,
  Group,
  LineSegments,
  Mesh,
  PerspectiveCamera,
  Ray,
  Raycaster,
  Sprite,
  type Object3D,
  Vector2,
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
import { buildRoomShell } from "./scene/room.ts";
import { EntranceViewGeometry } from "./scene/entrance-view.ts";
import { entranceCabinet } from "./entrance-cabinet.ts";
import { planarRectangleGap, type Point } from "./planar-gap.ts";

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

test("三处铰链的机房高度、洞口底边相对标高与中心距共用配置轴线", () => {
  const overview = entranceInspection("hinges");
  assert.equal(overview.view, "hinges");
  assert.equal(overview.hinges.selected, null);
  assert.ok(entranceViewIncludes(entranceFixture.id, "hinges"));
  for (const id of [
    entranceSettings.readerId,
    entranceCabinet.id,
    emergencyLight.id,
  ])
    assert.equal(entranceViewIncludes(id, "hinges"), false);
  const root = new Group();
  root.position.fromArray(entranceFixture.position);
  const pivot = buildEntrance(root);
  root.updateMatrixWorld(true);
  for (const [
    i,
    { index, name, center, fromBottom },
  ] of overview.hinges.joints.entries()) {
    assert.equal(index, i);
    assert.equal(center.x, entranceFixture.position[0] + pivot.position.x);
    assert.equal(center.z, entranceFixture.position[2] + pivot.position.z);
    assert.ok(Math.abs(center.y - entranceOpening.bottom - fromBottom) < 1e-10);
    assert.ok(Math.abs(center.y - [0.3445, 1.2945, 2.2445][i]) < 1e-10);
    const mesh = root.getObjectByName(name)!;
    assert.ok(center.equals(mesh.getWorldPosition(new Vector3())));
    const bounds = new Box3().setFromObject(mesh);
    const size = bounds.getSize(new Vector3());
    const inspection = entranceInspection("hinges", i);
    assert.equal(inspection.view, "hinges");
    assert.equal(inspection.hinges.selected, i);
    assert.ok(Math.abs(size.y - inspection.hinges.length) < 1e-8);
    assert.ok(Math.abs(size.x - inspection.hinges.diameter) < 1e-8);
    assert.ok(
      Math.abs(
        inspection.paths[0][0].distanceTo(inspection.paths[0][1]) - size.y,
      ) < 1e-8,
    );
  }
  assert.equal(overview.hinges.spacing.length, 2);
  for (const span of overview.hinges.spacing)
    assert.ok(Math.abs(span - 0.95) < 1e-10);
  assert.equal(pivot.rotation.y, entranceSettings.displayAngle);
});

test("两档总览与三处铰链近景的标签经过真实门洞，拾取铰链、固定门框与门扇", () => {
  const room = new Group();
  const box = (parent: Object3D, size: number[], position: number[]) => {
    const mesh = new Mesh(new BoxGeometry(...size));
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  };
  const { fixtures } = buildRoomShell(room, box, box, () => new Sprite());
  room.updateMatrixWorld(true);
  const door = fixtures.get(entranceFixture.id)!;
  for (const [width, height] of [
    [852, 836],
    [744, 704],
    [644, 704],
  ]) {
    const rect = {
      left: 264,
      right: width - 40,
      top: 100,
      bottom: height - 48,
    };
    const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
    for (const sample of [undefined, 0, 1, 2]) {
      const inspection = entranceInspection("hinges", sample);
      const fit = entranceViewFrame(inspection, width, height, rect);
      camera.position.copy(fit.position);
      camera.lookAt(fit.target);
      camera.updateMatrixWorld(true);
      for (const [i, marker] of inspection.markers.entries()) {
        const point = marker.point.clone().project(camera);
        const x = ((point.x + 1) * width) / 2;
        const y = ((1 - point.y) * height) / 2;
        const label = `${width}/${sample}: ${marker.id}`;
        assert.ok(
          x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
          label,
        );
        const ray = new Raycaster();
        ray.setFromCamera(new Vector2(point.x, point.y), camera);
        const hit = ray.intersectObject(room, true)[0];
        const expected =
          sample === undefined
            ? marker.id
            : [`entrance-hinge-${sample}`, "entrance-jamb--1", "entrance-leaf"][
                i
              ];
        assert.ok(hit, label);
        assert.equal(hit.object, door.getObjectByName(expected), label);
      }
    }
  }
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

test("门板与柜体实心矩形间距覆盖相离、接触、交叉和包含", () => {
  const box = (
    x: number,
    z: number,
    w: number,
    d: number,
  ): [Point, Point, Point, Point] => [
    { x, z },
    { x: x + w, z },
    { x: x + w, z: z + d },
    { x, z: z + d },
  ];
  const door = box(0, 0, 4, 1);
  for (const [cabinet, expected] of [
    [box(5, 0, 1, 1), 1],
    [box(5, 2, 1, 1), Math.SQRT2],
    [box(4, 0.2, 2, 0.6), 0],
    [box(3, -1, 2, 4), 0],
    [box(2, 0.2, 1, 0.4), 0],
  ] as const) {
    const first = planarRectangleGap(door, cabinet);
    const second = planarRectangleGap(cabinet, door);
    assert.equal(first.distance, expected);
    assert.equal(second.distance, expected);
    assert.equal(
      Math.hypot(first.from.x - first.to.x, first.from.z - first.to.z),
      expected,
    );
  }
});

function sweepAt(sample?: number) {
  const inspection = entranceInspection("sweep", sample);
  assert.equal(inspection.view, "sweep");
  return inspection;
}

test("入口整扇门板42个参考姿态与实物角点一致，整段取景固定", () => {
  const door = new Group();
  door.position.fromArray(entranceFixture.position);
  const pivot = buildEntrance(door);
  const panel = door.getObjectByName("entrance-leaf")!;
  const { sweep, points } = sweepAt();
  assert.equal(sweep.count, 42);
  assert.equal(sweep.index, 26);
  assert.equal(sweep.pose.distance.toFixed(3), "0.611");
  assert.equal(sweep.minimum.deg.toFixed(2), "25.43");
  assert.equal(sweep.closed.distance.toFixed(3), "0.838");
  assert.equal(sweep.displayed.distance.toFixed(3), "0.722");
  assert.equal(sweepAt(-10).sweep.index, 0);
  assert.equal(sweepAt(1000).sweep.index, sweep.count - 1);
  assert.equal(sweepAt(NaN).sweep.index, sweep.minimum.index);
  assert.ok(entranceViewIncludes(entranceCabinet.id, "sweep"));
  assert.ok(entranceViewIncludes(entranceFixture.id, "sweep"));
  assert.ok(!entranceViewIncludes(entranceSettings.readerId, "sweep"));
  const localCorners = [
    [-1, 1],
    [1, 1],
    [1, -1],
    [-1, -1],
  ];
  for (let index = 0; index < sweep.count; index++) {
    const view = sweepAt(index);
    const { pose } = view.sweep;
    assert.equal(pose.index, index);
    assert.ok(pose.deg <= index && pose.distance >= sweep.minimum.distance);
    assert.deepEqual(view.points, points);
    assert.ok(
      Math.abs(pose.doorPoint.distanceTo(pose.cabinetPoint) - pose.distance) <
        1e-10,
    );
    assert.equal(sweep.arc[index].x, pose.leaf[2].x);
    assert.equal(sweep.arc[index].z, pose.leaf[2].z);
    pivot.rotation.y = pose.angle;
    door.updateMatrixWorld(true);
    for (const [i, [x, z]] of localCorners.entries()) {
      const actual = panel.localToWorld(
        new Vector3(
          (x * entranceLeaf.width) / 2,
          0,
          (z * entranceSettings.leafThickness) / 2,
        ),
      );
      assert.ok(actual.setY(pose.leaf[i].y).distanceTo(pose.leaf[i]) < 1e-10);
    }
  }
});

test("入口扫掠首末和最小姿态的标记分别命中门板和配电柜实体", () => {
  const door = new Group();
  door.position.fromArray(entranceFixture.position);
  const pivot = buildEntrance(door);
  const cabinet = new Mesh(new BoxGeometry(...entranceCabinet.size));
  cabinet.name = "配电柜";
  cabinet.position.fromArray(entranceCabinet.position);
  cabinet.updateMatrixWorld(true);
  const faces = [door, cabinet];
  for (const sample of [0, 26, 41]) {
    const view = sweepAt(sample);
    pivot.rotation.y = view.sweep.pose.angle;
    door.updateMatrixWorld(true);
    for (const [width, height] of [
      [852, 836],
      [744, 704],
    ]) {
      const frame = {
        left: Math.min(width * 0.48, 250),
        right: width - 40,
        top: 100,
        bottom: height - 48,
      };
      const fit = entranceViewFrame(view, width, height, frame);
      const hits = view.markers.map(
        ({ point }) =>
          new Raycaster(
            fit.position,
            point.clone().sub(fit.position).normalize(),
          ).intersectObjects(faces)[0]?.object.name,
      );
      assert.deepEqual(
        hits,
        ["entrance-leaf", "配电柜"],
        `姿态${sample}，宽度${width}`,
      );
    }
  }
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
        left: id === "section" ? 52 : 264,
        right: width - 40,
        top: 100,
        bottom: height - (id === "section" ? 105 : 48),
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
    "sweep",
    "heads",
    "head-boundary",
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

test("应急灯朝向取两块实体镜片的世界法线，双栏与窄幅分别拾取左右镜片", () => {
  const view = entranceInspection("heads");
  assert.equal(view.view, "heads");
  assert.ok(entranceViewIncludes(emergencyLight.id, view.view));
  assert.ok(!entranceViewIncludes(exitSign.id, view.view));
  assert.equal(view.spacing.toFixed(3), "0.195");
  const root = new Group();
  root.position.fromArray(emergencyLight.position);
  buildEntranceLighting(root, false);
  root.updateMatrixWorld(true);
  const lenses = ["emergency-light-lens-left", "emergency-light-lens-right"];
  for (const [i, head] of view.heads.entries()) {
    const lens = root.getObjectByName(lenses[i])!;
    const face = lens.getWorldPosition(new Vector3());
    const direction = lens
      .localToWorld(new Vector3(0, 0, 1))
      .sub(face)
      .normalize();
    assert.ok(head.face.distanceTo(face) < 1e-10);
    assert.ok(head.direction.distanceTo(direction) < 1e-10);
    assert.ok(Math.abs(head.direction.length() - 1) < 1e-10);
    assert.equal(head.azimuth.toFixed(2), i === 0 ? "-16.45" : "16.45");
    assert.equal(head.tilt.toFixed(2), "12.66");
    const [start, tip]: Vector3[] = view.paths[i * 2];
    assert.ok(
      start.clone().sub(face).normalize().distanceTo(direction) < 1e-10,
    );
    assert.ok(tip.clone().sub(start).normalize().distanceTo(direction) < 1e-10);
  }
  for (const [width, height] of [
    [852, 836],
    [744, 704],
  ]) {
    const rect = {
      left: 264,
      right: width - 40,
      top: 100,
      bottom: height - 48,
    };
    const fit = entranceViewFrame(view, width, height, rect);
    const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
    camera.position.copy(fit.position);
    camera.lookAt(fit.target);
    camera.updateMatrixWorld(true);
    const targets: (string | undefined)[] = view.markers.map(({ point }) => {
      const screen = point.clone().project(camera);
      const x = ((screen.x + 1) * width) / 2,
        y = ((1 - screen.y) * height) / 2;
      assert.ok(
        x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
      );
      const ray = new Raycaster(
        fit.position,
        point.clone().sub(fit.position).normalize(),
      );
      return ray.intersectObject(root)[0]?.object.name;
    });
    assert.deepEqual(targets, lenses);
  }
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
