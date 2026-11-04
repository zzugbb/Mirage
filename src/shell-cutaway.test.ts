import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { fixtureSightOffsets, roomFacilityById } from "./fixtures.ts";
import { boundsFrameDistance } from "./camera.ts";
import { ShellCutaway } from "./scene/shell-cutaway.ts";

const vector = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
function structure(position: number[], size = [2, 2, 2]) {
  const group = new THREE.Group();
  group.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(...(size as [number, number, number])),
      new THREE.MeshStandardMaterial(),
    ),
  );
  group.position.fromArray(position);
  return group;
}

test("建筑剖切仅处理相机和机柜之间登记的结构，不剖切目标后方或侧面的物体", () => {
  const foreground = structure([0, 3, 5]);
  const behind = structure([0, 1, -4]);
  const side = structure([5, 3, 5]);
  const floor = structure([0, -1, 5]);
  const cutaway = new ShellCutaway([foreground, behind, side]);
  assert.equal(cutaway.update(vector(0, 5, 10), [vector(0, 1, 0)], true), 1);
  assert.equal(foreground.visible, false);
  assert.equal(behind.visible, true);
  assert.equal(side.visible, true);
  assert.equal(floor.visible, true);
  assert.equal(cutaway.update(vector(-8, 5, 10), [vector(0, 1, 0)], true), 0);
  assert.equal(foreground.visible, true);
});

test("剖切开关与层级返回恢复完整结构，不改材质和深度", () => {
  const group = structure([0, 3, 5]);
  const mesh = group.children[0] as THREE.Mesh<
    THREE.BoxGeometry,
    THREE.MeshStandardMaterial
  >;
  const material = mesh.material;
  const cutaway = new ShellCutaway([group]);
  const camera = vector(0, 5, 10),
    targets = [vector(0, 1, 0)];
  cutaway.update(camera, targets, true);
  assert.equal(group.visible, false);
  assert.equal(mesh.material, material);
  assert.equal(material.transparent, false);
  assert.equal(material.opacity, 1);
  assert.equal(material.depthTest, true);
  assert.equal(material.depthWrite, true);
  cutaway.enabled = false;
  assert.equal(cutaway.update(camera, targets, true), 0);
  assert.equal(group.visible, true);
  cutaway.enabled = true;
  assert.equal(cutaway.update(camera, targets, true), 1);
  assert.equal(cutaway.update(camera, targets, false), 0);
  assert.equal(group.visible, true);
  assert.equal(cutaway.update(camera, [camera], true), 0);
  assert.equal(cutaway.update(camera, [], true), 0);
});

test("视线贴近结构边缘时保留退出余量，离开遮挡范围后重新出现", () => {
  const group = structure([0, 0, 0]);
  const cutaway = new ShellCutaway([group]);
  const update = (x: number) =>
    cutaway.update(vector(x, 0, 5), [vector(x, 0, -5)], true);
  assert.equal(update(1.05), 0);
  assert.equal(update(0.95), 1);
  assert.equal(update(1.05), 1);
  assert.equal(update(1.3), 0);
  assert.equal(update(1.05), 0);
});

test("所选设施的安装墙面保留，其他遮挡仍剖切；离开选择后恢复自动规则", () => {
  const wall = structure([0, 3, 5]),
    tray = structure([0, 2, 3]);
  const fixture = new THREE.Group();
  const nested = new THREE.Group();
  wall.add(nested);
  nested.add(fixture);
  const cutaway = new ShellCutaway([wall, tray]);
  const camera = vector(0, 5, 10),
    targets = [vector(0, 1, 0)];
  assert.equal(cutaway.update(camera, targets, true, fixture), 1);
  assert.equal(wall.visible, true);
  assert.equal(tray.visible, false);
  assert.equal(cutaway.update(camera, targets, true), 2);
  assert.equal(wall.visible, false);
});

test("同墙另一侧的门扇不能遮挡柜体，真正处于视线内的门扇和墙面仍可剖切", () => {
  const wall = structure([0, 1, -6], [14, 3, 0.16]);
  wall.add(structure([4.2, 0, 0.5], [1.3, 2.5, 1]));
  const cutaway = new ShellCutaway([wall]);
  assert.equal(
    cutaway.update(vector(-5.6, 1.3, -2), [vector(-5.6, 1, -5.2)], true),
    0,
  );
  assert.equal(
    cutaway.update(vector(4.2, 1.3, -2), [vector(4.2, 1, -5.9)], true),
    1,
  );
  assert.equal(
    cutaway.update(vector(-5.6, 1.3, -8), [vector(-5.6, 1, -4.8)], true),
    1,
  );
});

test("两处柜式设施按各自通道定位，宽窄视口的取景视线均避开八个机柜", () => {
  const blockers = definition.installation.racks.map((rack) =>
    new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(...rack.position).add(
        vector(0, definition.rack.size[1] / 2, 0),
      ),
      new THREE.Vector3(...definition.rack.size),
    ),
  );
  for (const f of definition.facilities) {
    const focus = roomFacilityById(f.id)!.focus;
    const center = new THREE.Vector3(...f.position);
    const direction = new THREE.Vector3(...focus.direction).normalize();
    const offsets = fixtureSightOffsets(f.id);
    assert.equal(offsets.length, 9);
    for (const aspect of [852 / 836, 744 / 704, 390 / 580]) {
      const camera = center
        .clone()
        .addScaledVector(
          direction,
          boundsFrameDistance(
            f.size,
            direction.toArray(),
            aspect,
            focus.distance,
          ),
        );
      if (aspect < 1) {
        const lens = new THREE.PerspectiveCamera(40, aspect, 0.01, 150);
        lens.position.copy(camera);
        lens.lookAt(center);
        lens.updateMatrixWorld();
        for (const sx of [-1, 1])
          for (const sz of [-1, 1]) {
            const top = center
              .clone()
              .add(
                vector(
                  (sx * f.size[0]) / 2,
                  f.size[1] / 2,
                  (sz * f.size[2]) / 2,
                ),
              )
              .project(lens);
            assert.ok(
              ((1 - top.y) * 580) / 2 > 118,
              "390px 视口柜顶应位于两行场景工具下方",
            );
          }
      }
      for (const offset of offsets) {
        const target = center.clone().add(new THREE.Vector3(...offset));
        const ray = new THREE.Ray(
          camera,
          target.clone().sub(camera).normalize(),
        );
        for (const box of blockers) {
          const hit = ray.intersectBox(box, new THREE.Vector3());
          assert.ok(
            !hit || camera.distanceTo(hit) > camera.distanceTo(target),
            f.id,
          );
        }
      }
    }
  }
});
