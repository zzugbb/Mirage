import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { powerSettings, pdus } from "./power-config.ts";
import { pduOutletPosition, pduPosition } from "./power-paths.ts";
import {
  createPduMounts,
  createRackRearDoors,
  createRackRoof,
  poseRackRearDoors,
} from "./scene/rack-enclosure.ts";
import { maintenanceAreas } from "./maintenance.ts";

const [width, height, depth] = definition.rack.size;
const bounds = (object: THREE.Object3D) =>
  new THREE.Box3().setFromObject(object);
const near = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-6, `${a} ≠ ${b}`);

test("双扇后门绕外侧铰轴对开，八柜全行程位于检修预留内且避让PDU和后立柱", () => {
  const doors = createRackRearDoors();
  const closed = bounds(doors).clone();
  const hinges = doors.children.map((leaf) =>
    leaf.getWorldPosition(new THREE.Vector3()),
  );
  for (let step = 0; step <= 100; step++) {
    poseRackRearDoors(doors, step / 100);
    doors.updateMatrixWorld(true);
    const leaves = doors.children.map(bounds);
    assert.ok(!leaves[0].intersectsBox(leaves[1]), "两扇门不得互相穿插");
    doors.children.forEach((leaf, i) =>
      assert.deepEqual(leaf.getWorldPosition(new THREE.Vector3()), hinges[i]),
    );
    for (const rack of definition.installation.racks) {
      const world = bounds(doors).translate(
        new THREE.Vector3(...rack.position),
      );
      const rear = maintenanceAreas(rack.id)[1].bounds;
      assert.ok(world.min.x >= rear.minX && world.max.x <= rear.maxX);
      assert.ok(world.min.z >= rear.minZ && world.max.z <= rear.maxZ);
    }
    for (const x of [-width / 2 + 0.025, width / 2 - 0.025]) {
      const post = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(x, height / 2 + 0.05, -depth / 2 + 0.025),
        new THREE.Vector3(0.045, height, 0.045),
      );
      for (const leaf of leaves) assert.equal(leaf.intersectsBox(post), false);
    }
    for (const position of Object.values(powerSettings.layout.positions)) {
      const pdu = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(...position),
        new THREE.Vector3(...powerSettings.layout.size),
      );
      for (const leaf of leaves) assert.equal(leaf.intersectsBox(pdu), false);
    }
  }
  // 开启后中央后视线不再被门网拦住，关闭可精确恢复外廓。
  assert.deepEqual(
    new THREE.Raycaster(
      new THREE.Vector3(0, height / 2, -2),
      new THREE.Vector3(0, 0, 1),
    ).intersectObject(doors, true),
    [],
  );
  for (let i = 0; i < 20; i++) {
    poseRackRearDoors(doors, 1);
    poseRackRearDoors(doors, 0);
  }
  assert.deepEqual(bounds(doors), closed);
});

test("双扇后门留出接缝并位于PDU后方，冲孔面保留深度、阴影和远景过滤", () => {
  const doors = createRackRearDoors();
  doors.updateMatrixWorld(true);
  const left = bounds(doors.children[0]),
    right = bounds(doors.children[1]);
  assert.ok(left.max.x < right.min.x, "中央接缝不能重叠");
  assert.ok(left.min.x > -width / 2 && right.max.x < width / 2);
  assert.ok(left.min.y > 0.1 && left.max.y < height);
  assert.ok(left.max.z < -depth / 2);
  assert.ok(
    left.max.z <
      powerSettings.layout.positions.A[2] - powerSettings.layout.size[2] / 2,
  );
  let panels = 0;
  doors.traverse((object) => {
    assert.equal(object.userData.entityId, undefined, "不增加独立资源或测点");
    if (object.name !== "rear-perforated-panel") return;
    panels++;
    const mesh = object as THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.MeshStandardMaterial
    >;
    const texture = mesh.material.alphaMap as THREE.DataTexture;
    assert.ok(
      texture.image.data.some((value, i) => i % 4 === 1 && value === 0),
    );
    assert.ok(
      texture.image.data.some((value, i) => i % 4 === 1 && value === 255),
    );
    assert.equal(texture.minFilter, THREE.LinearMipmapLinearFilter);
    assert.equal(texture.generateMipmaps, true);
    assert.equal(mesh.material.depthTest, true);
    assert.equal(mesh.material.depthWrite, true);
    assert.equal(mesh.material.transparent, false);
    assert.equal(mesh.castShadow, true);
  });
  assert.equal(panels, 2);
});

test("顶板进线口真正留空，刷条在孔内且不堵中央缝，U42与顶板保留净空", () => {
  const roof = createRackRoof();
  roof.updateMatrixWorld(true);
  const s = definition.rack.enclosure.roof;
  const down = new THREE.Vector3(0, -1, 0);
  const ray = (x: number, z: number) =>
    new THREE.Raycaster(
      new THREE.Vector3(x, height + 1, z),
      down,
    ).intersectObject(roof, true);
  for (const x of s.entryXs) {
    assert.deepEqual(ray(x, s.entryZ), [], "刷条中缝下方不能保留旧的实心顶板");
    const hits = ray(x + s.entryWidth / 4, s.entryZ);
    assert.ok(hits.length > 0);
    assert.ok(hits.every((hit) => hit.object.name === "entry-brush"));
    assert.ok(
      ray(x, s.entryZ + s.entryDepth).some(
        (hit) => hit.object.name === "roof-plate",
      ),
    );
  }
  const topUnit =
    definition.rack.unitOrigin +
    (definition.rack.units + 0.5) * definition.rack.unitPitch;
  assert.ok(topUnit < bounds(roof).min.y);
  assert.ok(bounds(roof).min.x >= -width / 2 - 1e-6);
  assert.ok(bounds(roof).max.x <= width / 2 + 1e-6);
});

test("PDU位于侧板内侧，支架连接PDU与侧壁且避让插座；全16台端点沿用安装位置", () => {
  const mounts = createPduMounts();
  const { size, positions } = powerSettings.layout;
  const wallInner = width / 2 - 0.025 / 2;
  for (const feed of ["A", "B"] as const) {
    const [x, y, z] = positions[feed];
    assert.ok(Math.abs(x) + size[0] / 2 < wallInner, "PDU不得穿入侧板");
    assert.ok(Math.abs(x) - size[0] / 2 > 0.4826 / 2, "保留设备外壳横向空间");
    const side = Math.sign(x);
    const spacers = mounts.children.filter(
      (child) => child.name === `pdu-spacer-${feed}`,
    );
    assert.equal(spacers.length, 3);
    for (const spacer of spacers) {
      const b = bounds(spacer);
      near(side < 0 ? -b.min.x : b.max.x, wallInner);
      near(side < 0 ? -b.max.x : b.min.x, Math.abs(x) + size[0] / 2);
      assert.ok(b.min.y > y - size[1] / 2 && b.max.y < y + size[1] / 2);
      assert.ok(b.min.z > z + powerSettings.layout.outletOffsetZ);
    }
    for (const mount of mounts.children.filter(
      (child) => child.name === `pdu-mount-${feed}`,
    ))
      near(bounds(mount).min.z, z + size[2] / 2);
  }
  for (const pdu of pdus) {
    const base = pduPosition(pdu.id);
    for (let n = 1; n <= powerSettings.outletsPerPdu; n++) {
      const point = pduOutletPosition(pdu.id, n);
      near(point[0], base[0]);
      assert.ok(Math.abs(point[1] - base[1]) < size[1] / 2);
      near(point[2] - base[2], powerSettings.layout.outletOffsetZ);
    }
  }
});
