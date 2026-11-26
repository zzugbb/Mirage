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
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, 1);
  const roofAtCut = () => {
    plan.updateMatrixWorld(true);
    ray.ray.origin.set(0, upper.pick.parent!.position.y + 0.6, front.edge + 1);
    const opaque: Mesh[] = [];
    upper.pick.parent!.traverseVisible((object) => {
      if (object instanceof Mesh && !object.material.transparent)
        opaque.push(object);
    });
    return ray.intersectObjects(opaque).length;
  };
  assert.equal(roofAtCut(), 0);

  arrangeFloors!(true);
  assert.ok(!section.visible && front.group.visible);
  assert.equal(upper.pick.scale.z, 1);
  assert.ok(upper.point.y > sectionY && upper.point.z > sectionZ);
  assert.ok(roofAtCut() > 0);

  arrangeFloors!(false);
  assert.ok(section.visible && !front.group.visible);
  assert.equal(upper.point.y, sectionY);
  assert.equal(upper.point.z, sectionZ);
});

test("楼梯两段共用转折平台，二层登记楼梯井在实绘楼板留空", () => {
  const building = campusById("building-a")!;
  const { plan, marks, arrangeFloors } = createCampusGeometry(
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
  const solids: Mesh[] = [];
  upstairs.pick.parent!.traverseVisible((object) => {
    if (object instanceof Mesh && !object.material.transparent)
      solids.push(object);
  });
  const down = new Vector3(0, -1, 0);
  const hitDeck = (x: number) =>
    new Raycaster(
      new Vector3(x, upperTop + 0.02, z),
      down,
      0,
      0.39,
    ).intersectObjects(solids);
  assert.equal(hitDeck(x).length, 0);
  assert.ok(hitDeck(x + 1.5).length);

  const detached = plan.getObjectByName("stair-upper-turn-landing")!;
  assert.equal(detached.parent!.visible, false);
  arrangeFloors!(true);
  plan.updateMatrixWorld(true);
  assert.equal(detached.parent!.visible, true);
  assert.ok(
    Math.abs(
      new Box3().setFromObject(detached).max.y -
        upper.getWorldPosition(new Vector3()).y,
    ) < 1e-6,
  );
  arrangeFloors!(false);
  assert.equal(detached.parent!.visible, false);
});

test("踏步倒角与扶手共用踏步高度，井口护栏及平台护栏落在承托面上", () => {
  for (const id of ["floor-a-01", "floor-a-02"]) {
    const upper = id === "floor-a-02";
    const { plan } = createCampusGeometry(campusById(id)!, campusChildren(id));
    plan.updateMatrixWorld(true);
    const flight = plan.getObjectByName(
      upper ? "stair-upper-flight" : "stair-lower-flight",
    ) as Mesh;
    assert.ok(
      flight.geometry
        .getAttribute("color")
        .array.some((value: number) => value < 1),
    );
    const platform = plan.getObjectByName(
      upper ? "stair-upper-turn-landing" : "stair-turn-landing",
    ) as Mesh;
    assert.ok(platform.parent!.visible);
    const guards: Mesh[] = [platform];
    const supports: Mesh[] = [];
    const handrails: Mesh[] = [];
    plan.traverseVisible((object) => {
      if (!(object instanceof Mesh)) return;
      if (object.name === "stair-shaft-edge") guards.push(object);
      if (object.name === "stair-handrail-base") handrails.push(object);
      if (object.name === "stair-guard-base") supports.push(object);
    });
    const expectBearing = (base: Mesh, surfaces: Mesh[]) => {
      const bounds = new Box3().setFromObject(base);
      const point = bounds.getCenter(new Vector3());
      const ray = new Raycaster(
        new Vector3(point.x, bounds.min.y + 0.03, point.z),
        new Vector3(0, -1, 0),
      );
      assert.ok(
        Math.abs(ray.intersectObjects(surfaces)[0].point.y - bounds.min.y) <
          1e-6,
      );
    };
    assert.equal(handrails.length, 8);
    for (const base of handrails) expectBearing(base, [flight]);
    assert.equal(guards.length, upper ? 5 : 1);
    assert.ok(supports.length >= 5);
    for (const base of supports) expectBearing(base, guards);
  }
});

test("楼层室内地坪共用灰底和分格，门洞接入面顺接走廊与房间", () => {
  for (const id of ["floor-a-01", "floor-a-02"]) {
    const { corridor, areas } = campusFloorPlan(id)!;
    const { plan, marks } = createCampusGeometry(
      campusById(id)!,
      campusChildren(id),
    );
    plan.updateMatrixWorld(true);
    const passage = plan.getObjectByName("floor-corridor")!;
    const passageTop = new Box3().setFromObject(passage).max.y;
    const passageBounds = new Box3().setFromObject(passage);
    const edge = plan.getObjectByName("floor-corridor-wall-edge")!;
    const edgeBounds = new Box3().setFromObject(edge);
    assert.ok(Math.abs(edgeBounds.max.z - passageBounds.min.z) < 1e-6);
    assert.ok(Math.abs(edgeBounds.max.y - passageTop) < 1e-6);
    const threshold = plan.getObjectByName("floor-building-threshold");
    if (threshold) {
      const thresholdBounds = new Box3().setFromObject(threshold);
      assert.ok(Math.abs(thresholdBounds.max.x - passageBounds.min.x) < 1e-6);
    }
    const stair = new Box3().setFromObject(
      plan.getObjectByName("floor-stair-approach")!,
    );
    assert.ok(
      Math.abs(stair.min.z - (corridor.center[1] + corridor.depth / 2)) < 1e-6,
    );
    assert.ok(Math.abs(stair.max.y - passageTop) < 1e-6);
    const finish = marks[0].pick.material;
    assert.ok(finish.map);
    for (const { child, pick, access } of marks) {
      const area = areas.find(({ id }) => id === child.id)!;
      assert.equal(pick.material.color.getHex(), finish.color.getHex());
      assert.equal(pick.material.map, finish.map);
      const ramp = new Box3().setFromObject(access!);
      const floor = new Box3().setFromObject(pick);
      assert.ok(Math.abs(ramp.min.z - stair.min.z) < 1e-6);
      assert.ok(Math.abs(ramp.max.z - floor.min.z) < 1e-6);
      assert.ok(Math.abs(ramp.max.x - ramp.min.x - area.doorway.width) < 1e-6);
      const probe = (z: number) =>
        new Raycaster(
          new Vector3(area.access.x, 1, z),
          new Vector3(0, -1, 0),
        ).intersectObject(access!)[0].point.y;
      assert.ok(Math.abs(probe(ramp.min.z + 0.001) - passageTop) < 1e-4);
      assert.ok(Math.abs(probe(ramp.max.z - 0.001) - floor.max.y) < 1e-4);
      for (const surface of [pick, access!, passage as Mesh, edge as Mesh]) {
        const { position, normal, uv } = surface.geometry.attributes;
        for (let i = 0; i < position.count; i++) {
          if (normal.getY(i) < 0.5) continue;
          const point = surface.localToWorld(
            new Vector3().fromBufferAttribute(position, i),
          );
          assert.ok(Math.abs(uv.getX(i) * 8 - point.x) < 1e-5);
          assert.ok(Math.abs(uv.getY(i) * 8 + point.z) < 1e-5);
        }
      }
      if (child.kind === "room") {
        assert.ok(pick.parent!.getObjectByName("entrance-leaf"));
        assert.ok(pick.parent!.getObjectByName("entrance-head"));
      }
    }
  }
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

test("二层柜体在登记外廓内保留各自的门板、百叶和落地安装脚", () => {
  const floor = campusById("floor-a-02")!;
  const { plan, marks } = createCampusGeometry(floor, campusChildren(floor.id));
  plan.updateMatrixWorld(true);
  const { pick } = marks[0];
  const area = campusFloorPlan(floor.id)!.areas[0];
  const cabinets = pick.parent!.children.filter(
    ({ name }) => name === "floor-power-enclosure",
  );
  const countFeature = (cabinet: (typeof cabinets)[number], name: string) =>
    cabinet.children.filter((part) => part.name === name).length;
  const findCabinets = (kind: string) =>
    cabinets.filter((cabinet) => cabinet.getObjectByName(`floor-${kind}`));
  const floorY = new Box3().setFromObject(pick).max.y;
  for (const row of area.equipment) {
    const count = Math.ceil(row.width / 0.88);
    const pitch = row.width / count;
    const units = findCabinets(row.kind);
    assert.equal(units.length, count);
    for (const [i, cabinet] of units.entries()) {
      const center = cabinet.getWorldPosition(new Vector3());
      const bounds = new Box3().setFromObject(cabinet);
      const x =
        pick.parent!.position.x + row.center[0] + (i - (count - 1) / 2) * pitch;
      assert.ok(Math.abs(center.x - x) < 1e-6);
      assert.ok(Math.abs(bounds.max.x - bounds.min.x - (pitch - 0.07)) < 1e-6);
      assert.ok(Math.abs(bounds.max.y - floorY - row.height) < 1e-6);
      assert.ok(Math.abs(bounds.min.z - (center.z - row.depth / 2)) < 1e-6);
      assert.ok(bounds.max.z <= center.z + row.depth / 2 + 1e-6);
      const feet = cabinet.children.filter(
        ({ name }) => name === "floor-cabinet-foot",
      );
      assert.equal(feet.length, 4);
      for (const foot of feet)
        assert.ok(
          Math.abs(new Box3().setFromObject(foot).min.y - floorY) < 1e-6,
        );

      if (row.kind === "ups") {
        assert.equal(countFeature(cabinet, "floor-ups-display"), 1);
        const vent = cabinet.getObjectByName("floor-cabinet-louvers");
        assert.ok(vent instanceof InstancedMesh && vent.count === 8);
      } else if (row.kind === "battery") {
        assert.equal(countFeature(cabinet, "floor-battery-module"), 4);
        assert.equal(countFeature(cabinet, "floor-cabinet-pull"), 4);
      } else {
        assert.equal(countFeature(cabinet, "floor-switchgear-door"), 3);
        assert.equal(countFeature(cabinet, "floor-switchgear-meter"), 1);
      }
    }
  }
});
