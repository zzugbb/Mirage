import assert from "node:assert/strict";
import { test } from "node:test";
import { Box3, Mesh, Raycaster, Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { rackById, racks } from "./installation.ts";
import { mountSettings } from "./pdu-mounts.ts";
import { pdus, powerSettings } from "./power-config.ts";
import { pduInletPosition } from "./power-paths.ts";
import { roofPduSupport } from "./roof-pdu-support.ts";
import { createPduMounts } from "./scene/rack-enclosure.ts";

function near(actual: number, expected: number, tolerance = 1e-8) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} ≠ ${expected}`,
  );
}

test("八柜双侧按输入和各自三处支架的登记标高寻找最近支架", () => {
  assert.equal(pdus.length, racks.length * 2);
  const [rackWidth, , rackDepth] = definition.rack.size;
  for (const pdu of pdus) {
    const support = roofPduSupport(pdu.id);
    assert.ok(support);
    const [x, y, z] = rackById(pdu.rackId)!.position;
    const [localX, localY] = powerSettings.layout.positions[pdu.feed];
    const inlet = pduInletPosition(pdu.id);
    const heights = mountSettings.heightOffsets.map(
      (offset) => y + localY + offset,
    );
    assert.deepEqual(support.inlet.toArray(), inlet);
    assert.equal(support.side, Math.sign(localX));
    assert.equal(support.supportHeight, heights[support.index]);
    near(support.heightDifference, inlet[1] - support.supportHeight);
    assert.ok(
      heights.every(
        (height) =>
          Math.abs(support.heightDifference) <= Math.abs(inlet[1] - height),
      ),
    );

    assert.deepEqual(
      support.markers.map(({ id }) => id),
      ["roof-support-inlet", "roof-support-bracket"],
    );
    assert.equal(support.markers[0].point, support.inlet);
    near(support.markers[1].point.y, support.supportHeight);
    assert.equal(support.dimensions.length, 1);
    const [
      {
        axis,
        ends: [top, bottom],
      },
    ] = support.dimensions;
    assert.equal(axis, "y");
    assert.equal(top.x, bottom.x);
    assert.equal(top.z, bottom.z);
    assert.ok((top.x - x) * support.side > rackWidth / 2);
    assert.ok(top.z < z - rackDepth / 2);
    near(top.y, inlet[1]);
    near(bottom.y, support.supportHeight);
    assert.deepEqual(support.points, [
      ...support.markers.map(({ point }) => point),
      top,
      bottom,
    ]);
  }
});

test("从柜后指向支架标记时命中对应垫块的实际后表面", () => {
  const meshes = createPduMounts();
  for (const pdu of pdus) {
    const support = roofPduSupport(pdu.id)!;
    meshes.position.fromArray(rackById(pdu.rackId)!.position);
    meshes.updateMatrixWorld(true);
    const point = support.markers[1].point;
    const origin = point.clone().add(new Vector3(0, 0, -0.5));
    const hit = new Raycaster(origin, new Vector3(0, 0, 1)).intersectObject(
      meshes,
    )[0];
    assert.ok(hit);
    assert.equal(hit.object.name, `pdu-spacer-${pdu.feed}`);
    const bounds = new Box3().setFromObject(hit.object);
    near(point.z, bounds.min.z);
    near(point.y, bounds.getCenter(new Vector3()).y);
    near(hit.point.distanceTo(point), 0);
  }
  const meshesToDispose = meshes.children.filter(
    (child) => child instanceof Mesh,
  );
  for (const mesh of meshesToDispose) mesh.geometry.dispose();
  const materials = new Set(
    meshesToDispose.flatMap(({ material }) => material),
  );
  for (const material of materials) material.dispose();
});

test("A02 和 B03 样板两侧最近为 3 号支架，无登记 PDU 时不生成核对", () => {
  for (const id of ["pdu-a02-a", "pdu-a02-b", "pdu-b03-a", "pdu-b03-b"]) {
    const support = roofPduSupport(id);
    assert.ok(support);
    assert.equal(support.index, 2);
    near(support.inlet.y, 1.93);
    near(support.supportHeight, 1.79);
    near(support.heightDifference, 0.14);
  }
  assert.equal(roofPduSupport("pdu-unknown"), null);
});
