import assert from "node:assert/strict";
import { test } from "node:test";
import { Box3, InstancedMesh, Mesh, Raycaster, Vector3 } from "three";
import {
  campusById,
  campusChildren,
  campusFloorPlan,
} from "./campus-layout.ts";
import { createCampusGeometry } from "./scene/campus-geometry.ts";

test("A 栋半剖保留实际标高，分层复原完整二层楼板与标签位置", () => {
  const building = campusById("building-a")!;
  const { plan, marks, arrangeFloors } = createCampusGeometry(
    building,
    campusChildren(building.id),
  );
  const upper = marks.find(({ child }) => child.id === "floor-a-02")!;
  const front = upper.floorFront!;
  const section = plan.getObjectByName("building-section")!;
  const sectionY = upper.point.y;
  const sectionZ = upper.point.z;
  assert.equal(upper.pick.parent!.position.y, upper.child.origin[1]);
  assert.ok(section.visible && !front.group.visible);
  assert.ok(sectionZ < upper.child.size[2] / 2 && upper.pick.scale.z < 1);

  arrangeFloors!(true);
  assert.ok(!section.visible && front.group.visible);
  assert.equal(upper.pick.scale.z, 1);
  assert.ok(upper.point.y > sectionY && upper.point.z > sectionZ);

  arrangeFloors!(false);
  assert.ok(section.visible && !front.group.visible);
  assert.equal(upper.point.y, sectionY);
  assert.equal(upper.point.z, sectionZ);
});

test("楼梯两段共用转折平台，二层登记楼梯井在实绘楼板留空", () => {
  const building = campusById("building-a")!;
  const { plan, marks } = createCampusGeometry(
    building,
    campusChildren(building.id),
  );
  plan.updateMatrixWorld(true);
  const lower = new Box3().setFromObject(
    plan.getObjectByName("stair-lower-flight")!,
  );
  const landing = plan.getObjectByName("stair-turn-landing")!;
  const landingTop = new Box3().setFromObject(landing).max.y;
  const upper = plan.getObjectByName("stair-upper-flight")!;
  const upperStart = upper.getWorldPosition(new Vector3()).y;
  const upperTop = new Box3().setFromObject(upper).max.y;
  const upstairs = marks.find(({ child }) => child.id === "floor-a-02")!;
  assert.ok(Math.abs(lower.max.y - landingTop) < 1e-6);
  assert.ok(Math.abs(upperStart - landingTop) < 1e-6);
  assert.ok(Math.abs(upperTop - upstairs.child.origin[1] - 0.033) < 1e-6);

  const {
    center: [x, z],
  } = campusFloorPlan(upstairs.child.id)!.stair;
  const decks: Mesh[] = [];
  upstairs.pick.parent!.traverseVisible((object) => {
    if (object instanceof Mesh && object.name === "floor-deck")
      decks.push(object);
  });
  const down = new Vector3(0, -1, 0);
  const hitDeck = (x: number) =>
    new Raycaster(new Vector3(x, upperTop + 1, z), down).intersectObjects(
      decks,
    );
  assert.equal(hitDeck(x).length, 0);
  assert.ok(hitDeck(x + 1.5).length);
});

test("两层导向贴靠实体，运维陈设与供配电桥架避开登记入口", () => {
  for (const id of ["floor-a-01", "floor-a-02"]) {
    const floor = campusById(id)!;
    const { areas, stair } = campusFloorPlan(id)!;
    const { plan, marks, labelObstacles } = createCampusGeometry(
      floor,
      campusChildren(id),
    );
    const sign = plan.getObjectByName("floor-stair-direction")!;
    assert.equal(sign.position.x, stair.center[0]);
    assert.ok(sign.position.z < stair.center[1] - stair.depth / 2);
    assert.ok(labelObstacles.includes(sign as Mesh));
    for (const { child, pick } of marks) {
      const group = pick.parent!;
      const area = areas.find(({ id }) => id === child.id)!;
      const { x, width, z } = area.doorway;
      const plaques = group.children.filter(
        ({ name }) => name === "floor-door-plaque",
      );
      assert.equal(plaques.length, 2);
      assert.ok(plaques[0].position.z < z && plaques[1].position.z > z);
      for (const plaque of plaques) {
        assert.ok(Math.abs(plaque.position.x - x) > width / 2 + 0.74);
        assert.ok(labelObstacles.includes(plaque as Mesh));
      }
      if (child.id === "support-a-01") {
        assert.ok(group.getObjectByName("floor-tool-cabinet"));
        assert.ok(group.getObjectByName("floor-service-cart"));
        const bay = group.getObjectByName("floor-cart-bay")!;
        const cart = area.equipment.find(({ kind }) => kind === "cart")!;
        assert.equal(bay.position.x, cart.center[0]);
        assert.ok(cart.center[0] + cart.width / 2 < x - width / 2);
      }
      if (area.tray) {
        const { center, width: span, height } = area.tray;
        assert.ok(center[0] - span / 2 > x + width / 2);
        assert.ok(plaques.every(({ position }) => position.x < x - width / 2));
        assert.ok(
          group.getObjectByName("floor-tray-rungs") instanceof InstancedMesh,
        );
        const rails = group.children.filter(
          ({ name }) => name === "floor-tray-rail",
        );
        assert.equal(rails.length, 2);
        assert.ok(
          rails.every(
            (rail) =>
              rail.position.y === height &&
              labelObstacles.includes(rail as Mesh),
          ),
        );
        const paint = group.children.filter(
          ({ name }) => name === "floor-cabinet-group-mark",
        );
        assert.deepEqual(
          paint.map(({ position }) => position.x),
          area.equipment.map(({ center }) => center[0]),
        );
      }
    }
  }
});
