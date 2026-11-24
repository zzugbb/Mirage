import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Sprite,
} from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { environmentRounds } from "./environment-rounds.ts";
import { crossingObjectIds } from "./fixture-crossing.ts";
import {
  probeHeightScene,
  probeHeightViewFrame,
} from "./probe-height-scene.ts";
import { rackUnitAtHeight } from "./rack-installation.ts";
import { CrossingGeometry } from "./scene/fixture-crossing.ts";
import { buildRoomShell } from "./scene/room.ts";

const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-9, `${a} / ${b}`);

test("两处探头仅投影到已登记同排八柜，U 位和安装对象沿用配置", () => {
  const offsets = [3.71, 5.81, 7.91, 10.01];
  const { frontDoor } = definition.rack.enclosure;
  for (const [
    rowIndex,
    { probe, points, racks },
  ] of environmentRounds.entries()) {
    assert.equal(probeHeightScene(probe.id)?.rack.id, racks[0].id);
    assert.equal(probeHeightScene(points[0].id), null);
    assert.equal(probeHeightScene(points[1].id), null);
    assert.equal(
      probeHeightScene(probe.id, environmentRounds[1 - rowIndex].racks[0].id),
      null,
    );
    assert.equal(probeHeightScene(probe.id, "missing"), null);
    for (const [index, rack] of racks.entries()) {
      const pair = probeHeightScene(probe.id, rack.id)!;
      const { unit, segment } = rackUnitAtHeight(rack.id, probe.position[1])!;
      assert.deepEqual(crossingObjectIds(pair), [probe.id, rack.id]);
      assert.equal(pair.unit, unit);
      assert.equal(pair.unit, 29);
      assert.deepEqual(pair.segment, segment);
      assert.deepEqual(pair.points[0].toArray(), probe.position);
      assert.deepEqual(pair.points[1].toArray(), [
        rack.position[0],
        probe.position[1],
        rack.position[2] + frontDoor.hingeZ,
      ]);
      close(pair.height, 1.5);
      close(pair.unitBottom!, 1.466825);
      close(pair.unitTop!, 1.511275);
      close(pair.offsetX, offsets[index]);
      close(pair.offsetZ, rowIndex === 0 ? 0.37 : 0.77);
      const [detector, bend, outside, front] = pair.ruler;
      assert.ok(pair.ruler.every((point) => point.y === pair.height));
      assert.equal(detector.x, bend.x);
      assert.equal(bend.z, outside.z);
      assert.equal(outside.x, front.x);
      assert.ok(
        racks.every((other) => bend.z > other.position[2] + frontDoor.hingeZ),
      );
      assert.equal(pair.unitOutline[0].y, pair.unitBottom);
      assert.equal(pair.unitOutline[2].y, pair.unitTop);
    }
  }
});

test("模拟布置变化时只标配置盲板，超出 U 位保留同高位置且无设备", () => {
  const { probe, racks } = environmentRounds[0];
  const prior = probe.position[1];
  try {
    probe.position[1] = definition.rack.unitOrigin + definition.rack.unitPitch;
    const blank = probeHeightScene(probe.id, racks[0].id)!;
    assert.equal(blank.unit, 1);
    assert.equal(blank.segment?.kind, "blanking");
    assert.equal(blank.unitOutline.length, 4);
    probe.position[1] = 0.18;
    const outside = probeHeightScene(probe.id, racks[0].id)!;
    assert.equal(outside.unit, null);
    assert.equal(outside.segment, null);
    assert.equal(outside.unitBottom, null);
    assert.equal(outside.unitTop, null);
    assert.deepEqual(outside.unitOutline, []);
    assert.ok(outside.ruler.every((point) => point.y === 0.18));
  } finally {
    probe.position[1] = prior;
  }
});

test("两档透视下各柜面与墙上探头无遮挡，量尺仍保留深度关系", () => {
  const world = new Group();
  const box = (parent: Object3D, size: number[], position: number[]) => {
    const mesh = new Mesh(new BoxGeometry(...size), new MeshStandardMaterial());
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  };
  buildRoomShell(world, box, box, () => new Sprite());
  const {
    size,
    enclosure: { frontDoor },
  } = definition.rack;
  for (const rack of definition.installation.racks) {
    const group = new Group();
    group.name = rack.id;
    group.position.fromArray(rack.position);
    world.add(group);
    box(group, size, [0, size[1] / 2, 0]);
    const door = new Mesh(
      new PlaneGeometry(frontDoor.width, size[1] - 0.21),
      new MeshStandardMaterial(),
    );
    door.name = "柜前门面";
    door.position.set(0, size[1] / 2 + 0.05, frontDoor.hingeZ);
    group.add(door);
  }
  world.updateMatrixWorld(true);
  const drawing = new CrossingGeometry();
  for (const { probe, racks } of environmentRounds)
    for (const rack of racks) {
      const pair = probeHeightScene(probe.id, rack.id)!;
      for (const [width, height] of [
        [852, 836],
        [744, 704],
      ]) {
        const rect = {
          left: 44,
          right: width - 40,
          top: 100,
          bottom: height - 140,
        };
        const fit = probeHeightViewFrame(pair, width, height, rect);
        const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
        camera.position.copy(fit.position);
        camera.lookAt(fit.target);
        camera.updateMatrixWorld(true);
        const targets: (string | undefined)[] = pair.markers.map(
          ({ point }) => {
            const projected = point.clone().project(camera);
            const x = ((projected.x + 1) * width) / 2,
              y = ((1 - projected.y) * height) / 2;
            assert.ok(
              x > rect.left &&
                x < rect.right &&
                y > rect.top &&
                y < rect.bottom,
            );
            const ray = new Raycaster(
              fit.position,
              point.clone().sub(fit.position).normalize(),
            );
            return ray.intersectObject(world)[0]?.object.parent?.name;
          },
        );
        assert.deepEqual(targets, [probe.id, rack.id]);
      }
      drawing.update(pair);
      assert.ok(drawing.geometry.drawRange.count > 16);
      assert.equal(drawing.lines.material.depthTest, true);
    }
  drawing.dispose();
});
