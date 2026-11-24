import assert from "node:assert/strict";
import { test } from "node:test";
import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Vector3,
} from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  ceilingLights,
  lightHangerSides,
  lightProfile,
} from "./ceiling-lights.ts";
import {
  crossingObjectIds,
  fixtureCrossing,
  lightHangerInspection,
  lightHangerViewFrame,
} from "./fixture-crossing.ts";
import { roomFixtures } from "./fixtures.ts";
import { CrossingGeometry } from "./scene/fixture-crossing.ts";
import { buildRoomFixtures } from "./scene/fixtures.ts";

const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-7, `${a} / ${b}`);

test("三盏顶灯两端各按机房顶标高和灯壳顶面量取，只承接同灯最近交叉桥架", () => {
  assert.equal(lightHangerInspection("cable-tray-a"), null);
  for (const light of ceilingLights) {
    assert.equal(lightHangerInspection(light.id)?.side, -1);
    for (const side of lightHangerSides) {
      const pair = lightHangerInspection(light.id, side)!;
      const [top, bottom, end] = pair.points;
      const trayId = side < 0 ? "cable-tray-b" : "cable-tray-a";
      assert.deepEqual(pair.nearestCrossing, fixtureCrossing(light.id, trayId));
      assert.deepEqual(crossingObjectIds(pair), [light.id]);
      assert.deepEqual([pair.upper.id, pair.lower.id], [light.id, light.id]);
      assert.deepEqual([top.x, top.z], [bottom.x, bottom.z]);
      assert.equal(top.y, definition.room.size[1]);
      close(bottom.y, 3.81);
      close(pair.drop, top.y - bottom.y);
      close(pair.drop, 0.39);
      close(end.z, light.position[2] + (side * light.length) / 2);
      close(pair.inset, Math.abs(end.z - bottom.z));
      close(pair.inset, lightProfile.hangerInset);
      close(pair.alongZ!, 1.95);
      close(pair.dropRuler[0].distanceTo(pair.dropRuler[1]), pair.drop);
      close(pair.insetRuler[0].distanceTo(pair.insetRuler[1]), pair.inset);
      assert.ok(pair.topReference.every((point) => point.y === top.y));
    }
  }
});

test("吊点近景在两档工作台逐端命中真实吊杆和灯壳，尺线留在可用画幅", () => {
  const world = new Group();
  const mounts = new Map(
    [...new Set(roomFixtures.map((fixture) => fixture.mountId))].map((id) => {
      const group = new Group();
      world.add(group);
      return [id, group];
    }),
  );
  const fixtures = buildRoomFixtures(mounts, (parent, size, position) => {
    const mesh = new Mesh(new BoxGeometry(...size));
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  });
  world.updateMatrixWorld(true);
  const drawing = new CrossingGeometry();
  for (const light of ceilingLights)
    for (const side of lightHangerSides) {
      const pair = lightHangerInspection(light.id, side)!;
      const hangerName =
        side < 0 ? "light-hanger-negative" : "light-hanger-positive";
      const fixture = fixtures.get(light.id)!;
      const rod = new Box3().setFromObject(
        fixture.getObjectByName(hangerName)!,
      );
      const hull = new Box3().setFromObject(
        fixture.getObjectByName("light-housing")!,
      );
      const [top, bottom] = pair.points;
      close(top.y, rod.max.y);
      close(bottom.y, rod.min.y);
      close(bottom.y, hull.max.y);
      close(top.z, rod.getCenter(new Vector3()).z);
      close(rod.max.x - rod.min.x, lightProfile.hangerWidth);
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
        const fit = lightHangerViewFrame(pair, width, height, rect);
        const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
        camera.position.copy(fit.position);
        camera.lookAt(fit.target);
        camera.updateMatrixWorld(true);
        for (const point of [
          ...pair.points,
          ...pair.markers.map(({ point }) => point),
        ]) {
          const p = point.clone().project(camera);
          const x = ((p.x + 1) * width) / 2,
            y = ((1 - p.y) * height) / 2;
          assert.ok(
            x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
          );
        }
        const picked: (string | undefined)[] = pair.markers.map(({ point }) => {
          const ray = new Raycaster(
            fit.position,
            point.clone().sub(fit.position).normalize(),
          );
          return ray.intersectObject(world)[0]?.object.name;
        });
        assert.deepEqual(picked, [hangerName, "light-housing"]);
      }
      drawing.update(pair);
      const positions = drawing.geometry.getAttribute("position");
      assert.ok(positions.count > 12);
      for (const [i, point] of [
        [0, top],
        [5, bottom],
      ] as const) {
        assert.ok(
          new Vector3().fromBufferAttribute(positions, i).distanceTo(point) <
            1e-6,
        );
      }
      assert.equal(drawing.lines.material.depthTest, true);
    }
  drawing.dispose();
});
