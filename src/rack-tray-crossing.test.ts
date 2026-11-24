import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  fixtureCrossing,
  crossingObjectIds,
  crossingViewFrame,
  roofEntryPlacement,
  roofPduViewFrame,
  lightingRound,
  selectRoofView,
  selectRoofPduView,
  rackRoof,
} from "./fixture-crossing.ts";
import {
  cableTraySettings,
  trayRungXs,
  rackTrayRelations,
} from "./cable-trays.ts";
import { fixtureById } from "./fixtures.ts";
import { rackById } from "./installation.ts";
import { pdus, powerSettings } from "./power-config.ts";
import { pduInletPosition, pduPosition, powerScene } from "./power-paths.ts";
import { createState } from "./domain.ts";
import { lightTrayCrossings } from "./ceiling-lights.ts";
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

test("柜顶开口切换保留进入时的灯桥与机柜，桥架详情仍返回原柜顶", () => {
  for (const { light, tray } of lightTrayCrossings) {
    const row = cableTraySettings.rows.find((r) => r.fixtureId === tray.id)!;
    for (const id of row.rackIds) {
      const cabinet = fixtureCrossing(tray.id, id);
      assert.ok(cabinet?.kind === "rack-tray");
      const combined = lightingRound(light.id, tray.id, id)!;
      for (const overview of [combined, cabinet]) {
        const first = selectRoofView(overview, 0);
        assert.ok(first?.kind === "roof-entry");
        const second = selectRoofView(first, 1);
        assert.ok(second?.kind === "roof-entry");
        assert.equal(second.upper.id, tray.id);
        assert.equal(second.lower.id, id);
        assert.deepEqual(
          second.points,
          roofEntryPlacement(tray.id, id, 1)?.points,
        );
        assert.equal(selectRoofView(second, null), overview);
        assert.equal(selectRoofView(first, rackRoof.entryXs.length), null);
      }
    }
  }
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

test("八柜的16个开口按平面距离关联同柜 PDU，逻辑出线和原供电示意输入保持一致", () => {
  const visited = new Set<string>();
  for (const row of cableTraySettings.rows) {
    for (const id of row.rackIds) {
      const overview = fixtureCrossing(row.fixtureId, id);
      assert.ok(overview?.kind === "rack-tray");
      assert.equal(selectRoofPduView(overview, true), null);
      for (const index of [0, 1]) {
        const entry = selectRoofView(overview, index);
        assert.ok(entry?.kind === "roof-entry");
        const pair = selectRoofPduView(entry, true);
        assert.ok(pair?.kind === "roof-pdu");
        visited.add(pair.pdu.id);
        assert.equal(pair.pdu.feed, index === 0 ? "A" : "B");
        assert.equal(pair.pdu.rackId, id);
        assert.equal(pair.entry, entry);
        assert.equal(pair.overview, overview);
        assert.equal(selectRoofPduView(pair, false), entry);
        assert.equal(selectRoofView(pair, null), overview);
        assert.equal(selectRoofView(pair, 2), null);
        const next = selectRoofView(pair, 1 - index);
        assert.ok(next?.kind === "roof-pdu" && next.pdu.id !== pair.pdu.id);
        assert.equal(next.entry.index, 1 - index);
        assert.equal(next.overview, overview);
        assert.deepEqual(crossingObjectIds(pair), [
          row.fixtureId,
          id,
          pair.pdu.id,
        ]);
        assert.equal(
          pair.offsets.x.toFixed(3),
          index === 0 ? "-0.065" : "0.065",
        );
        assert.equal(pair.offsets.z.toFixed(3), "-0.115");
        assert.equal(pair.offsets.height.toFixed(4), "0.2625");
        assert.equal(pair.offsets.planar.toFixed(4), "0.1321");
        for (const {
          axis,
          ends: [a, b],
        } of pair.dimensions)
          assert.ok(
            Math.abs(
              a.distanceTo(b) -
                Math.abs(
                  axis === "y" ? pair.offsets.height : pair.offsets[axis],
                ),
            ) < 1e-12,
          );
        assert.deepEqual(pair.inlet.toArray(), pduInletPosition(pair.pdu.id));
        const roomPath = powerScene(createState(), pair.pdu.id);
        assert.deepEqual(
          roomPath?.paths[0].points.at(-1),
          pair.inlet.toArray(),
        );
        assert.ok(pair.pdu.sourcePort.startsWith("QF-"));
      }
    }
  }
  assert.deepEqual([...visited].sort(), pdus.map(({ id }) => id).sort());
});

test("柜后近景的开口标记与 PDU 输入标记可分别命中刷条和 PDU 外廓", () => {
  for (const row of cableTraySettings.rows) {
    for (const id of row.rackIds) {
      const overview = fixtureCrossing(row.fixtureId, id);
      assert.ok(overview?.kind === "rack-tray");
      const roof = createRackRoof();
      roof.position.add(new THREE.Vector3(...rackById(id)!.position));
      roof.updateMatrixWorld(true);
      for (const index of [0, 1]) {
        const entry = selectRoofView(overview, index);
        assert.ok(entry?.kind === "roof-entry");
        const pair = selectRoofPduView(entry, true);
        assert.ok(pair?.kind === "roof-pdu");
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(...powerSettings.layout.size),
        );
        body.name = pair.pdu.id;
        body.position.fromArray(pduPosition(pair.pdu.id));
        body.updateMatrixWorld(true);
        for (const [width, height] of [
          [732, 836],
          [644, 704],
        ]) {
          const rect = {
            left: width * 0.42,
            right: width - 40,
            top: 100,
            bottom: height - 48,
          };
          const fit = roofPduViewFrame(pair, width, height, rect);
          const camera = new THREE.PerspectiveCamera(
            40,
            width / height,
            0.01,
            100,
          );
          camera.position.copy(fit.position);
          camera.lookAt(fit.target);
          camera.updateMatrixWorld(true);
          const targets: (string | undefined)[] = pair.markers.map(
            ({ point }) => {
              const screen = point.clone().project(camera);
              const x = ((screen.x + 1) * width) / 2;
              const y = ((1 - screen.y) * height) / 2;
              assert.ok(
                x > rect.left &&
                  x < rect.right &&
                  y > rect.top &&
                  y < rect.bottom,
              );
              const ray = new THREE.Raycaster(
                camera.position,
                point.clone().sub(camera.position).normalize(),
              );
              return ray.intersectObjects([roof, body])[0]?.object.name;
            },
          );
          assert.deepEqual(targets, ["entry-brush", pair.pdu.id]);
        }
        dispose(body);
      }
      dispose(roof);
    }
  }
});
