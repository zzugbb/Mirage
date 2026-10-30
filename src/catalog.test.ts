import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { devices, racks } from "./installation.ts";
import {
  equipmentModels,
  modelForDevice,
  partsForDevice,
  subpartsForDevice,
  networkLinks,
  powerDistribution,
} from "./catalog.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import { spatialSnapshot } from "./spatial.ts";
import { simulate } from "./simulation.ts";
import { createState, transition } from "./domain.ts";

test("四种机型的配置条目都对应可选择几何，尺寸由机型定义而非拉伸同一服务器", () => {
  for (const model of equipmentModels) {
    const device = devices.find((device) => device.modelId === model.id)!;
    const expected = [
      ...partsForDevice(device.id),
      ...subpartsForDevice(device.id),
    ].map((part) => part.id);
    const assembly = createEquipmentAssembly(model.id);
    assert.deepEqual(
      [...assembly.groups.keys()].toSorted(),
      expected.toSorted(),
    );
    for (const id of expected) {
      const group = assembly.groups.get(id)!;
      assert.equal(group.userData.entityId, id);
      assert.ok(!new THREE.Box3().setFromObject(group).isEmpty(), id);
    }
    const height = new THREE.Box3()
      .setFromObject(assembly.root)
      .getSize(new THREE.Vector3()).y;
    assert.ok(
      height < model.units * 0.04445 + 0.015,
      `${model.id} 结构高度不能越过安装空间`,
    );
  }
  const one = devices.find((device) => device.modelId === "server-1u")!.id;
  assert.equal(
    subpartsForDevice(one).filter((part) => part.parent === "memory-01").length,
    8,
  );
  assert.equal(
    subpartsForDevice(one).filter((part) => part.parent === "drives-01").length,
    4,
  );
  const storage = devices.find((device) => device.modelId === "storage-2u")!.id;
  assert.equal(
    subpartsForDevice(storage).filter((part) => part.parent === "sto-drives")
      .length,
    24,
  );
  assert.ok(!partsForDevice(storage).some((part) => part.id === "cpu-01"));
  let state = transition(createState(), { type: "locate", id: "sw-01" });
  assert.equal(
    transition(state, { type: "select", id: "dimm-07" }).selected,
    "sw-01",
  );
  assert.equal(
    transition(state, { type: "locate", id: "dimm-07" }).selected,
    "sw-01",
  );
  state = transition(state, { type: "select", id: "net-asic" });
  assert.equal(state.selected, "net-asic");
});

test("混合机柜 U 位不重叠，A/B 接入端口唯一且速率匹配，0U PDU 容量不按 U 位重复占用", () => {
  assert.equal(devices.length, 84);
  assert.equal(
    devices.filter((device) => modelForDevice(device.id).category === "switch")
      .length,
    16,
  );
  assert.equal(powerDistribution.mount, "rear-0u");
  assert.equal(powerDistribution.perRack, 2);
  for (const rack of racks) {
    const occupied = new Set<number>(),
      members = devices.filter((device) => device.rackId === rack.id);
    assert.ok(members.length <= powerDistribution.outletsPerPdu);
    for (const device of members)
      for (let i = 0; i < modelForDevice(device.id).units; i++) {
        const u = device.startUnit + i;
        assert.ok(u >= 1 && u <= 42);
        assert.ok(!occupied.has(u));
        occupied.add(u);
      }
  }
  const endpoints = new Set<string>();
  for (const link of networkLinks) {
    const source = devices.find((device) => device.id === link.source)!,
      target = devices.find((device) => device.id === link.target)!;
    assert.equal(source.rackId, target.rackId);
    assert.equal(modelForDevice(target.id).category, "switch");
    assert.equal(link.speedGbps, 25);
    assert.ok(link.targetPort >= 1 && link.targetPort <= 48);
    for (const endpoint of [
      `${link.source}:${link.sourcePort}`,
      `${link.target}:${link.targetPort}`,
    ]) {
      assert.ok(!endpoints.has(endpoint));
      endpoints.add(endpoint);
    }
  }
  for (const device of devices.filter(
    (device) => modelForDevice(device.id).category !== "switch",
  ))
    assert.equal(
      networkLinks.filter((link) => link.source === device.id).length,
      2,
    );
});

test("不同机型的模块功耗只分配一次，硬盘与托架分开，被动结构为零", () => {
  for (const model of equipmentModels) {
    const device = devices.find((device) => device.modelId === model.id)!,
      snapshot = spatialSnapshot(60, 0, device.id);
    const parents = partsForDevice(device.id),
      total = parents.reduce(
        (sum, part) => sum + (snapshot.readings.get(part.id)!.power ?? 0),
        0,
      );
    assert.ok(
      Math.abs(total - simulate(60, 0, device.id).power) < 0.0001,
      `${model.id} 模块分配不守恒：${total}`,
    );
    for (const part of parents) {
      const children = subpartsForDevice(device.id).filter(
        (child) => child.parent === part.id,
      );
      if (children.length) {
        const power = children.reduce(
          (sum, child) => sum + (snapshot.readings.get(child.id)!.power ?? 0),
          0,
        );
        assert.ok(
          Math.abs(power - (snapshot.readings.get(part.id)!.power ?? 0)) <
            0.0001,
        );
      }
    }
  }
});

test("部件评估使用对应类别阈值，正常工作点不被统一阈值误判为严重", () => {
  const initial = spatialSnapshot(0, 0, "srv-01").readings;
  assert.equal(initial.get("processor-01")!.evaluation, 0);
  assert.equal(
    spatialSnapshot(0, 0, "sw-01").readings.get("net-asic")!.evaluation,
    0,
  );
  assert.equal(
    spatialSnapshot(0, 0, "sto-01").readings.get("sto-controller-a")!
      .evaluation,
    0,
  );
  const hot = spatialSnapshot(60, 0, "srv-01").readings;
  assert.equal(hot.get("dimm-07")!.evaluation, 2);
  assert.equal(hot.get("processor-01")!.evaluation, 1);
  assert.equal(hot.get("processor-01")!.alarm, 0);
});
