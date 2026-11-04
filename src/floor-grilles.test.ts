import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  floorGrilles,
  floorGrilleSettings as s,
  floorSurfaceY,
  nearestFloorGrille,
} from "./floor-grilles.ts";
import { createFloorGrilles } from "./scene/floor-grilles.ts";
import { createRoomFloor } from "./scene/room-surfaces.ts";
import { airflowSnapshot, airflowSettings } from "./airflow.ts";
import { AirflowGeometry } from "./scene/airflow.ts";
import { spatialSnapshot } from "./spatial.ts";
import { devices, racks } from "./installation.ts";

const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
function instanceBounds(mesh: THREE.InstancedMesh, index: number) {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox!.clone().applyMatrix4(matrix);
}
function dispose(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        materials.add(m);
      if (o instanceof THREE.InstancedMesh) o.dispose();
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => {
    if (m instanceof THREE.MeshStandardMaterial) m.map?.dispose();
    m.dispose();
  });
}

test("34 处格栅与全部设备代表路径共用铺设位置，回看不移动落点", () => {
  assert.equal(floorGrilles.length, 34);
  assert.equal(new Set(floorGrilles.map((g) => g.id)).size, 34);
  assert.equal(nearestFloorGrille("unknown", 0), undefined);
  assert.equal(nearestFloorGrille("row-a", NaN), undefined);
  assert.equal(nearestFloorGrille("row-a", 3.15)?.id, "grille-row-a-16");
  assert.equal(nearestFloorGrille("row-b", -100)?.id, "grille-row-b-01");
  assert.equal(nearestFloorGrille("row-b", 100)?.id, "grille-row-b-17");
  for (const device of devices) {
    let previous: unknown;
    for (const time of [0, 60, 120]) {
      const route = airflowSnapshot(
        time,
        spatialSnapshot(time).readings,
        device.id,
      ).routes[0];
      const grille = floorGrilles.find((g) => g.id === route.floorGrille.id)!;
      const rack = racks.find((r) => r.id === device.rackId)!;
      const row = definition.temperatureSlice.vertical.rows.find((r) =>
        r.rackIds.includes(rack.id),
      )!;
      assert.equal(grille, nearestFloorGrille(row.id, rack.position[0]));
      const floor = route.endpoints.find((e) => e.kind === "floor")!.point;
      assert.deepEqual(floor, [
        grille.position[0],
        airflowSettings.supplyHeight,
        grille.position[2],
      ]);
      if (previous) assert.deepEqual(grille, previous);
      previous = grille;
    }
  }
});

test("地板为每处格栅留出开口，外围保持原高度、边界和连续纹理坐标", () => {
  const [width, , depth] = definition.room.size;
  const floor = createRoomFloor(width, depth);
  floor.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(floor);
  close(bounds.max.y, floorSurfaceY);
  close(bounds.min.y, floorSurfaceY - definition.rendering.floor.thickness);
  close(bounds.min.x, -width / 2);
  close(bounds.max.z, depth / 2);
  for (const grille of floorGrilles) {
    const [x, , z] = grille.position;
    assert.equal(
      new THREE.Raycaster(
        new THREE.Vector3(x, 1, z),
        new THREE.Vector3(0, -1, 0),
      ).intersectObject(floor).length,
      0,
    );
    const hits = new THREE.Raycaster(
      new THREE.Vector3(x + s.width / 2 + 0.01, 1, z),
      new THREE.Vector3(0, -1, 0),
    ).intersectObject(floor);
    assert.ok(hits.length > 0);
    close(hits[0].point.y, floorSurfaceY);
  }
  const position = floor.geometry.getAttribute("position"),
    uv = floor.geometry.getAttribute("uv");
  for (let i = 0; i < position.count; i++) {
    close(uv.getX(i), (position.getX(i) + width / 2) / width);
    close(uv.getY(i), (depth / 2 - position.getZ(i)) / depth);
  }
  dispose(floor);
});

test("格栅面框与横条齐平、浅凹背衬低于横条，间隙不会被地板填死", () => {
  const root = createFloorGrilles();
  assert.equal(root.children.length, 3);
  const frames = root.getObjectByName("grille-frames") as THREE.InstancedMesh;
  const slats = root.getObjectByName("grille-slats") as THREE.InstancedMesh;
  const backs = root.getObjectByName("grille-backs") as THREE.InstancedMesh;
  assert.equal(frames.count, 34 * 4);
  assert.equal(slats.count, 34 * s.slatCount);
  assert.equal(backs.count, 34);
  const floor = createRoomFloor(
    ...([definition.room.size[0], definition.room.size[2]] as [number, number]),
  );
  root.add(floor);
  root.updateMatrixWorld(true);
  for (let index = 0; index < floorGrilles.length; index++) {
    const [x, , z] = floorGrilles[index].position;
    for (let i = 0; i < 4; i++)
      close(instanceBounds(frames, index * 4 + i).max.y, floorSurfaceY);
    const back = instanceBounds(backs, index);
    close(back.min.y, floorSurfaceY - s.recessDepth);
    assert.ok(
      back.min.y > floorSurfaceY - definition.rendering.floor.thickness,
    );
    for (let i = 0; i < s.slatCount; i++) {
      const bounds = instanceBounds(slats, index * s.slatCount + i);
      close(bounds.max.y, floorSurfaceY);
      assert.ok(bounds.min.y > back.max.y);
      close(bounds.min.x, x - s.width / 2 + s.frameWidth);
      close(bounds.max.x, x + s.width / 2 - s.frameWidth);
      if (i > 0)
        assert.ok(
          instanceBounds(slats, index * s.slatCount + i - 1).max.z <
            bounds.min.z,
        );
    }
    const surface = new THREE.Raycaster(
      new THREE.Vector3(x, 1, z),
      new THREE.Vector3(0, -1, 0),
    ).intersectObject(root, true);
    close(surface[0].point.y, floorSurfaceY);
    const gap = new THREE.Raycaster(
      new THREE.Vector3(x, 1, z + s.slatPitch / 2),
      new THREE.Vector3(0, -1, 0),
    ).intersectObject(root, true);
    assert.equal(gap[0].object, backs);
    close(gap[0].point.y, floorSurfaceY - s.recessDepth + s.backingThickness);
  }
  dispose(root);
});

test("格栅轮廓只跟随当前代表支路，无效数据静态灰显且清除时不残留", () => {
  const geometry = new AirflowGeometry(),
    matrix = new THREE.Matrix4(),
    color = new THREE.Color();
  const buffer = geometry.floorFrames.instanceMatrix;
  for (const rack of racks) {
    const snapshot = airflowSnapshot(60, spatialSnapshot(60).readings, rack.id);
    geometry.update(snapshot);
    assert.equal(geometry.floorFrames.count, 4);
    assert.equal(geometry.endpoints.count, 2);
    const grille = snapshot.routes[0].floorGrille;
    const bounds = new THREE.Box3();
    for (let i = 0; i < 4; i++)
      bounds.union(instanceBounds(geometry.floorFrames, i));
    close(bounds.getCenter(new THREE.Vector3()).x, grille.position[0]);
    close(bounds.getCenter(new THREE.Vector3()).z, grille.position[2]);
    close(bounds.min.y, floorSurfaceY + s.outlineLift - s.outlineHeight / 2);
    close(bounds.getSize(new THREE.Vector3()).x, s.width + s.outlineWidth);
    close(bounds.getSize(new THREE.Vector3()).z, s.depth + s.outlineWidth);
    assert.equal(geometry.floorFrames.instanceMatrix, buffer);
  }
  const offline = devices.find((d) => d.telemetry === "offline")!;
  geometry.update(
    airflowSnapshot(60, spatialSnapshot(60).readings, offline.id),
  );
  geometry.floorFrames.getColorAt(0, color);
  const expected = new THREE.Color(airflowSettings.colors.unknown);
  close(color.r, expected.r);
  close(color.g, expected.g);
  close(color.b, expected.b);
  geometry.floorFrames.getMatrixAt(0, matrix);
  geometry.animate(20);
  const after = new THREE.Matrix4();
  geometry.floorFrames.getMatrixAt(0, after);
  assert.deepEqual(after.elements, matrix.elements);
  assert.equal(geometry.floorFrames.material.depthTest, true);
  const hits: unknown[] = [];
  geometry.floorFrames.raycast({} as never, hits as never);
  assert.deepEqual(hits, []);
  geometry.update(null);
  assert.equal(geometry.floorFrames.count, 0);
  assert.equal(geometry.root.visible, false);
  geometry.dispose();
});
