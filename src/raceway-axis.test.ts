import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BoxGeometry,
  Group,
  Mesh,
  Raycaster,
  Sprite,
  Vector3,
  type Object3D,
} from "three";
import { panelEntryPlacement, racewayTrunk } from "./panel-raceway.ts";
import { racewayAxisPosition } from "./raceway-axis.ts";
import { buildRoomShell } from "./scene/room.ts";

const west = "patch-panel-01";
const east = "patch-panel-02";

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} / ${expected}`);
}

test("三段槽轴量自两处箱顶入盒中心与横槽中线", () => {
  const axis = racewayAxisPosition(west, 0);
  const reverse = racewayAxisPosition(east, 0);
  assert.deepEqual(
    axis.segments.map(({ section }) => section.id),
    ["raceway-west", "raceway-horizontal", "raceway-east"],
  );
  near(axis.total, 7.22);
  assert.equal(axis.endpoint, "west");
  assert.equal(reverse.endpoint, "east");
  for (const [i, part] of axis.segments.entries()) {
    near(part.length, [0.83, 5.56, 0.83][i]);
    near(part.startStation, [0, 0.83, 6.39][i]);
    near(part.endStation, [0.83, 6.39, 7.22][i]);
    near(reverse.segments[i].center, axis.total - part.center);
    const { point } = racewayAxisPosition(west, part.center);
    near(point.distanceTo(part.start), part.length / 2);
  }
  for (const { basePanelId, point } of [axis, reverse]) {
    const [a, , b] = panelEntryPlacement(basePanelId)!.opening;
    near(point.distanceTo(a.clone().lerp(b, 0.5)), 0);
  }
  const horizontal = axis.segments[1];
  near(horizontal.start.y, racewayTrunk.position[1]);
  near(horizontal.end.y, racewayTrunk.position[1]);
  near(horizontal.start.z, horizontal.end.z);
});

test("两端量取共享同一轴线及折点，超界里程限制在箱顶端点", () => {
  for (const distance of [0, 0.257, 0.829, 0.83, 3.61, 6.39, 6.391, 7.22]) {
    const forward = racewayAxisPosition(west, distance);
    const backward = racewayAxisPosition(east, 7.22 - distance);
    near(forward.fromWest, distance);
    near(backward.fromEast, 7.22 - distance);
    near(forward.station + backward.station, forward.total);
    near(forward.point.distanceTo(backward.point), 0);
    near(forward.marker.distanceTo(backward.marker), 0);
    assert.equal(forward.section.id, backward.section.id);
    assert.equal(forward.corner, backward.corner);
    if (distance === 0.83 || distance === 6.39) {
      assert.equal(forward.section.id, racewayTrunk.id);
      assert.equal(forward.corner, distance === 0.83 ? "west" : "east");
    }
  }
  assert.equal(racewayAxisPosition(east, -1).endpoint, "east");
  assert.equal(racewayAxisPosition(west, 99).endpoint, "east");
  const invalid = racewayAxisPosition("unknown", NaN);
  assert.equal(invalid.basePanelId, west);
  assert.equal(invalid.station, 0);
});

test("可见投影保留轴线坐标，槽段标记命中真实盖板或压条", () => {
  const room = new Group();
  const box = (parent: Object3D, size: number[], position: number[]) => {
    const mesh = new Mesh(new BoxGeometry(...size));
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  };
  buildRoomShell(room, box, box, () => new Sprite());
  room.updateMatrixWorld(true);
  const towardViewer = new Vector3(0.14, 0.15, 1).normalize();
  for (const distance of [
    0, 0.043, 0.25, 0.829, 0.83, 3.61, 6.39, 6.391, 7.22,
  ]) {
    const axis = racewayAxisPosition(west, distance);
    near(axis.projectedPoint.x, axis.point.x);
    near(axis.projectedPoint.y, axis.point.y);
    assert.ok(
      axis.projected.every((point) => point.z === axis.projectedPoint.z),
    );
    const eye = axis.marker.clone().addScaledVector(towardViewer, 0.85);
    const hit = new Raycaster(
      eye,
      towardViewer.clone().negate(),
    ).intersectObject(room)[0];
    assert.ok(hit, String(distance));
    assert.match(hit.object.name, /^raceway-cover(?:-strap)?$/);
    assert.equal(hit.object.parent?.parent?.name, axis.section.id);
  }
});
