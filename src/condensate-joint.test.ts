import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  PerspectiveCamera,
  Raycaster,
} from "three";
import {
  condensate,
  condensateFixtures,
  condensateOpeningRadius,
  condensateRimLip,
  condensateSource,
  outlet,
  rim,
} from "./condensate.ts";
import { drainJointFrame, drainJointInspection } from "./condensate-joint.ts";
import { crossingObjectIds } from "./fixture-crossing.ts";
import { buildCondensate } from "./scene/condensate.ts";
import { CrossingGeometry } from "./scene/fixture-crossing.ts";

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
