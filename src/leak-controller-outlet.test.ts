import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import {
  leakControllerOutlet as settings,
  leakControllerOutletPlacement,
} from "./leak-controller-outlet.ts";
import {
  leakController,
  leakDetection,
  nearbyCooling,
} from "./leak-detection.ts";
import { leakInspection, leakViewFrame } from "./leak-view.ts";
import { buildLeakControllerOutlet } from "./scene/leak-controller-outlet.ts";
import { showLeakFitting } from "./scene/leak-detection.ts";
import { buildRoomShell } from "./scene/room.ts";

const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${a} / ${b}`);
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

test("出口底板和导向环共用登记轴线，真实环隙贯通，内引线独立于支路里程", () => {
  const { origin, inward, innerEnd } = leakControllerOutletPlacement();
  assert.deepEqual(origin.toArray(), leakDetection.leadPoints[0]);
  assert.deepEqual(inward.toArray(), [0, 1, 0]);
  close(innerEnd.distanceTo(origin), settings.innerLeadLength);
  const controller = new THREE.Group();
  controller.position.fromArray(leakController.position);
  buildLeakControllerOutlet(controller, box);
  controller.updateMatrixWorld(true);
  const plate = controller.getObjectByName("leak-controller-outlet-plate")!;
  const guide = controller.getObjectByName("leak-controller-outlet-guide")!;
  const inner = controller.getObjectByName("leak-controller-inner-lead")!;
  const plateBox = new THREE.Box3().setFromObject(plate);
  const guideBox = new THREE.Box3().setFromObject(guide);
  const housing = new THREE.Box3().setFromObject(controller);
  close(plateBox.min.y, origin.y);
  close(plateBox.max.y - plateBox.min.y, settings.bottomThickness);
  close(guideBox.min.y, plateBox.max.y);
  close(guideBox.max.y - guideBox.min.y, settings.guideHeight);
  close(new THREE.Box3().setFromObject(inner).max.y, innerEnd.y);
  const [width, height, depth] = leakDetection.controllerSize;
  close(housing.min.x, controller.position.x - width / 2);
  close(housing.max.x, controller.position.x + 0.057);
  close(housing.max.y - housing.min.y, height);
  close(housing.max.z - housing.min.z, depth);
  const enterAt = (offset: number) =>
    new THREE.Raycaster(
      origin.clone().add(new THREE.Vector3(offset, -0.02, 0)),
      inward,
      0,
      0.06,
    );
  const annulus = (settings.boreDiameter / 2 + leakDetection.leadRadius) / 2;
  assert.equal(
    enterAt(annulus).intersectObjects([plate, guide, inner]).length,
    0,
  );
  assert.equal(
    enterAt(0).intersectObjects([plate, guide, inner])[0]?.object,
    inner,
  );
  assert.equal(
    enterAt(settings.boreDiameter / 2 + 0.001).intersectObject(plate)[0]
      ?.object,
    plate,
  );
  const fromAbove = new THREE.Raycaster(
    innerEnd.clone().add(new THREE.Vector3(0.011, 0.01, 0)),
    inward.clone().negate(),
  );
  assert.equal(
    fromAbove.intersectObjects([plate, guide, inner])[0]?.object,
    guide,
  );
  const route = leakInspection("route", { fromController: 0 });
  assert.equal(route.route?.ends.length, 7);
  close(route.leadLength + route.sensingLength, 5.795);
});

test("两档取景拾取底板、导向环和原引线，只有出口剖切隐藏控制器盖板", () => {
  const room = new THREE.Group();
  const { fixtures } = buildRoomShell(room, box, box, () => new THREE.Sprite());
  box(room, nearbyCooling.size, nearbyCooling.position, nearbyCooling.color);
  const controller = fixtures.get(leakDetection.controllerId)!;
  const cover = controller.getObjectByName("leak-controller-cover")!;
  const front = controller.getObjectByName("leak-controller-sleeve-front")!;
  const back = controller.getObjectByName("leak-controller-sleeve-back")!;
  const fixed = [
    "leak-controller-outlet-plate",
    "leak-controller-outlet-guide",
    "leak-controller-inner-lead",
  ].map((name) => controller.getObjectByName(name)!);
  room.updateMatrixWorld(true);
  const initial = fixed.map((mesh) => mesh.matrixWorld.clone());
  const nearest = (origin: THREE.Vector3, point: THREE.Vector3) => {
    const ray = new THREE.Raycaster(
      origin,
      point.clone().sub(origin).normalize(),
    );
    return ray.intersectObject(room, true).find(({ object }) => {
      for (
        let owner: THREE.Object3D | null = object;
        owner;
        owner = owner.parent
      )
        if (!owner.visible) return false;
      return true;
    });
  };
  const { innerEnd } = leakControllerOutletPlacement();
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
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 150);
    for (const opened of [false, true]) {
      const inspection = leakInspection("fitting", {
        fitting: "controller",
        opened,
        outlet: true,
      });
      showLeakFitting(fixtures, inspection.fitting);
      assert.equal(cover.visible, !opened);
      assert.equal(front.visible, !opened);
      assert.equal(back.visible, true);
      assert.ok(
        fixed.every(
          (mesh, i) => mesh.visible && mesh.matrixWorld.equals(initial[i]),
        ),
      );
      const fit = leakViewFrame(inspection, width, height, rect);
      camera.position.copy(fit.position);
      camera.lookAt(fit.target);
      camera.updateMatrixWorld(true);
      for (const [i, { id, point, objectId }] of inspection.markers.entries()) {
        const p = point.clone().project(camera);
        const x = ((p.x + 1) * width) / 2,
          y = ((1 - p.y) * height) / 2;
        const label = `${width}/${opened}/${id}`;
        assert.ok(
          x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
          label,
        );
        const hit = nearest(fit.position, point);
        assert.equal(
          hit?.object.name,
          (opened
            ? [
                "leak-controller-outlet-guide",
                "leak-controller-outlet-plate",
                "leak-lead-segment",
              ]
            : [
                "leak-controller-body",
                "leak-controller-outlet-plate",
                "leak-controller-sleeve-front",
              ])[i],
          label,
        );
        let owner: THREE.Object3D | null = hit.object;
        while (owner && !owner.userData.entityId) owner = owner.parent;
        assert.equal(owner?.userData.entityId, objectId);
      }
      if (opened)
        assert.equal(
          nearest(fit.position, innerEnd.clone().setY(innerEnd.y - 0.001))
            ?.object,
          fixed[2],
        );
    }
  }
  showLeakFitting(
    fixtures,
    leakInspection("fitting", { fitting: "controller", opened: true }).fitting,
  );
  assert.equal(cover.visible, true);
  assert.equal(front.visible, false);
  showLeakFitting(
    fixtures,
    leakInspection("fitting", { fitting: "joint", opened: true }).fitting,
  );
  assert.equal(cover.visible, true);
  assert.equal(front.visible, true);
  showLeakFitting(fixtures);
  assert.equal(cover.visible, true);
  assert.equal(front.visible, true);
});
