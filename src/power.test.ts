import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  pdus,
  pduById,
  powerLinks,
  powerSettings,
  inletPart,
  powerDeviceIds,
  associatedInputReading,
} from "./power-config.ts";
import { devices, racks, rackForDevice } from "./installation.ts";
import { modelForDevice, partsForDevice } from "./catalog.ts";
import { createState, transition, presentationKey } from "./domain.ts";
import { spatialSnapshot, selectedReading } from "./spatial.ts";
import {
  reviewHistories,
  createReview,
  reviewTransition,
} from "./review-model.ts";
import { findResources } from "./review-resources.ts";
import {
  powerScene,
  pduPosition,
  pduInletPosition,
  pduOutletPosition,
} from "./power-paths.ts";
import { PowerGeometry } from "./scene/power.ts";

test("16个PDU与168个输入有独立身份和唯一端点，四机型均映射到已安装电源", () => {
  assert.equal(pdus.length, 16);
  assert.equal(powerLinks.length, devices.length * 2);
  assert.equal(new Set(pdus.map((pdu) => pdu.id)).size, pdus.length);
  assert.equal(new Set(pdus.map((pdu) => pdu.sourcePort)).size, pdus.length);
  const outlets = new Set<string>(),
    inlets = new Set<string>();
  for (const link of powerLinks) {
    const pdu = pduById(link.pduId)!,
      device = devices.find((device) => device.id === link.deviceId)!;
    assert.ok(pdu && device);
    assert.equal(pdu.rackId, device.rackId);
    assert.equal(pdu.feed, link.inlet);
    assert.ok(link.outlet >= 1 && link.outlet <= powerSettings.outletsPerPdu);
    const outlet = `${pdu.id}/${link.outlet}`,
      inlet = `${device.id}/${link.inlet}`;
    assert.ok(!outlets.has(outlet));
    assert.ok(!inlets.has(inlet));
    outlets.add(outlet);
    inlets.add(inlet);
    assert.equal(
      partsForDevice(device.id).find(
        (part) => part.id === inletPart(device.modelId, link.inlet),
      )?.node,
      "psu",
    );
    const point = pduOutletPosition(pdu.id, link.outlet),
      base = pduPosition(pdu.id);
    assert.ok(Math.abs(point[1] - base[1]) < powerSettings.layout.size[1] / 2);
  }
  for (const device of devices)
    assert.deepEqual(
      powerLinks
        .filter((link) => link.deviceId === device.id)
        .map((link) => link.inlet)
        .sort(),
      ["A", "B"],
    );
  for (const rack of racks)
    assert.equal(pdus.filter((pdu) => pdu.rackId === rack.id).length, 2);
});

test("设施只汇总关联整机，去重A/B且不改变机房功耗，过期/离线/缺失保持覆盖缺口", () => {
  for (const time of [0, 44, 45, 60, 120]) {
    const readings = spatialSnapshot(time).readings;
    const source = associatedInputReading("power-01", readings)!;
    assert.ok(Math.abs(source.power! - readings.get("room-01")!.power!) < 1e-6);
    assert.equal(source.coveragePower, readings.get("room-01")!.coveragePower);
    assert.equal(source.count, 84);
    assert.equal(powerDeviceIds("power-01").length, 84);
    assert.equal(source.temperature, null);
    assert.equal(source.budget, null);
    assert.equal(source.alarm, 0);
    for (const pdu of pdus) {
      const associated = associatedInputReading(pdu.id, readings)!,
        rack = readings.get(pdu.rackId)!;
      assert.ok(Math.abs(associated.power! - rack.power!) < 1e-6);
      assert.equal(associated.coveragePower, rack.coveragePower);
      assert.equal(associated.count, rack.count);
      assert.equal(
        readings.has(pdu.id),
        false,
        "PDU不生成独立测点或重复加入汇总",
      );
      assert.equal(associated.alarmCount, 0);
      assert.match(associated.source, /A\/B 不拆分、不相加/);
    }
    assert.equal(
      selectedReading({ ...createState(), selected: "power-01" }, readings)!
        .power,
      source.power,
    );
  }
  assert.equal(
    associatedInputReading("cooling-01", spatialSnapshot(60).readings),
    null,
  );
});

test("关联输入的有效零值与未知分开，设施趋势没有虚构温度或支路功率", () => {
  const readings = spatialSnapshot(60).readings;
  for (const id of powerDeviceIds("pdu-a01-a"))
    readings.set(id, {
      ...readings.get(id)!,
      power: 0,
      quality: "valid",
      lifecycle: "stopped",
    });
  assert.equal(associatedInputReading("pdu-a01-a", readings)!.power, 0);
  assert.equal(associatedInputReading("pdu-a01-a", readings)!.quality, "valid");
  for (const id of powerDeviceIds("pdu-a01-a"))
    readings.set(id, { ...readings.get(id)!, power: null, quality: "offline" });
  assert.equal(associatedInputReading("pdu-a01-a", readings)!.power, null);
  assert.equal(associatedInputReading("pdu-a01-a", readings)!.coveragePower, 0);
  const history = reviewHistories("pdu-b04-a", "srv-01");
  assert.ok(history.temperature.every((point) => point.value === null));
  for (const time of [0, 44, 45, 60, 120]) {
    const reading = associatedInputReading(
      "pdu-b04-a",
      spatialSnapshot(time).readings,
    )!;
    assert.equal(history.power[time].value, reading.power);
    assert.equal(history.power[time].coverage, reading.coveragePower);
  }
});

test("PDU搜索和定位遵循机柜归属，跨设备定位先归位，保留共享时间", () => {
  assert.equal(findResources(createState(), "QF-16", "all")[0].id, "pdu-b04-b");
  assert.equal(
    findResources(createState(), "", "all").filter((row) => pduById(row.id))
      .length,
    0,
    "机房导航不铺开全部PDU",
  );
  let state = reviewTransition(createReview(), {
    type: "open-resource",
    id: "pdu-b03-a",
  });
  assert.equal(state.scene.level, "rack");
  assert.equal(rackForDevice(state.scene.deviceId).id, "rack-a07");
  assert.equal(state.scene.selected, "pdu-b03-a");
  const rows = findResources(state.scene, "", "all");
  assert.equal(rows.filter((row) => row.kind === "facility").length, 2);
  state = reviewTransition(createReview(), { type: "shot", shot: "assembly" });
  state = reviewTransition(state, { type: "open-resource", id: "pdu-b03-a" });
  assert.equal(state.pendingId, "pdu-b03-a");
  assert.equal(state.scene.level, "rack");
  assert.equal(state.scene.explosion, 0);
  const time = state.scene.time;
  state = reviewTransition(state, {
    type: "navigation-ready",
    key: presentationKey(state.scene),
  });
  assert.equal(state.pendingId, null);
  assert.equal(state.scene.selected, "pdu-b03-a");
  assert.equal(rackForDevice(state.scene.deviceId).id, "rack-a07");
  assert.equal(state.scene.time, time);
});

test("供电场景只显示当前代表接入，路径确定，设备端点随机型明确映射", () => {
  const initial = createState();
  assert.equal(powerScene(initial, "unknown"), null);
  const room = powerScene(initial, "room-01")!;
  assert.equal(room.paths.length, 4);
  assert.equal(room.labels.length, 3);
  for (const pdu of pdus) {
    const feeder = powerScene(initial, pdu.id)!;
    assert.equal(feeder.deviceId, null);
    assert.match(feeder.caption, new RegExp(pdu.sourcePort));
    assert.equal(feeder.paths.length, 1);
    assert.deepEqual(feeder.paths[0].points.at(-1), pduInletPosition(pdu.id));
    assert.deepEqual(
      feeder.labels.map((label) => label.id),
      ["power-source", `power-pdu-${pdu.feed}`],
    );
  }
  const rackState = transition(initial, {
    type: "navigate",
    level: "rack",
    id: "srv-01",
  });
  const mounted = powerScene(rackState, "srv-01")!;
  const extended = powerScene({ ...rackState, trayExtended: true }, "srv-01")!;
  assert.ok(
    Math.abs(
      extended.paths[0].points.at(-1)![2] -
        mounted.paths[0].points.at(-1)![2] -
        0.58,
    ) < 1e-6,
    "抽出后的端点不能留在原安装位置",
  );
  for (const device of devices) {
    const snapshot = powerScene(initial, device.id)!;
    assert.equal(snapshot.deviceId, device.id);
    assert.equal(snapshot.rackId, device.rackId);
    for (const path of snapshot.paths)
      for (const [x, y, z] of path.points)
        assert.ok(Math.abs(x) < 7 && Math.abs(z) < 6 && y > 0 && y < 4.2);
  }
  let state = transition(initial, { type: "locate", id: "sw-01" });
  const detail = powerScene(state, state.deviceId)!;
  assert.equal(detail.paths.length, 0);
  assert.ok(!detail.unconnectedOutlet);
  assert.deepEqual(
    detail.labels.map((label) => label.partId),
    ["net-psu-a", "net-psu-b"],
  );
  assert.equal(powerScene(state, "net-psu-b")!.labels.length, 1);
  assert.equal(
    powerScene(state, "srv-03"),
    null,
    "跨范围预览不在旧模型生成新端点",
  );
  state = transition(state, { type: "seek", time: 100 });
  assert.deepEqual(powerScene(state, state.deviceId), detail);
});

test("配线保留深度且不参与拾取，缓冲复用；设备标记跟随真实部件世界姿态", () => {
  const geometry = new PowerGeometry();
  geometry.update(powerScene(createState(), "room-01"));
  const matrix = geometry.bands.instanceMatrix,
    material = geometry.bands.material;
  assert.ok(geometry.bands.count > 0 && geometry.bands.count < 1024);
  geometry.update(powerScene(createState(), "srv-03"));
  assert.equal(geometry.bands.instanceMatrix, matrix);
  assert.equal(geometry.bands.material, material);
  for (const mesh of [geometry.bands, geometry.dots]) {
    assert.equal(mesh.material.depthTest, true);
    const hits: never[] = [];
    mesh.raycast({} as never, hits);
    assert.deepEqual(hits, []);
  }
  const state = transition(createState(), { type: "locate", id: "srv-01" });
  geometry.update(powerScene(state, state.deviceId));
  const parts = new Map<string, THREE.Group>();
  for (const feed of ["A", "B"] as const) {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.1)));
    parts.set(inletPart(modelForDevice(state.deviceId).id, feed), group);
  }
  geometry.frame(true, parts);
  const before = [...geometry.dots.instanceMatrix.array];
  parts.get("psu-01")!.position.set(1, 2, 3);
  geometry.frame(true, parts);
  assert.notDeepEqual([...geometry.dots.instanceMatrix.array], before);
  geometry.frame(false, parts);
  assert.equal(geometry.root.visible, false);
  geometry.update(null);
  assert.equal(geometry.bands.count, 0);
  assert.equal(geometry.dots.count, 0);
  let disposed = 0;
  for (const resource of [
    geometry.cylinder,
    geometry.sphere,
    geometry.bands.material,
    geometry.dots.material,
  ])
    resource.addEventListener("dispose", () => disposed++);
  geometry.dispose();
  assert.equal(disposed, 4);
  assert.equal(geometry.root.children.length, 0);
});
