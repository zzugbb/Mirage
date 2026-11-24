import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Sprite,
  type Object3D,
} from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { airflowSnapshot } from "./airflow.ts";
import { crossingObjectIds } from "./fixture-crossing.ts";
import { floorGrilleRows, floorGrilleSettings } from "./floor-grilles.ts";
import {
  grilleIntakeInspection,
  grilleIntakeViewFrame,
} from "./grille-intake.ts";
import { grilleSeatInspection } from "./grille-seat.ts";
import { CrossingGeometry } from "./scene/fixture-crossing.ts";
import { buildRoomShell } from "./scene/room.ts";

const samples = floorGrilleRows.flatMap((row) =>
  Array.from({ length: row.count }, (_, index) =>
    grilleSeatInspection(row.id, index)!,
  ),
);
const inspectionSeats = samples.filter((seat) => seat.branch);
const near = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-9, `${a} / ${b}`);

test("只核对八处代表落点，开口面、进风坐标及安装框分别来自已有配置", () => {
  assert.equal(inspectionSeats.length, 8);
  for (const seat of samples) {
    const pair = grilleIntakeInspection(seat);
    if (!seat.branch) {
      assert.equal(pair, null);
      continue;
    }
    assert.ok(pair);
    const { route } = pair;
    const reference = airflowSnapshot(0, new Map(), seat.branch.device.id)
      .routes[0];
    assert.deepEqual(route, reference);
    assert.equal(route.animated, false);
    assert.equal(route.floorGrille.id, seat.id);
    assert.deepEqual(crossingObjectIds(pair), [
      seat.row.id,
      route.rackId,
      route.deviceId,
    ]);
    assert.deepEqual(pair.opening.toArray(), seat.branch.grille.position);
    assert.deepEqual(
      pair.intake.toArray(),
      route.endpoints.find(({ kind }) => kind === "intake")?.point,
    );
    assert.equal(pair.projected.y, pair.opening.y);
    near(
      pair.faceOutline[0].distanceTo(pair.faceOutline[1]),
      route.faceSize[0],
    );
    near(
      pair.faceOutline[1].distanceTo(pair.faceOutline[2]),
      route.faceSize[1],
    );
    near(pair.offsets.y, pair.heightRuler[0].distanceTo(pair.heightRuler[1]));
    if (["srv-03", "srv-54"].includes(route.deviceId))
      near(pair.offsets.y, 1.200075);
    near(pair.offsets.z, -0.62);
    near(pair.offsets.x, pair.intake.x - pair.opening.x);
    const doorReference = grilleSeatInspection(
      seat.row.id,
      seat.index,
      false,
      "open",
    )!;
    assert.equal(grilleIntakeInspection(doorReference), null);
  }
  assert.equal(
    grilleIntakeInspection({ ...inspectionSeats[0], id: "other" }),
    null,
  );
});

function visible(object: Object3D) {
  for (let node: Object3D | null = object; node; node = node.parent)
    if (!node.visible) return false;
  return true;
}

test("两档近景逐块命中格栅横条或移开后的原位背衬，进风标记命中同柜前面", () => {
  const world = new Group();
  const box = (parent: Object3D, size: number[], position: number[]) => {
    const mesh = new Mesh(new BoxGeometry(...size), new MeshStandardMaterial());
    mesh.position.fromArray(position);
    parent.add(mesh);
    return mesh;
  };
  const { grilles } = buildRoomShell(world, box, box, () => new Sprite());
  const {
    size,
    enclosure: { frontDoor },
  } = definition.rack;
  for (const rack of definition.installation.racks) {
    const group = new Group();
    group.name = rack.id;
    group.position.fromArray(rack.position);
    world.add(group);
    box(group, size, [0, size[1] / 2, 0]);
    const door = new Mesh(
      new PlaneGeometry(frontDoor.width - 0.06, size[1] - 0.21),
      new MeshStandardMaterial(),
    );
    door.name = "柜前门面";
    door.position.set(0, size[1] / 2 + 0.05, frontDoor.hingeZ);
    group.add(door);
  }
  world.updateMatrixWorld(true);
  const drawing = new CrossingGeometry();
  for (const seat of inspectionSeats) {
    const installed = grilleIntakeInspection(seat)!;
    const removed = grilleIntakeInspection(
      grilleSeatInspection(seat.row.id, seat.index, true)!,
    )!;
    assert.deepEqual(removed.offsets, installed.offsets);
    assert.deepEqual(removed.points, installed.points);
    for (const pair of [installed, removed]) {
      grilles.setRemovedFace(pair.seat.removed ? seat.instance : -1);
      for (const [width, height] of [
        [852, 836],
        [744, 704],
      ]) {
        const rect = {
          left: 44,
          right: width - 40,
          top: 100,
          bottom: height - 140,
        };
        const fit = grilleIntakeViewFrame(pair, width, height, rect);
        const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
        camera.position.copy(fit.position);
        camera.lookAt(fit.target);
        camera.updateMatrixWorld(true);
        const hits = pair.markers.map(({ point }) => {
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
          return ray
            .intersectObject(world)
            .find(
              ({ object, instanceId }) =>
                visible(object) &&
                (instanceId === undefined ||
                  object.userData.instanceVisible?.[instanceId] !== false),
            );
        });
        assert.equal(
          hits[0]?.object.name,
          pair.seat.removed ? "grille-backs" : "grille-slats",
        );
        const copies = pair.seat.removed ? 1 : floorGrilleSettings.slatCount;
        assert.equal(Math.floor(hits[0]!.instanceId! / copies), seat.instance);
        assert.equal(hits[1]?.object.name, "柜前门面");
        assert.equal(hits[1]?.object.parent?.name, pair.route.rackId);
      }
      drawing.update(pair);
      assert.ok(drawing.geometry.drawRange.count > 16);
      assert.equal(drawing.lines.material.depthTest, true);
    }
  }
  drawing.dispose();
});
