import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  leakDetection as config,
  configuredPathLength,
  leakRelations,
} from "./leak-detection.ts";
import {
  fixtureById,
  fixtureSightOffsets,
  fixtureMountReference,
} from "./fixtures.ts";
import { ShellCutaway } from "./scene/shell-cutaway.ts";
import { maintenanceAreas } from "./maintenance.ts";
import { buildLeakCable } from "./scene/leak-detection.ts";

test("检漏布置连接控制器、引线与感应线，末端保持明确；邻近设施不冒充监测覆盖", () => {
  const controller = fixtureById(config.controllerId)!;
  const cable = fixtureById(config.cableId)!;
  assert.equal(controller.kind, "leak-controller");
  assert.equal(cable.kind, "leak-cable");
  assert.deepEqual(config.leadPoints.at(-1), config.sensingPoints[0]);
  assert.deepEqual(cable.position, config.sensingPoints[0]);
  const [x, y, z] = config.leadPoints[0];
  assert.ok(
    Math.abs(y - (controller.position[1] - config.controllerSize[1] / 2)) <
      1e-9,
  );
  assert.ok(
    Math.abs(x - controller.position[0]) < config.controllerSize[0] / 2,
  );
  assert.ok(
    Math.abs(z - controller.position[2]) < config.controllerSize[2] / 2,
  );
  assert.ok(Math.abs(configuredPathLength(config.sensingPoints) - 4.35) < 1e-9);
  assert.notDeepEqual(config.sensingPoints[0], config.sensingPoints.at(-1));
  assert.equal(leakRelations(cable.id)[0].id, controller.id);
  assert.equal(leakRelations(controller.id)[0].id, cable.id);
  assert.equal(leakRelations(cable.id)[1].relation, "邻近设施");
  assert.deepEqual(
    new Set(leakRelations(config.nearbyFacilityId).map((f) => f.id)),
    new Set([controller.id, cable.id]),
  );
  for (const f of leakRelations(config.nearbyFacilityId))
    assert.ok(
      leakRelations(f.id).some(
        (back) =>
          back.id === config.nearbyFacilityId && back.relation === "邻近设施",
      ),
    );
  assert.deepEqual(leakRelations("power-01"), []);
  assert.deepEqual(leakRelations("smoke-01"), []);
});

test("引线与感应线位于室内地面以上，不穿过柜体、设施或柜前后预留范围", () => {
  const footprints = [
    ...definition.installation.racks.map((r) => ({
      position: r.position,
      size: definition.rack.size,
    })),
    ...definition.facilities,
  ].map(
    ({ position: [x, , z], size: [w, , d] }) =>
      new THREE.Box2(
        new THREE.Vector2(x - w / 2, z - d / 2),
        new THREE.Vector2(x + w / 2, z + d / 2),
      ),
  );
  for (const rack of definition.installation.racks)
    for (const { bounds: b } of maintenanceAreas(rack.id))
      footprints.push(
        new THREE.Box2(
          new THREE.Vector2(b.minX, b.minZ),
          new THREE.Vector2(b.maxX, b.maxZ),
        ),
      );
  for (const [points, radius] of [
    [config.leadPoints, config.leadRadius],
    [config.sensingPoints, config.sensingRadius],
  ] as const) {
    for (const [i, point] of points.entries()) {
      const [x, y, z] = point;
      assert.ok(point.every(Number.isFinite));
      assert.ok(y - radius >= definition.rendering.floor.surfaceY);
      assert.ok(
        Math.abs(x) + radius <
          definition.room.size[0] / 2 - definition.room.wallThickness / 2,
      );
      assert.ok(
        Math.abs(z) + radius <
          definition.room.size[2] / 2 - definition.room.wallThickness / 2,
      );
      if (!i) continue;
      assert.ok(point.some((v, axis) => v !== points[i - 1][axis]));
      const segment = new THREE.Box2()
        .setFromPoints([
          new THREE.Vector2(x, z),
          new THREE.Vector2(points[i - 1][0], points[i - 1][2]),
        ])
        .expandByScalar(radius);
      for (const footprint of footprints)
        assert.equal(segment.intersectsBox(footprint), false);
    }
  }
});

test("线缆几何沿配置路径生成，接头与封端可拾取，复用设施身份而不制造测点", () => {
  const root = new THREE.Group();
  root.position.fromArray(fixtureById(config.cableId)!.position);
  root.userData.entityId = config.cableId;
  buildLeakCable(root);
  root.updateMatrixWorld(true);
  for (const [name, point] of [
    ["leak-coupling", config.sensingPoints[0]],
    ["leak-termination", config.sensingPoints.at(-1)!],
  ] as const) {
    const mesh = root.getObjectByName(name)!;
    assert.deepEqual(
      mesh.getWorldPosition(new THREE.Vector3()).toArray(),
      point,
    );
    const ray = new THREE.Raycaster(
      new THREE.Vector3().fromArray(point).add(new THREE.Vector3(0, 1, 0)),
      new THREE.Vector3(0, -1, 0),
    );
    const hit = ray.intersectObject(root)[0];
    assert.ok(hit);
    let object: THREE.Object3D | null = hit.object;
    while (object && !object.userData.entityId) object = object.parent;
    assert.equal(object?.userData.entityId, config.cableId);
  }
  const materials = new Set<THREE.Material>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      assert.equal(o.userData.entityId, undefined);
      o.geometry.dispose();
      materials.add(o.material);
    }
  });
  materials.forEach((m) => m.dispose());
});

test("线状设施剖切同时检查远端路径，不只检查标签所在接头", () => {
  const fixture = fixtureById(config.cableId)!;
  const origin = new THREE.Vector3().fromArray(fixture.position);
  const targets = fixtureSightOffsets(fixture.id).map((offset) =>
    new THREE.Vector3().fromArray(offset).add(origin),
  );
  assert.ok(targets.length > config.sensingPoints.length);
  assert.deepEqual(fixtureSightOffsets(config.controllerId), [[0, 0, 0]]);
  assert.equal(fixtureMountReference(config.cableId), config.controllerId);
  assert.equal(fixtureMountReference("environment-01"), "environment-01");
  const camera = new THREE.Vector3(0, 4, 3);
  const remote = new THREE.Vector3().fromArray(config.sensingPoints[2]);
  const obstruction = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.15, 0.15),
    new THREE.MeshStandardMaterial(),
  );
  obstruction.add(mesh);
  obstruction.position.copy(camera).lerp(remote, 0.5);
  const cutaway = new ShellCutaway([obstruction]);
  assert.equal(cutaway.update(camera, [origin], true), 0);
  assert.equal(cutaway.update(camera, targets, true), 1);
  cutaway.enabled = false;
  assert.equal(cutaway.update(camera, targets, true), 0);
  assert.equal(obstruction.visible, true);
  mesh.geometry.dispose();
  mesh.material.dispose();
});
