import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BoxGeometry,
  Box3,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  type Object3D,
  PerspectiveCamera,
  Raycaster,
  Sprite,
} from "three";
import {
  condensate,
  condensateFixtures,
  condensateFloorY,
  condensateOpeningRadius,
  condensateReceiverProfile,
  condensateRimLip,
  condensateSource,
  outlet,
  rim,
} from "./condensate.ts";
import { drainJointFrame, drainJointInspection } from "./condensate-joint.ts";
import { crossingObjectIds } from "./fixture-crossing.ts";
import {
  buildCondensate,
  showCondensateReceiverSection,
} from "./scene/condensate.ts";
import { CrossingGeometry } from "./scene/fixture-crossing.ts";
import { buildRoomShell } from "./scene/room.ts";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} / ${expected}`);

function fixtures() {
  return condensateFixtures.map(({ id, position }) => {
    const group = new Group();
    group.name = id;
    group.position.fromArray(position);
    buildCondensate(group, id);
    group.updateMatrixWorld(true);
    return group;
  });
}

test("柜侧接合从柜体东侧配置面量至上游转角，露出套管尺寸共用实体", () => {
  const pair = drainJointInspection("cabinet");
  assert.equal(pair.stage, "cabinet");
  assert.deepEqual(
    [pair.upper.id, pair.lower.id],
    [condensate.sourceId, condensate.pipe.id],
  );
  const [pipe] = fixtures();
  const socket = pipe.getObjectByName(
    "condensate-socket",
  ) as Mesh<CylinderGeometry>;
  const [from, to] = pair.paths[0],
    [wall, end] = pair.paths[3];
  close(pair.metrics.height, outlet[1]);
  close(pair.metrics.inset, condensate.sleeveInset);
  close(pair.metrics.reach, 0.07);
  close(pair.metrics.socketLength, 0.035);
  close(pair.metrics.socketLength, socket.geometry.parameters.height);
  close(from.distanceTo(to), pair.metrics.reach);
  close(wall.distanceTo(end), pair.metrics.socketLength);
  close(wall.x, outlet[0]);
  close(from.x, outlet[0]);
});

test("斗口尺寸按管外缘、斗口内沿与两开口垂直间隔读取", () => {
  const pair = drainJointInspection("mouth");
  assert.equal(pair.stage, "mouth");
  assert.deepEqual(
    [pair.upper.id, pair.lower.id],
    [condensate.pipe.id, condensate.receiver.id],
  );
  const [, receiver] = fixtures();
  const bowl = receiver.getObjectByName(
    "condensate-receiver",
  ) as Mesh<LatheGeometry>;
  const profile = bowl.geometry.parameters.points;
  assert.ok(
    profile.some(({ x, y }) => x === condensateOpeningRadius && y === 0),
  );
  assert.ok(
    profile.some(
      ({ x, y }) =>
        x === condensateOpeningRadius && y === -condensateRimLip.innerDepth,
    ),
  );
  const [upper, lower] = pair.paths[2],
    [projection, innerRim] = pair.paths[5];
  close(pair.metrics.verticalGap, 0.12);
  close(pair.metrics.planarOffset, 0);
  close(pair.metrics.pipeDiameter, 0.044);
  close(pair.metrics.openingDiameter, 0.194);
  close(pair.metrics.radialMargin, 0.075);
  close(upper.distanceTo(lower), pair.metrics.verticalGap);
  close(projection.distanceTo(innerRim), pair.metrics.radialMargin);
  close(
    Math.hypot(innerRim.x - rim[0], innerRim.z - rim[2]),
    condensateOpeningRadius,
  );
  assert.ok(projection.y > rim[1] && innerRim.y === projection.y);
});

test("两档观察画幅中柜面、转角、下管和斗口标记均指向对应实物", () => {
  const cabinet = new Mesh(new BoxGeometry(...condensateSource.size));
  cabinet.name = condensate.sourceId;
  cabinet.position.fromArray(condensateSource.position);
  cabinet.updateMatrixWorld(true);
  const objects = [cabinet, ...fixtures()];
  const geometry = new CrossingGeometry();
  for (const [stage, names] of [
    ["cabinet", [condensate.sourceId, "condensate-side-elbow"]],
    ["mouth", ["condensate-downpipe", "condensate-receiver"]],
  ] as const) {
    const pair = drainJointInspection(stage);
    assert.deepEqual(crossingObjectIds(pair), [
      condensate.sourceId,
      condensate.pipe.id,
      condensate.receiver.id,
    ]);
    for (const [width, height] of [
      [852, 836],
      [744, 704],
    ]) {
      const rect = {
        left: 36,
        right: width - 40,
        top: 100,
        bottom: height - 150,
      };
      const fit = drainJointFrame(pair, width, height, rect);
      const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
      camera.position.copy(fit.position);
      camera.lookAt(fit.target);
      camera.updateMatrixWorld(true);
      for (const point of pair.points) {
        const p = point.clone().project(camera);
        const x = ((p.x + 1) * width) / 2,
          y = ((1 - p.y) * height) / 2;
        assert.ok(
          x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
        );
      }
      const hits: (string | undefined)[] = pair.markers.map(({ point }) => {
        const ray = new Raycaster(
          fit.position,
          point.clone().sub(fit.position).normalize(),
        );
        return ray.intersectObjects(objects)[0]?.object.name;
      });
      assert.deepEqual(hits, names);
    }
    geometry.update(pair);
    assert.equal(
      geometry.geometry.drawRange.count,
      pair.paths.reduce((n, path) => n + (path.length - 1) * 2, 0),
    );
    assert.equal(geometry.lines.material.depthTest, true);
  }
  geometry.dispose();
});

test("完整斗壁和半剖共用原剖面，切面保留厚度，截止标高取地坪", () => {
  const [, receiver] = fixtures();
  const full = receiver.getObjectByName(
    "condensate-receiver",
  ) as Mesh<LatheGeometry>;
  const section = receiver.getObjectByName(
    "condensate-receiver-section",
  ) as Mesh<LatheGeometry>;
  const cut = receiver.getObjectByName("condensate-receiver-cut")!;
  const pair = drainJointInspection("receiver");
  assert.equal(pair.stage, "receiver");
  assert.deepEqual(
    full.geometry.parameters.points.map((point) => point.toArray()),
    condensateReceiverProfile,
  );
  assert.deepEqual(
    section.geometry.parameters.points,
    full.geometry.parameters.points,
  );
  close(section.geometry.parameters.phiLength, Math.PI);
  const fullBounds = new Box3().setFromObject(full);
  const sectionBounds = new Box3().setFromObject(section);
  const cutBounds = new Box3().setFromObject(cut);
  close(sectionBounds.min.x, fullBounds.min.x);
  close(sectionBounds.max.x, rim[0]);
  close(cutBounds.min.x, rim[0]);
  close(cutBounds.max.x, rim[0]);
  close(cutBounds.min.y, fullBounds.min.y);
  close(cutBounds.max.y, fullBounds.max.y);
  close(cutBounds.min.y, condensateFloorY);
  close(pair.metrics.bodyHeight, 0.1755);
  close(pair.metrics.bodyHeight, fullBounds.max.y - fullBounds.min.y);
  close(pair.metrics.bowlDepth, 0.075);
  close(pair.paths[0][0].distanceTo(pair.paths[0][1]), pair.metrics.bowlDepth);
  close(pair.metrics.outletHeight, condensateFloorY);
  close(pair.metrics.outletDiameter, 0.054);
  const throat = condensateReceiverProfile.at(-1)!;
  close(pair.metrics.outletDiameter, throat[0] * 2);
  close(condensate.stemRadius - throat[0], 0.005);
  close(condensateReceiverProfile[1][1] - throat[1], 0.012);
});

test("双画幅半剖标记命中斗内、实体切面和原地坪，切回或退出时恢复完整斗体", () => {
  const room = new Group();
  room.userData.entityId = "room-01";
  const box = (parent: Object3D, size: number[], position: number[]) => {
    const mesh = new Mesh(new BoxGeometry(...size));
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  };
  const { fixtures, floor } = buildRoomShell(
    room,
    box,
    box,
    () => new Sprite(),
  );
  box(room, condensateSource.size, condensateSource.position);
  const receiver = fixtures.get(condensate.receiver.id)!;
  const meshes = [
    "condensate-receiver",
    "condensate-receiver-section",
    "condensate-receiver-cut",
  ].map((name) => receiver.getObjectByName(name)!);
  assert.deepEqual(
    meshes.map((mesh) => mesh.visible),
    [true, false, false],
  );
  showCondensateReceiverSection(fixtures, true);
  assert.deepEqual(
    meshes.map((mesh) => mesh.visible),
    [false, true, true],
  );
  room.updateMatrixWorld(true);
  const candidates: Mesh[] = [];
  room.traverseVisible((node) => {
    if (node instanceof Mesh) candidates.push(node);
  });
  const pair = drainJointInspection("receiver");
  for (const [width, height] of [
    [852, 836],
    [744, 704],
    [644, 704],
  ]) {
    const rect = {
      left: 36,
      right: width - 40,
      top: 100,
      bottom: height - 150,
    };
    const fit = drainJointFrame(pair, width, height, rect);
    const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
    camera.position.copy(fit.position);
    camera.lookAt(fit.target);
    camera.updateMatrixWorld(true);
    for (const [i, { point }] of pair.markers.entries()) {
      const p = point.clone().project(camera);
      const x = ((p.x + 1) * width) / 2,
        y = ((1 - p.y) * height) / 2;
      assert.ok(
        x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
      );
      const ray = new Raycaster(
        fit.position,
        point.clone().sub(fit.position).normalize(),
      );
      assert.equal(
        ray.intersectObjects(candidates, false)[0]?.object,
        [meshes[1], meshes[2], floor][i],
      );
    }
  }
  showCondensateReceiverSection(fixtures, false);
  assert.deepEqual(
    meshes.map((mesh) => mesh.visible),
    [true, false, false],
  );
  assert.equal(floor.visible, true);
});
