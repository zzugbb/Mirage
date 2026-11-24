import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { leakDetection, nearbyCooling } from "./leak-detection.ts";
import { leakFittingChoices, leakFittingShells } from "./leak-fittings.ts";
import { leakInspection, leakViewFrame } from "./leak-view.ts";
import { showLeakFitting } from "./scene/leak-detection.ts";
import { LeakViewGeometry } from "./scene/leak-view.ts";
import { buildRoomShell } from "./scene/room.ts";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9);

test("三处线端引用登记折线端点、邻段轴线和控制器起算里程", () => {
  assert.equal(leakInspection("fitting").fitting?.id, "controller");
  assert.equal(leakInspection("route").fitting, null);
  const { leadPoints, sensingPoints, fittings } = leakDetection;
  for (const [i, { id }] of leakFittingChoices.entries()) {
    const inspection = leakInspection("fitting", { fitting: id, opened: true });
    const fitting = inspection.fitting!;
    const point = [leadPoints[0], sensingPoints[0], sensingPoints.at(-1)!][i];
    const neighbor = [leadPoints[1], sensingPoints[1], sensingPoints.at(-2)!][
      i
    ];
    const axis = new THREE.Vector3()
      .fromArray(neighbor)
      .sub(new THREE.Vector3().fromArray(point))
      .normalize()
      .multiplyScalar(id === "end" ? -1 : 1);
    assert.deepEqual(fitting.point.toArray(), point);
    assert.ok(fitting.axis.equals(axis));
    close(fitting.station, [0, 1.445, 5.795][i]);
    close(fitting.length, fittings[id].length);
    close(fitting.diameter, fittings[id].diameter);
    close(fitting.axis.dot(fitting.radial), 0);
    assert.equal(fitting.leadDiameter, id === "end" ? null : 0.01);
    assert.equal(fitting.sensingDiameter, id === "controller" ? null : 0.014);
    close(
      inspection.guides[0][0].distanceTo(inspection.guides[0][1]),
      fitting.length,
    );
  }
});

test("两档桌面取景分别拾取三处外壳和剖切细节，换段及退出恢复全部前半壳", () => {
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
  box(
    room,
    nearbyCooling.size,
    nearbyCooling.position,
    nearbyCooling.color,
  ).name = nearbyCooling.id;
  room.updateMatrixWorld(true);
  const drawing = new LeakViewGeometry();
  const line = drawing.root.children[0] as THREE.LineSegments;
  const front = (id: keyof typeof leakFittingShells) =>
    room.getObjectByName(`${leakFittingShells[id]}-front`)!;
  const back = (id: keyof typeof leakFittingShells) =>
    room.getObjectByName(`${leakFittingShells[id]}-back`)!;
  for (const [width, height] of [
    [852, 836],
    [644, 704],
  ]) {
    const rect = {
      left: 264,
      right: width - 40,
      top: 100,
      bottom: height - 48,
    };
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 150);
    for (const [i, { id }] of leakFittingChoices.entries()) {
      const reference = [
        "leak-controller-body",
        "leak-lead-segment",
        "leak-sensing-segment",
      ][i];
      const exposed = [
        "leak-lead-segment",
        "leak-sensing-segment",
        "leak-termination-plug",
      ][i];
      for (const opened of [false, true]) {
        const inspection = leakInspection("fitting", { fitting: id, opened });
        showLeakFitting(fixtures, inspection.fitting);
        drawing.update(inspection);
        assert.equal(line.geometry.getAttribute("position").count, 6);
        for (const { id: other } of leakFittingChoices) {
          assert.equal(front(other).visible, !opened || other !== id);
          assert.equal(back(other).visible, true);
        }
        const fit = leakViewFrame(inspection, width, height, rect);
        camera.position.copy(fit.position);
        camera.lookAt(fit.target);
        camera.updateMatrixWorld(true);
        const candidates: THREE.Object3D[] = [];
        room.traverseVisible((object) => {
          if (object instanceof THREE.Mesh) candidates.push(object);
        });
        for (const [j, marker] of inspection.markers.entries()) {
          const p = marker.point.clone().project(camera);
          const x = ((p.x + 1) * width) / 2;
          const y = ((1 - p.y) * height) / 2;
          const label = `${width} ${id} ${opened} ${marker.id}`;
          assert.ok(
            x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
            label,
          );
          const ray = new THREE.Raycaster();
          ray.setFromCamera(new THREE.Vector2(p.x, p.y), camera);
          const hit = ray.intersectObjects(candidates, false)[0];
          assert.equal(
            hit?.object.name,
            j ? reference : opened ? exposed : front(id).name,
            label,
          );
          let owner: THREE.Object3D | null = hit.object;
          while (owner && !owner.userData.entityId) owner = owner.parent;
          assert.equal(owner?.userData.entityId, marker.objectId);
        }
      }
    }
  }
  showLeakFitting(fixtures);
  drawing.update(null);
  assert.equal(drawing.root.visible, false);
  for (const { id } of leakFittingChoices)
    assert.equal(front(id).visible, true);
  drawing.dispose();
});
