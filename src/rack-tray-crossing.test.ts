import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  fixtureCrossing,
  crossingViewFrame,
  roofEntryPlacement,
  rackRoof,
} from "./fixture-crossing.ts";
import {
  cableTraySettings,
  trayRungXs,
  rackTrayRelations,
} from "./cable-trays.ts";
import { fixtureById } from "./fixtures.ts";
import { rackById } from "./installation.ts";
import { buildCableTray } from "./scene/cable-trays.ts";
import { createRackRoof } from "./scene/rack-enclosure.ts";

const dispose = (root: THREE.Object3D) =>
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material])
        material.dispose();
    }
  });

test("两排八柜双向核对使用同一配置，端点落在实际横档底面与实心顶板", () => {
  let count = 0;
  for (const row of cableTraySettings.rows) {
    const fixture = fixtureById(row.fixtureId)!;
    const tray = new THREE.Group();
    tray.position.fromArray(fixture.position);
    buildCableTray(tray);
    tray.updateMatrixWorld(true);
    const mesh = tray.getObjectByName("tray-ladder") as THREE.InstancedMesh;
    mesh.geometry.computeBoundingBox();
    const matrix = new THREE.Matrix4();
    const rungs = trayRungXs().map((_, i) => {
      mesh.getMatrixAt(i + 6, matrix);
      return mesh.geometry
        .boundingBox!.clone()
        .applyMatrix4(matrix)
        .applyMatrix4(mesh.matrixWorld);
    });
    for (const rackId of row.rackIds) {
      count++;
      const rack = rackById(rackId)!;
      const pair = fixtureCrossing(rackId, fixture.id)!;
      assert.deepEqual(pair, fixtureCrossing(fixture.id, rackId));
      assert.equal(pair.kind, "rack-tray");
      assert.equal(pair.upper.id, fixture.id);
      assert.equal(pair.lower.id, rackId);
      const [upper, lower] = pair.points;
      assert.deepEqual([upper.x, upper.z], [lower.x, lower.z]);
      assert.ok(
        rungs.some(
          (box) =>
            Math.abs(box.min.y - upper.y) < 1e-7 &&
            box.clone().expandByScalar(1e-7).containsPoint(upper),
        ),
      );
      const roof = createRackRoof();
      roof.position.add(new THREE.Vector3(...rack.position));
      roof.updateMatrixWorld(true);
      const slabs = roof.children.filter(
        (object) => object.name === "roof-plate",
      );
      assert.ok(
        slabs.some((object) => {
          const box = new THREE.Box3().setFromObject(object);
          return (
            Math.abs(box.max.y - lower.y) < 1e-7 &&
            box.expandByScalar(1e-7).containsPoint(lower)
          );
        }),
      );
      assert.ok(Math.abs(pair.difference - (upper.y - lower.y)) < 1e-10);
      assert.ok(
        rackTrayRelations(rackId)[0].relation.includes(
          pair.difference.toFixed(2),
        ),
      );
      dispose(roof);
    }
    dispose(tray);
  }
  assert.equal(count, 8);
});

test("柜顶与横档两表面在桌面可用画幅内，上下间距可辨认", () => {
  for (const row of cableTraySettings.rows)
    for (const id of row.rackIds) {
      const pair = fixtureCrossing(id, row.fixtureId)!;
      for (const [width, height] of [
        [852, 836],
        [732, 836],
        [744, 704],
        [644, 704],
      ]) {
        const rect = {
          left: Math.min(314, width * 0.48),
          right: width - 40,
          top: 100,
          bottom: height - 48,
        };
        const fit = crossingViewFrame(pair.points, width, height, rect);
        const camera = new THREE.PerspectiveCamera(
          40,
          width / height,
          0.01,
          100,
        );
        camera.position.copy(fit.position);
        camera.lookAt(fit.target);
        camera.updateMatrixWorld(true);
        const ys = pair.points.map((point) => {
          const projected = point.clone().project(camera);
          const x = ((projected.x + 1) * width) / 2,
            y = ((1 - projected.y) * height) / 2;
          assert.ok(
            x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
          );
          return y;
        });
        assert.ok(Math.abs(ys[0] - ys[1]) > 35);
        assert.ok(fit.position.y > pair.points[1].y);
      }
    }
});

test("未登记柜排、设备和任意设施不会被推断为桥架连接", () => {
  for (const [a, b] of [
    ["rack-a01", "cable-tray-b"],
    ["rack-a08", "cable-tray-a"],
    ["srv-01", "cable-tray-a"],
    ["unknown", "rack-a01"],
    ["rack-a01", "rack-a02"],
  ])
    assert.equal(fixtureCrossing(a, b), null);
});

test("八柜的两处进线口落在各自孔边，投影从同一 X 截面的侧梁外缘量取", () => {
  for (const row of cableTraySettings.rows) {
    const fixture = fixtureById(row.fixtureId)!;
    const tray = new THREE.Group();
    tray.position.fromArray(fixture.position);
    buildCableTray(tray);
    tray.updateMatrixWorld(true);
    const ladder = tray.getObjectByName("tray-ladder") as THREE.InstancedMesh;
    const bounds = new THREE.Box3().setFromBufferAttribute(
      ladder.geometry.getAttribute("position") as THREE.BufferAttribute,
    );
    const railMatrix = new THREE.Matrix4();
    // 首段是 −Z 侧梁，当前样板开口都在该侧。
    ladder.getMatrixAt(0, railMatrix);
    bounds.applyMatrix4(railMatrix).applyMatrix4(ladder.matrixWorld);
    for (const rackId of row.rackIds) {
      const rack = rackById(rackId)!;
      const roof = createRackRoof();
      roof.position.add(new THREE.Vector3(...rack.position));
      roof.updateMatrixWorld(true);
      const entries = roof.children.filter(
        (o) => o.name === "roof-brush-entry",
      );
      for (const [i, entry] of entries.entries()) {
        const q = roofEntryPlacement(row.fixtureId, rackId, i)!;
        const [rail, edge] = q.points;
        const center = entry.getWorldPosition(new THREE.Vector3());
        assert.equal(q.lower.id, rackId);
        assert.equal(q.upper.id, row.fixtureId);
        assert.ok(
          Math.abs(rail.x - center.x) < 1e-8 &&
            Math.abs(edge.x - center.x) < 1e-8,
        );
        assert.ok(
          Math.abs(rail.z - bounds.min.z) < 1e-6 &&
            Math.abs(rail.y - bounds.max.y) < 1e-6,
        );
        assert.ok(Math.abs(edge.z - center.z - rackRoof.entryDepth / 2) < 1e-8);
        assert.equal(edge.y, center.y);
        const size = new THREE.Box3()
          .setFromPoints(q.outline)
          .getSize(new THREE.Vector3());
        assert.ok(
          Math.abs(size.x - rackRoof.entryWidth) < 1e-8 &&
            Math.abs(size.z - rackRoof.entryDepth) < 1e-8,
        );
        assert.ok(Math.abs(q.horizontal - 0.0825) < 1e-8);
      }
      dispose(roof);
    }
    dispose(tray);
  }
  assert.equal(roofEntryPlacement("cable-tray-a", "rack-a07", 0), null);
  assert.equal(roofEntryPlacement("cable-tray-a", "rack-a03", 2), null);
});
