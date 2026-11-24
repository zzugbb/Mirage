import assert from "node:assert/strict";
import { test } from "node:test";
import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Sprite,
  type Object3D,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { environmentRounds } from "./environment-rounds.ts";
import { crossingObjectIds } from "./fixture-crossing.ts";
import {
  probeMountInspection,
  probeMountPlacement,
  probeMountSettings,
  probeMountViewFrame,
} from "./probe-mount.ts";
import { buildRoomShell } from "./scene/room.ts";
import { showProbeMount } from "./scene/probe-mount.ts";

const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-7, `${a} / ${b}`);

test("两处探头底座承接登记墙柱的室内面和原本体后缘", () => {
  for (const { probe } of environmentRounds) {
    const placement = probeMountPlacement(probe.id)!;
    const seated = probeMountInspection(probe.id)!;
    const opened = probeMountInspection(probe.id, true)!;
    assert.deepEqual(crossingObjectIds(seated), [probe.id]);
    close(placement.wallX, -6.91);
    close(placement.bodyBack, -6.8925);
    close(seated.plateThickness, 0.0175);
    close(seated.centerHeight, 1.5);
    close(seated.bodyDepth, 0.065);
    close(seated.bodyTravel, 0);
    close(opened.bodyTravel, 0.09);
    assert.deepEqual(opened.framePoints, seated.framePoints);
    assert.deepEqual(opened.markers.slice(0, 2), seated.markers.slice(0, 2));
    const [wall, back, moved] = opened.rulerEnds;
    close(back.distanceTo(wall), seated.plateThickness);
    close(moved.distanceTo(back), opened.bodyTravel);
    close(moved.x - back.x, 0.09);
  }
  for (const id of ["smoke-01", "cable-tray-b", "room-01", "unknown"])
    assert.equal(probeMountInspection(id), null);
});

test("两档房间取景在两种装配姿态拾取墙柱、固定底座与原格栅，切换后复装", () => {
  const room = new Group();
  room.userData.entityId = "room-01";
  const box = (parent: Object3D, size: number[], position: number[]) => {
    const min = Math.min(...size);
    const mesh = new Mesh(
      min < 0.02
        ? new BoxGeometry(...size)
        : new RoundedBoxGeometry(
            ...(size as [number, number, number]),
            2,
            Math.min(0.006, min * 0.1),
          ),
    );
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  };
  const { fixtures } = buildRoomShell(room, box, box, () => new Sprite());
  const fixed = environmentRounds.map(({ probe }) =>
    fixtures.get(probe.id)!.getObjectByName("probe-mount-plate")!,
  );
  const moved = environmentRounds.map(({ probe }) =>
    fixtures.get(probe.id)!.getObjectByName("probe-mount-body-assembly")!,
  );
  room.updateMatrixWorld(true);
  const restBody = moved.map((mesh) => new Box3().setFromObject(mesh));
  const fixedPositions = fixed.map((mesh) => mesh.position.clone());
  for (const [width, height] of [
    [852, 836],
    [744, 704],
    [644, 704],
  ]) {
    const rect = {
      left: 36,
      right: width - 40,
      top: 100,
      bottom: height - 148,
    };
    const camera = new PerspectiveCamera(40, width / height, 0.01, 150);
    for (const opened of [false, true]) {
      for (const [i, { probe }] of environmentRounds.entries()) {
        const pair = probeMountInspection(probe.id, opened)!;
        const { wallX } = probeMountPlacement(probe.id)!;
        showProbeMount(fixtures, pair);
        room.updateMatrixWorld(true);
        assert.equal(moved[i].position.x, pair.bodyTravel);
        assert.equal(moved[1 - i].position.x, 0);
        assert.deepEqual(
          fixed.map((mesh) => mesh.position),
          fixedPositions,
        );
        const fixedBox = new Box3().setFromObject(fixed[i]);
        close(fixedBox.min.x, wallX);
        close(fixedBox.max.x, restBody[i].min.x);
        close(
          new Box3().setFromObject(moved[i]).min.x - fixedBox.max.x,
          pair.bodyTravel,
        );
        assert.equal(
          moved[i].children.filter((mesh) => mesh.name === "probe-mount-vent")
            .length,
          probeMountSettings.ventCount,
        );
        const fit = probeMountViewFrame(pair, width, height, rect);
        camera.position.copy(fit.position);
        camera.lookAt(fit.target);
        camera.updateMatrixWorld(true);
        for (const [j, marker] of pair.markers.entries()) {
          const point = marker.point.clone().project(camera);
          const x = ((point.x + 1) * width) / 2;
          const y = ((1 - point.y) * height) / 2;
          const label = `${width}/${probe.id}/${opened}/${marker.id}`;
          assert.ok(
            x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
            label,
          );
          const ray = new Raycaster(
            fit.position,
            marker.point.clone().sub(fit.position).normalize(),
          );
          const hit = ray.intersectObject(room, true)[0];
          assert.equal(
            hit?.object.name,
            ["room-left-column", "probe-mount-plate", "probe-mount-vent"][j],
            label,
          );
          let owner: Object3D | null = hit.object;
          while (owner && !owner.userData.entityId) owner = owner.parent;
          assert.equal(owner?.userData.entityId, j ? probe.id : "room-01");
        }
      }
    }
  }
  showProbeMount(fixtures);
  for (const mesh of moved) assert.equal(mesh.position.x, 0);
});
