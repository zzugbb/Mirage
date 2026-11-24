import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { cableTraySettings as settings } from "./cable-trays.ts";
import { observationFrame } from "./observation-frame.ts";
import { buildRoomShell } from "./scene/room.ts";
import { trayMountGeometry } from "./tray-mount.ts";

const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} / ${expected}`);

test("两排共十六处顶板安装座与实际吊杆共轴，底座与接续座沿轴贴合", () => {
  const room = new THREE.Group();
  const box = (parent: THREE.Object3D, size: number[], position: number[]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size));
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  };
  const { fixtures } = buildRoomShell(room, box, box, () => new THREE.Sprite());
  room.updateMatrixWorld(true);
  for (const { fixtureId } of settings.rows) {
    const tray = fixtures.get(fixtureId)!;
    const supports = tray.getObjectByName(
      "tray-supports",
    ) as THREE.InstancedMesh;
    const count = settings.supportXs.length;
    assert.equal(supports.count, count * 9);
    supports.geometry.computeBoundingBox();
    const boxAt = (index: number) => {
      const matrix = new THREE.Matrix4();
      supports.getMatrixAt(index, matrix);
      return supports.geometry
        .boundingBox!.clone()
        .applyMatrix4(matrix)
        .translate(tray.position);
    };
    for (const [i, station] of settings.supportXs.entries()) {
      for (const [j, side] of ([-1, 1] as const).entries()) {
        const geometry = trayMountGeometry(
          tray.position.toArray(),
          station,
          side,
        );
        const { rodTopY, ceilingY, mountHeight, neckHeight, paths } = geometry;
        near(rodTopY, 4.12);
        near(ceilingY, 4.2);
        near(mountHeight, 0.08);
        near(neckHeight, 0.068);
        assert.deepEqual(geometry.plateSize, [0.072, 0.012, 0.064]);
        near(paths[0][0].y, rodTopY);
        near(paths[0][1].y, ceilingY);
        near(paths[0][0].distanceTo(paths[0][1]), mountHeight);
        const rodIndex = i * 5 + 1 + j * 2;
        const neckIndex = count * 5 + i * 4 + j * 2;
        const plateIndex = neckIndex + 1;
        const rod = boxAt(rodIndex),
          neck = boxAt(neckIndex),
          plate = boxAt(plateIndex);
        for (const bounds of [rod, neck, plate]) {
          const axis = bounds.getCenter(new THREE.Vector3());
          near(axis.x, tray.position.x + station);
          near(axis.z, tray.position.z + side * settings.rodOffsetZ);
        }
        near(rod.max.y, rodTopY);
        near(neck.min.y, rod.max.y);
        near(plate.min.y, neck.max.y);
        near(plate.max.y, ceilingY);
        for (const [width, height] of [
          [852, 836],
          [744, 704],
          [644, 704],
        ]) {
          const rect = {
            left: 36,
            right: width - 40,
            top: 100,
            bottom: height - 130,
          };
          const fit = observationFrame(
            geometry.framePoints,
            geometry.direction,
            width,
            height,
            rect,
            0.55,
            0.048,
          );
          const camera = new THREE.PerspectiveCamera(
            40,
            width / height,
            0.01,
            100,
          );
          camera.position.copy(fit.position);
          camera.lookAt(fit.target);
          camera.updateMatrixWorld(true);
          for (const [index, { id, point }] of geometry.markers.entries()) {
            const projected = point.clone().project(camera);
            const x = ((projected.x + 1) * width) / 2;
            const y = ((1 - projected.y) * height) / 2;
            const context = `${fixtureId}/${station}/${side}/${width}/${id}`;
            assert.ok(
              x > rect.left &&
                x < rect.right &&
                y > rect.top &&
                y < rect.bottom,
              context,
            );
            const ray = new THREE.Raycaster(
              fit.position,
              point.clone().sub(fit.position).normalize(),
            );
            const hit = ray.intersectObject(room, true)[0];
            assert.equal(hit?.object, supports, context);
            assert.equal(
              hit.instanceId,
              [plateIndex, neckIndex, rodIndex][index],
              context,
            );
          }
        }
      }
    }
  }
});
