import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createState } from "./domain.ts";
import { devices } from "./installation.ts";
import { modelForDevice } from "./catalog.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { rackUnitSpan, RackUnitGuide } from "./scene/rack-unit-guide.ts";

test("八柜所有设备的U位括线覆盖完整安装跨度，抽出与回看不改变原位", () => {
  for (const device of devices) {
    const state = {
      ...createState(),
      level: "rack" as const,
      deviceId: device.id,
      selected: device.id,
    };
    const span = rackUnitSpan(state)!;
    assert.equal(span.first, device.startUnit);
    assert.equal(span.last - span.first + 1, modelForDevice(device.id).units);
    assert.ok(
      Math.abs(
        span.top -
          span.bottom -
          modelForDevice(device.id).units * definition.rack.unitPitch,
      ) < 1e-9,
    );
    assert.deepEqual(
      rackUnitSpan({
        ...state,
        trayExtended: true,
        time: 120,
        rearDoorOpen: true,
      }),
      span,
    );
    assert.equal(rackUnitSpan({ ...state, level: "room" }), null);
    assert.equal(rackUnitSpan({ ...state, level: "device" }), null);
    assert.equal(rackUnitSpan({ ...state, selected: device.rackId }), null);
  }
  assert.equal(
    rackUnitSpan({
      ...createState(),
      level: "rack",
      deviceId: "srv-01",
      selected: "sto-01",
    }),
    null,
  );
});

test("前后视括线随相机换边，侧视保留方向，隐藏期间不生成标签", () => {
  let created = 0;
  const guide = new RackUnitGuide(() => {
    created++;
    return new THREE.Sprite(new THREE.SpriteMaterial());
  });
  const state = {
    ...createState(),
    level: "rack" as const,
    deviceId: "srv-01",
    selected: "srv-01",
  };
  const rack = rackUnitSpan(state)!.rack;
  const camera = new THREE.Vector3(...rack.position).add(
    new THREE.Vector3(0, 1, 4),
  );
  guide.update(state, camera, false);
  assert.equal(guide.userData.span, "U23–24");
  assert.equal(guide.userData.face, "front");
  const before = guide.children[0];
  guide.update({ ...state, time: 49, trayExtended: true }, camera, false);
  assert.equal(guide.children[0], before);
  assert.equal(created, 1);
  camera.z -= 8;
  guide.update(state, camera, false);
  assert.equal(guide.userData.face, "rear");
  assert.equal(created, 2);
  camera.z = rack.position[2];
  guide.update(state, camera, false);
  assert.equal(created, 2);
  guide.update(state, camera, true);
  assert.equal(guide.visible, false);
  guide.update({ ...state, selected: "room-01" }, camera, false);
  assert.equal(guide.visible, false);
  for (const child of guide.children) {
    assert.equal((child as THREE.Sprite).material.depthTest, true);
    assert.deepEqual(new THREE.Raycaster().intersectObject(child), []);
  }
});

test("同一 U 位范围在进柜时放大字标，回到机房时恢复", () => {
  const markers: { detailed: boolean; sprite: THREE.Sprite }[] = [];
  const guide = new RackUnitGuide((label, detailed) => {
    assert.equal(label, "U3–4");
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
    markers.push({ detailed, sprite });
    return sprite;
  });
  const state = { ...createState(), selected: "rack-a01" };
  const range = { rackId: "rack-a01", first: 3, last: 4 };
  const camera = new THREE.Vector3(0, 3, 5);

  guide.update(state, camera, false, range);
  guide.update({ ...state, level: "rack" }, camera, false, range);
  guide.update(state, camera, false, range);

  assert.deepEqual(
    markers.map(({ detailed, sprite }) => [
      detailed,
      sprite.material.depthTest,
    ]),
    [
      [false, true],
      [true, true],
      [false, true],
    ],
  );
  assert.ok(markers[1].sprite.position.x > markers[0].sprite.position.x);
});
