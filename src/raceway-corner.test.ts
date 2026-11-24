import assert from "node:assert/strict";
import { test } from "node:test";
import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Sprite,
  Vector3,
  type Object3D,
} from "three";
import { crossingObjectIds } from "./fixture-crossing.ts";
import {
  racewayCornerInspection,
  racewayCornerViewFrame,
  racewaySections,
  racewayTrunk,
} from "./panel-raceway.ts";
import { panelSettings } from "./patch-panels.ts";
import { buildRoomShell } from "./scene/room.ts";
import { showRacewayCorner } from "./scene/raceway.ts";

const verticalIds = ["raceway-west", "raceway-east"];
const near = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-7, `${a} / ${b}`);

function room() {
  const root = new Group();
  const box = (parent: Object3D, size: number[], position: number[]) => {
    const mesh = new Mesh(new BoxGeometry(...size), new MeshStandardMaterial());
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  };
  const { fixtures } = buildRoomShell(root, box, box, () => new Sprite());
  root.updateMatrixWorld(true);
  return { root, fixtures };
}

function visible(object: Object3D) {
  for (let node: Object3D | null = object; node; node = node.parent)
    if (!node.visible) return false;
  return true;
}

test("合盖保留三段线槽及压条的原配置外廓，两个竖段内口贯通横槽", () => {
  const { fixtures } = room();
  const trunk = fixtures.get(racewayTrunk.id)!;
  for (const section of racewaySections) {
    const group = fixtures.get(section.id)!;
    const bounds = new Box3().setFromObject(group).getSize(new Vector3());
    assert.ok(group.getObjectByName("raceway-cover-assembly")?.visible);
    near(bounds.x, section.sectionSize[0]);
    near(bounds.y, section.sectionSize[1]);
    near(bounds.z, section.sectionSize[2] + 0.004);
  }
  for (const [index, id] of verticalIds.entries()) {
    const pair = racewayCornerInspection(id)!;
    assert.equal(pair.panel.id, `patch-panel-0${index + 1}`);
    near(pair.openingWidth, 0.082);
    near(pair.clearDepth, 0.038);
    const [from, lip, opposite] = pair.opening;
    near(from.distanceTo(lip), pair.clearDepth);
    near(lip.distanceTo(opposite), pair.openingWidth);
    const drop = fixtures.get(id)!;
    for (const x of [from.x + 0.003, pair.drop.position[0], opposite.x - 0.003])
      for (const z of [from.z + 0.003, lip.z - 0.003]) {
        const start = new Vector3(x, from.y - 0.018, z);
        const ray = new Raycaster(start, new Vector3(0, 1, 0), 0, 0.053);
        assert.equal(ray.intersectObjects([drop, trunk]).length, 0, id);
      }
    const between = new Vector3(
      racewayTrunk.position[0],
      from.y - 0.018,
      (from.z + lip.z) / 2,
    );
    const stop = new Raycaster(between, new Vector3(0, 1, 0), 0, 0.053);
    assert.equal(
      stop.intersectObject(trunk)[0]?.object.name,
      "raceway-lower-wall",
    );
  }
  assert.equal(
    trunk.children.filter((mesh) => mesh.name === "raceway-endcap").length,
    2,
  );
});

test("切换东西转角只揭所查两盖，开合相机不动且分别拾取盖板与内背板", () => {
  const { root, fixtures } = room();
  const covers = () =>
    racewaySections.map(({ id }) => [
      id,
      fixtures.get(id)!.getObjectByName("raceway-cover-assembly")!.visible,
    ]);
  assert.equal(
    racewayCornerInspection(racewayTrunk.id)?.drop.id,
    verticalIds[0],
  );
  assert.equal(racewayCornerInspection("patch-panel-01"), null);
  for (const id of verticalIds) {
    const closed = racewayCornerInspection(id)!;
    const opened = racewayCornerInspection(id, true)!;
    assert.equal(opened.id, closed.id);
    assert.deepEqual(
      crossingObjectIds(opened),
      racewaySections.map(({ id }) => id),
    );
    for (const [width, height] of [
      [852, 836],
      [744, 704],
    ]) {
      const rect = {
        left: 250,
        right: width - 40,
        top: 100,
        bottom: height - 48,
      };
      const fit = racewayCornerViewFrame(opened, width, height, rect);
      assert.deepEqual(
        fit,
        racewayCornerViewFrame(closed, width, height, rect),
      );
      const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
      camera.position.copy(fit.position);
      camera.lookAt(fit.target);
      camera.updateMatrixWorld(true);
      for (const pair of [closed, opened]) {
        showRacewayCorner(fixtures, pair);
        assert.deepEqual(
          covers()
            .filter(([, state]) => !state)
            .map(([id]) => id),
          pair.opened ? [id, racewayTrunk.id] : [],
        );
        const expected = pair.opened ? "raceway-backplate" : "raceway-cover";
        for (const [index, { point }] of pair.markers.entries()) {
          const p = point.clone().project(camera);
          const x = ((p.x + 1) * width) / 2,
            y = ((1 - p.y) * height) / 2;
          assert.ok(
            x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
          );
          const ray = new Raycaster(
            fit.position,
            point.clone().sub(fit.position).normalize(),
          );
          const hit = ray
            .intersectObject(root)
            .find(({ object }) => visible(object));
          assert.equal(hit?.object.name, expected);
          const fixture = pair.opened
            ? hit?.object.parent
            : hit?.object.parent?.parent;
          assert.equal(fixture?.name, index === 0 ? racewayTrunk.id : id);
        }
      }
    }
  }
  showRacewayCorner(fixtures);
  assert.ok(covers().every(([, state]) => state));
});

test("两块箱顶的浅腔与竖槽内口同形，封底保留原面板外廓", () => {
  const { fixtures } = room();
  for (const id of verticalIds) {
    const pair = racewayCornerInspection(id, true, "panel")!;
    assert.equal(pair.joint, "panel");
    assert.deepEqual(
      racewayCornerInspection(pair.panel.id, true, "panel"),
      pair,
    );
    const [rear, front, opposite] = pair.opening;
    near(rear.y, pair.panel.position[1] + panelSettings.size[1] / 2);
    near(pair.openingWidth, 0.082);
    near(pair.clearDepth, 0.038);
    near(pair.recessDepth, 0.016);
    near(rear.distanceTo(front), pair.clearDepth);
    near(front.distanceTo(opposite), pair.openingWidth);
    const panel = fixtures.get(pair.panel.id)!;
    const drop = fixtures.get(id)!;
    const caseSize = new Box3()
      .setFromObject(panel.getObjectByName("panel-case")!)
      .expandByObject(panel.getObjectByName("panel-top-inlet")!)
      .getSize(new Vector3());
    caseSize.toArray().forEach((size, i) => near(size, panelSettings.size[i]));
    for (const x of [rear.x + 0.003, pair.drop.position[0], opposite.x - 0.003])
      for (const z of [rear.z + 0.003, front.z - 0.003]) {
        const ray = new Raycaster(
          new Vector3(x, rear.y + 0.03, z),
          new Vector3(0, -1, 0),
        );
        const hit = ray.intersectObjects([drop, panel])[0];
        assert.equal(hit?.object.name, "panel-case");
        near(hit.point.y, rear.y - pair.recessDepth);
      }
    const edge = new Raycaster(
      rear.clone().add(new Vector3(-0.012, 0.03, 0.023)),
      new Vector3(0, -1, 0),
    );
    const edgeHit = edge.intersectObject(panel)[0];
    assert.equal(edgeHit?.object.name, "panel-top-inlet");
    near(edgeHit.point.y, rear.y);
  }
  assert.equal(racewayCornerInspection(racewayTrunk.id, false, "panel"), null);
});

test("两侧入盒在两档取景均命中箱顶和竖槽，开盖仅影响当前竖段", () => {
  const { root, fixtures } = room();
  const hidden = () =>
    racewaySections
      .filter(
        ({ id }) =>
          !fixtures.get(id)!.getObjectByName("raceway-cover-assembly")!.visible,
      )
      .map(({ id }) => id);
  for (const id of verticalIds) {
    const closed = racewayCornerInspection(id, false, "panel")!;
    const opened = racewayCornerInspection(id, true, "panel")!;
    assert.equal(closed.id, opened.id);
    assert.deepEqual(crossingObjectIds(opened), [
      ...racewaySections.map(({ id }) => id),
      "patch-panel-01",
      "patch-panel-02",
    ]);
    for (const [width, height] of [
      [852, 836],
      [744, 704],
      [644, 704],
    ]) {
      const rect = {
        left: 250,
        right: width - 40,
        top: 100,
        bottom: height - 48,
      };
      const fit = racewayCornerViewFrame(opened, width, height, rect);
      assert.deepEqual(
        fit,
        racewayCornerViewFrame(closed, width, height, rect),
      );
      const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
      camera.position.copy(fit.position);
      camera.lookAt(fit.target);
      camera.updateMatrixWorld(true);
      for (const pair of [closed, opened]) {
        showRacewayCorner(fixtures, pair);
        assert.deepEqual(hidden(), pair.opened ? [id] : []);
        for (const [index, { point }] of pair.markers.entries()) {
          const p = point.clone().project(camera);
          const x = ((p.x + 1) * width) / 2;
          const y = ((1 - p.y) * height) / 2;
          assert.ok(
            x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
          );
          const ray = new Raycaster(
            fit.position,
            point.clone().sub(fit.position).normalize(),
          );
          const hit = ray
            .intersectObject(root)
            .find(({ object }) => visible(object));
          assert.equal(
            hit?.object.name,
            index === 0
              ? "panel-top-inlet"
              : pair.opened
                ? "raceway-backplate"
                : "raceway-cover",
          );
          let peer: Object3D | null | undefined = hit?.object;
          while (peer && !peer.userData.entityId) peer = peer.parent;
          assert.equal(
            peer?.userData.entityId,
            index === 0 ? pair.panel.id : id,
          );
        }
      }
    }
    showRacewayCorner(fixtures, racewayCornerInspection(id, true)!);
    assert.deepEqual(hidden(), [id, racewayTrunk.id]);
    showRacewayCorner(fixtures, opened);
    assert.deepEqual(hidden(), [id]);
  }
  showRacewayCorner(fixtures);
  assert.deepEqual(hidden(), []);
});
