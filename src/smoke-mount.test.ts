import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { environmentRounds } from "./environment-rounds.ts";
import { crossingObjectIds } from "./fixture-crossing.ts";
import {
  smokeMount,
  smokeMountInspection,
  smokeMountViewFrame,
} from "./smoke-mount.ts";
import { buildRoomShell } from "./scene/room.ts";
import { showSmokeMount } from "./scene/smoke-mount.ts";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7);

test("两处烟感的就位面和顶标高来自登记位置，移动仅影响本体高度", () => {
  for (const round of environmentRounds) {
    const fitted = smokeMountInspection(round);
    const opened = smokeMountInspection(round, true);
    assert.equal(opened.id, round.points[0].id);
    assert.deepEqual(crossingObjectIds(opened), [opened.id]);
    close(fitted.bodyTop, 3.6775);
    assert.equal(fitted.bodyTop, fitted.seatHeight);
    assert.equal(opened.seatHeight, fitted.seatHeight);
    close(opened.bodyTop, 3.4975);
    close(opened.bodyDrop, 0.18);
    close(opened.ceilingHeight, 4.2);
    assert.deepEqual(opened.framePoints, fitted.framePoints);
    assert.deepEqual(opened.markers.slice(1), fitted.markers.slice(1));
    assert.deepEqual(
      opened.ruler.map(([point]) => point.y),
      [opened.bodyTop, opened.seatHeight, opened.ceilingHeight],
    );
    assert.ok(opened.ceiling.every((p) => p.y === opened.ceilingHeight));
  }
});

test("两种桌面画幅能拾取两排烟感的本体与固定件，切换和退出装回原位", () => {
  const room = new THREE.Group();
  const box = (
    parent: THREE.Object3D,
    size: number[],
    position: number[],
    color: string,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshStandardMaterial({ color }),
    );
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  };
  const { fixtures } = buildRoomShell(room, box, box, () => new THREE.Sprite());
  const meshes: THREE.Mesh[] = [];
  room.traverseVisible((node) => {
    if (node instanceof THREE.Mesh) meshes.push(node);
  });
  const roots = environmentRounds.map((round) =>
    fixtures.get(round.points[0].id)!,
  );
  const parts = roots.map((root) =>
    ["body-assembly", "seat", "stem", "plate"].map((name) =>
      root.getObjectByName(`smoke-mount-${name}`)!,
    ),
  );
  const fixedPositions = parts.map((nodes) =>
    nodes.slice(1).map((part) => part.position.clone()),
  );
  for (const [width, height] of [
    [852, 836],
    [644, 704],
  ]) {
    const rect = {
      left: 36,
      right: width - 40,
      top: 100,
      bottom: height - 140,
    };
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 150);
    for (const opened of [false, true]) {
      for (const [index, round] of environmentRounds.entries()) {
        const pair = smokeMountInspection(round, opened);
        showSmokeMount(fixtures, pair);
        room.updateMatrixWorld(true);
        close(
          parts[index][0].position.y,
          opened ? -smokeMount.inspectionDrop : 0,
        );
        assert.equal(parts[1 - index][0].position.y, 0);
        assert.deepEqual(
          parts[index].slice(1).map((part) => part.position),
          fixedPositions[index],
        );
        const [body, seat, stem, plate] = parts[index];
        const bounds = [body, seat, stem, plate].map((part) =>
          new THREE.Box3().setFromObject(part),
        );
        close(
          new THREE.Box3().setFromObject(
            body.getObjectByName("smoke-mount-body")!,
          ).max.y,
          pair.bodyTop,
        );
        close(bounds[1].min.y, pair.seatHeight);
        close(bounds[1].max.y, bounds[2].min.y);
        close(bounds[2].max.y, bounds[3].min.y);
        close(bounds[3].max.y, pair.ceilingHeight);
        const fit = smokeMountViewFrame(pair, width, height, rect);
        camera.position.copy(fit.position);
        camera.lookAt(fit.target);
        camera.updateMatrixWorld(true);
        for (const [i, marker] of pair.markers.entries()) {
          const p = marker.point.clone().project(camera);
          const x = ((p.x + 1) * width) / 2;
          const y = ((1 - p.y) * height) / 2;
          const label = `${width} ${pair.id} ${opened} ${marker.id}`;
          assert.ok(
            x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
            label,
          );
          const ray = new THREE.Raycaster();
          ray.setFromCamera(new THREE.Vector2(p.x, p.y), camera);
          const hit = ray.intersectObjects(meshes, false)[0];
          assert.equal(
            hit?.object.name,
            ["smoke-mount-body", "smoke-mount-seat", "smoke-mount-plate"][i],
            label,
          );
          let owner: THREE.Object3D | null = hit.object;
          while (owner && !owner.userData.entityId) owner = owner.parent;
          assert.equal(owner?.userData.entityId, pair.id);
          if (!i) close(hit.point.y, pair.bodyTop);
        }
      }
    }
  }
  showSmokeMount(fixtures);
  for (const [body] of parts) assert.equal(body.position.y, 0);
});
