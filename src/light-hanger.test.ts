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
  lightCeilingMount,
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

function buildFixtureScene() {
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
  return { world, fixtures };
}

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

test("吊点近景在两档工作台逐端命中真实顶板底座和灯壳，尺线留在可用画幅", () => {
  const { world, fixtures } = buildFixtureScene();
  const drawing = new CrossingGeometry();
  for (const light of ceilingLights)
    for (const side of lightHangerSides) {
      const pair = lightHangerInspection(light.id, side)!;
      const end = side < 0 ? "negative" : "positive";
      const hangerName = `light-hanger-${end}`;
      const plateName = `light-mount-plate-${end}`;
      const fixture = fixtures.get(light.id)!;
      const rod = new Box3().setFromObject(
        fixture.getObjectByName(hangerName)!,
      );
      const hull = new Box3().setFromObject(
        fixture.getObjectByName("light-housing")!,
      );
      const [top, bottom] = pair.points;
      close(
        light.position[1] + lightCeilingMount(light, side).rodTop,
        rod.max.y,
      );
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
        assert.deepEqual(picked, [plateName, "light-housing"]);
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

test("六处顶灯吊杆的底座和方形接续座共轴贴合，保持原吊点总标高差", () => {
  const { fixtures } = buildFixtureScene();
  for (const light of ceilingLights) {
    const fixture = fixtures.get(light.id)!;
    const housing = new Box3().setFromObject(
      fixture.getObjectByName("light-housing")!,
    );
    for (const side of lightHangerSides) {
      const end = side < 0 ? "negative" : "positive";
      const [plate, socket, rod] = [
        `light-mount-plate-${end}`,
        `light-mount-socket-${end}`,
        `light-hanger-${end}`,
      ].map((part) => new Box3().setFromObject(fixture.getObjectByName(part)!));
      const {
        plate: configuredPlate,
        socket: configuredSocket,
        rodLength,
      } = lightCeilingMount(light, side);
      const [x, , z] = light.position;
      const axisZ = z + side * (light.length / 2 - lightProfile.hangerInset);
      for (const bounds of [plate, socket, rod]) {
        const center = bounds.getCenter(new Vector3());
        close(center.x, x);
        close(center.z, axisZ);
      }
      const size = new Vector3();
      plate
        .getSize(size)
        .toArray()
        .forEach((value, index) => close(value, configuredPlate.size[index]));
      socket
        .getSize(size)
        .toArray()
        .forEach((value, index) => close(value, configuredSocket.size[index]));
      close(rodLength, 0.354);
      close(rod.max.y - rod.min.y, rodLength);
      close(rod.min.y, housing.max.y);
      close(rod.max.y, socket.min.y);
      close(socket.max.y, plate.min.y);
      close(plate.max.y, definition.room.size[1]);
      close(plate.max.y - rod.min.y, 0.39);
    }
  }
});

test("两档工作台的顶板安装近景逐端命中底座、接续座与吊杆，并同框显示 36 mm 尺线", () => {
  const { world } = buildFixtureScene();
  for (const light of ceilingLights) {
    for (const side of lightHangerSides) {
      const pair = lightHangerInspection(light.id, side, "mount")!;
      const { mount, markers } = pair;
      const end = side < 0 ? "negative" : "positive";
      assert.ok(mount);
      assert.deepEqual(crossingObjectIds(pair), [light.id]);
      assert.equal(
        pair.nearestCrossing?.tray.id,
        side < 0 ? "cable-tray-b" : "cable-tray-a",
      );
      close(mount.ruler[0].y, 4.164);
      close(mount.ruler[1].y, 4.2);
      close(mount.ruler[0].distanceTo(mount.ruler[1]), 0.036);
      assert.ok(mount.ceiling.every((point) => point.y === mount.ceilingY));
      assert.deepEqual(
        markers.map(({ id }) => id),
        ["light-mount-plate", "light-mount-socket", "light-mount-rod"],
      );
      for (const [width, height] of [
        [852, 836],
        [744, 704],
      ]) {
        const context = `${light.id}/${side}/${width}`;
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
          ...markers.map(({ point }) => point),
        ]) {
          const projected = point.clone().project(camera);
          const x = ((projected.x + 1) * width) / 2;
          const y = ((1 - projected.y) * height) / 2;
          assert.ok(
            x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
            context,
          );
        }
        const hits = markers.map(({ point }) => {
          const ray = new Raycaster(
            fit.position,
            point.clone().sub(fit.position).normalize(),
          );
          return ray.intersectObject(world)[0]?.object.name;
        });
        assert.deepEqual(
          hits,
          [
            `light-mount-plate-${end}`,
            `light-mount-socket-${end}`,
            `light-hanger-${end}`,
          ],
          context,
        );
      }
    }
  }
});
