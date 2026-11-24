import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Sprite,
  Vector3,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  entranceFixture,
  entranceOpening,
  entranceSettings,
} from "./entrance.ts";
import {
  entranceFrameSectionInspection,
  entranceFrameSectionViewFrame,
} from "./entrance-frame-section.ts";
import { buildEntrance } from "./scene/entrance.ts";
import { buildRoomShell } from "./scene/room.ts";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} / ${expected}`);

test("三层截面真宽度与同一展示门扇和门框的双向射线吻合", () => {
  const inspection = entranceFrameSectionInspection();
  const { section } = inspection;
  assert.equal(section.selected, 2);
  assert.equal(entranceFrameSectionInspection(1.2).section.selected, 2);
  close(section.height, 0.8195);
  close(section.height - entranceOpening.bottom, 0.775);
  close(section.frameWidth, 1.21);
  close(section.outerWidth, 1.3);
  assert.equal(section.angle, entranceSettings.displayAngle);
  const root = new Group();
  root.position.fromArray(entranceFixture.position);
  const pivot = buildEntrance(root);
  root.updateMatrixWorld(true);
  for (const [index, sample] of section.samples.entries()) {
    const probe = sample.left.clone().lerp(sample.right, 0.5);
    // 浮点网格边沿略向截面内部取样，保留室内框口的原配置量值。
    probe.z -= 1e-8;
    const hit = [-1, 1].map(
      (direction) =>
        new Raycaster(probe, new Vector3(direction, 0, 0)).intersectObject(
          root,
          true,
        )[0],
    );
    assert.equal(
      hit[0]?.object.name,
      index === 0 ? "entrance-jamb--1" : "entrance-leaf",
    );
    assert.equal(hit[1]?.object.name, "entrance-jamb-1");
    close(hit[0].point.x, sample.left.x);
    close(hit[1].point.x, sample.right.x);
    close(hit[1].point.x - hit[0].point.x, sample.width);
    close(sample.width, [1.21, 1.1542423869811609, 1.11862513201736][index]);
    close(sample.depth, [0.12, 0.03, 0][index]);
    close(sample.left.distanceTo(sample.right), sample.width);
    const picked = entranceFrameSectionInspection(index);
    assert.deepEqual(picked.paths[0], [sample.left, sample.right]);
    assert.equal(picked.section.current.obstacle, index ? "leaf" : "jamb");
    assert.deepEqual(picked.points, inspection.points);
  }
  assert.equal(pivot.rotation.y, entranceSettings.displayAngle);
});

test("两档门区取景避开配电模型和简模，三个深度均拾取实际构件", async () => {
  const room = new Group();
  const box = (parent: Object3D, size: number[], position: number[]) => {
    const mesh = new Mesh(new BoxGeometry(...size));
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  };
  const { fixtures } = buildRoomShell(room, box, box, () => new Sprite());
  const power = definition.facilities.find(({ id }) => id === "power-01")!;
  const fallback = new Group();
  box(fallback, power.size, power.position);
  fallback.updateMatrixWorld(true);
  const bytes = await readFile(
    new URL("../assets/public/models/power-cabinet.glb", import.meta.url),
  );
  const { scene } = await new GLTFLoader().parseAsync(
    Uint8Array.from(bytes).buffer,
    "",
  );
  const powerModel = new Group();
  const imported = new Group();
  const bounds = new Box3().setFromObject(scene);
  const scale = power.size[1] / bounds.getSize(new Vector3()).y;
  imported.scale.setScalar(scale);
  imported.position
    .copy(bounds.getCenter(new Vector3()))
    .multiplyScalar(-scale);
  imported.add(scene);
  powerModel.add(imported);
  powerModel.position.fromArray(power.position);
  powerModel.updateMatrixWorld(true);
  const cooling = definition.facilities.find(({ id }) => id === "cooling-01")!;
  box(room, cooling.size, cooling.position);
  room.updateMatrixWorld(true);
  const entrance = fixtures.get(entranceFixture.id)!;
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
    const camera = new PerspectiveCamera(40, width / height, 0.01, 150);
    for (const sample of [0, 1, 2]) {
      const inspection = entranceFrameSectionInspection(sample);
      const fit = entranceFrameSectionViewFrame(
        inspection,
        width,
        height,
        rect,
      );
      camera.position.copy(fit.position);
      camera.lookAt(fit.target);
      camera.updateMatrixWorld(true);
      const pick = (point: Vector3, cabinet: Group) =>
        new Raycaster(
          fit.position,
          point.clone().sub(fit.position).normalize(),
        ).intersectObjects([room, cabinet], true)[0];
      for (const [i, { point, id }] of inspection.markers.entries()) {
        const expected = i
          ? "entrance-jamb-1"
          : sample
            ? "entrance-leaf"
            : "entrance-jamb--1";
        const p = point.clone().project(camera);
        const x = ((p.x + 1) * width) / 2;
        const y = ((1 - p.y) * height) / 2;
        const label = `${width}/${sample}/${id}`;
        assert.ok(
          x > 52 && x < rect.right && y > rect.top && y < height - 105,
          label,
        );
        for (const cabinet of [fallback, powerModel]) {
          const hit = pick(point, cabinet);
          assert.ok(hit, label);
          assert.equal(hit.object, entrance.getObjectByName(expected), label);
        }
      }
      const [left, right] = inspection.paths[0];
      for (const sampleX of [0.2, 0.5, 0.8]) {
        const point = left.clone().lerp(right, sampleX);
        for (const cabinet of [fallback, powerModel]) {
          const surface = pick(point, cabinet);
          assert.ok(
            !surface ||
              surface.distance > fit.position.distanceTo(point) - 0.002,
          );
        }
      }
    }
  }
});
