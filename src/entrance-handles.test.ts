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
import { entranceFixture, entranceHandles } from "./entrance.ts";
import {
  entranceHandleInspection,
  entranceHandleViewFrame,
} from "./entrance-handles.ts";
import { buildEntrance } from "./scene/entrance.ts";
import { buildRoomShell } from "./scene/room.ts";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} / ${expected}`);

test("门扇两面沿各自法向量取尺寸，标注与原装配部件位置一致", () => {
  const door = new Group();
  door.position.fromArray(entranceFixture.position);
  const pivot = buildEntrance(door);
  door.updateMatrixWorld(true);
  assert.equal(entranceHandleInspection().handles.selected, 0);
  for (const invalid of [-1, 2, 0.5, NaN])
    assert.equal(entranceHandleInspection(invalid).handles.selected, 0);

  for (const { index, side, faceZ, parts } of entranceHandles) {
    const { handles, paths, markers } = entranceHandleInspection(index);
    assert.equal(handles.selected, index);
    assert.deepEqual(
      handles.sides.map(({ label }) => label),
      ["室内侧", "室外侧"],
    );
    close(handles.heightFromOpening, 1.05);
    close(handles.faceToBar, 0.0575);
    close(handles.barLength, 0.13);
    close(handles.stemDepth, 0.045);
    assert.deepEqual(handles.plateSize, [0.045, 0.18, 0.012]);
    const [start, end] = paths[0].map((point) =>
      pivot.worldToLocal(point.clone()),
    );
    close(start.z, faceZ);
    close(end.z, faceZ + side * 0.0575);
    close(start.x, end.x);
    close(start.y, end.y);
    close(start.distanceTo(end), handles.faceToBar);

    for (const part of Object.values(parts)) {
      const mesh = pivot.getObjectByName(part.name);
      assert.ok(mesh instanceof Mesh);
      assert.ok(mesh.geometry instanceof BoxGeometry);
      assert.deepEqual(mesh.position.toArray(), part.position);
      const { width, height, depth } = mesh.geometry.parameters;
      assert.deepEqual([width, height, depth], part.size);
    }
    for (const [marker, part] of [
      [markers[0], parts.bar],
      [markers[1], parts.plate],
    ] as const) {
      const p = pivot.worldToLocal(marker.point.clone());
      close(p.z, part.position[2] + (side * part.size[2]) / 2);
      assert.ok(Math.abs(p.x - part.position[0]) < part.size[0] / 2);
      assert.ok(Math.abs(p.y - part.position[1]) < part.size[1] / 2);
    }
  }
});

test("两档门区近景能拾取两面握杆和底板，尺线避开实际门板与邻近柜体", async () => {
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
  const cabinet = new Group();
  const bounds = new Box3().setFromObject(scene);
  const scale = power.size[1] / bounds.getSize(new Vector3()).y;
  scene.scale.setScalar(scale);
  scene.position.copy(bounds.getCenter(new Vector3())).multiplyScalar(-scale);
  cabinet.add(scene);
  cabinet.position.fromArray(power.position);
  cabinet.updateMatrixWorld(true);

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
    for (const { index, parts } of entranceHandles) {
      const inspection = entranceHandleInspection(index);
      const fit = entranceHandleViewFrame(inspection, width, height, rect);
      camera.position.copy(fit.position);
      camera.lookAt(fit.target);
      camera.updateMatrixWorld(true);
      const pixel = (point: Vector3) => {
        const clip = point.clone().project(camera);
        return new Vector3(
          ((clip.x + 1) * width) / 2,
          ((1 - clip.y) * height) / 2,
          0,
        );
      };
      const trace = (point: Vector3, powerModel: Group) =>
        new Raycaster(
          fit.position,
          point.clone().sub(fit.position).normalize(),
        ).intersectObjects([room, powerModel], true)[0];
      const insideFrame = (point: Vector3, context: string) => {
        const { x, y } = pixel(point);
        assert.ok(
          x > 52 && x < rect.right && y > rect.top && y < height - 105,
          `${context} / ${x} / ${y}`,
        );
      };
      for (const [i, marker] of inspection.markers.entries()) {
        const expected = door.getObjectByName(
          i === 0 ? parts.bar.name : parts.plate.name,
        );
        const context = `${width}/${index}/${marker.id}`;
        insideFrame(marker.point, context);
        for (const powerModel of [fallback, cabinet]) {
          assert.equal(
            trace(marker.point, powerModel)?.object,
            expected,
            context,
          );
        }
      }
      const [from, to] = inspection.paths[0];
      for (const point of [from, to, from.clone().lerp(to, 0.5)]) {
        const context = `${width}/${index}/尺线`;
        insideFrame(point, context);
        for (const powerModel of [fallback, cabinet]) {
          const hit = trace(point, powerModel);
          assert.ok(
            !hit || hit.distance >= fit.position.distanceTo(point) - 0.002,
            `${context} / ${hit?.object.name}`,
          );
        }
      }
      assert.ok(pixel(from).distanceTo(pixel(to)) > 22);
    }
  }
});
