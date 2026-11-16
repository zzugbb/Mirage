import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fanAssembly,
  fanInspectionContext,
  activeFanInspection,
  fanInspectionNeighbor,
  type FanInspection,
} from "./fan-inspection.ts";
import { devices } from "./installation.ts";
import {
  modelForDevice,
  partsForDevice,
  subpartsForDevice,
} from "./catalog.ts";
import { createState } from "./domain.ts";

test("八柜四机型风扇核对仅使用已定义的模块和子件，不扩充计数或臆测左右排序", () => {
  assert.equal(devices.length, 84);
  for (const device of devices) {
    const assembly = fanAssembly(device.id)!;
    assert.equal(assembly.fans.length, modelForDevice(device.id).fans);
    assert.equal(
      assembly.group,
      partsForDevice(device.id).find((part) => part.node === "fans"),
    );
    assert.deepEqual(
      assembly.fans,
      subpartsForDevice(device.id).filter(
        (part) => part.parent === assembly.group.id,
      ),
    );
    assert.equal(
      new Set(assembly.fans.map((part) => part.id)).size,
      assembly.fans.length,
    );
    for (const selected of [
      device.id,
      assembly.group.id,
      ...assembly.fans.map((fan) => fan.id),
    ])
      assert.equal(fanInspectionContext(device.id, selected), true);
    for (const part of [
      ...partsForDevice(device.id),
      ...subpartsForDevice(device.id),
    ].filter(
      (part) =>
        part.id !== assembly.group.id &&
        !("parent" in part && part.parent === assembly.group.id),
    ))
      assert.equal(fanInspectionContext(device.id, part.id), false);
  }
  for (const id of ["unknown", "rack-a01", "room-01"]) {
    assert.equal(fanAssembly(id), null);
    assert.equal(fanInspectionContext(id, "fan-01"), false);
  }
});

test("风扇核对跨实例、离开设备、复原或选择无关部件失效；展开等待与时间图层不误清除", () => {
  for (const id of ["srv-01", "srv-05", "sw-01", "sto-01"]) {
    const assembly = fanAssembly(id)!;
    const state = {
      ...createState(),
      deviceId: id,
      level: "device" as const,
      explosion: 0.4,
    };
    const visit: FanInspection = {
      deviceId: id,
      mode: "group",
      fanId: assembly.fans[0].id,
      side: "rear",
      pending: false,
    };
    for (const time of [0, 60, 82, 120])
      for (const mode of ["group", "single"] as const) {
        const current = { ...visit, mode };
        assert.equal(
          activeFanInspection(current, { ...state, time }, current.fanId),
          current,
        );
      }
    assert.equal(
      activeFanInspection(visit, { ...state, explosion: 0 }, visit.fanId),
      null,
    );
    const pending = { ...visit, pending: true };
    assert.equal(
      activeFanInspection(pending, { ...state, explosion: 0 }, visit.fanId),
      pending,
    );
    assert.equal(
      activeFanInspection(visit, { ...state, level: "rack" }, visit.fanId),
      null,
    );
    assert.equal(
      activeFanInspection(visit, { ...state, deviceId: "srv-02" }, visit.fanId),
      null,
    );
    assert.equal(activeFanInspection(visit, state, "room-01"), null);
    assert.equal(activeFanInspection(null, state, visit.fanId), null);
  }
});

test("风扇清单键盘按配置顺序移动焦点，首尾不循环，未知按键不改变位置", () => {
  for (const count of [2, 4])
    for (let i = 0; i < count; i++) {
      assert.equal(fanInspectionNeighbor(i, "Home", count), 0);
      assert.equal(fanInspectionNeighbor(i, "End", count), count - 1);
      for (const key of ["ArrowLeft", "ArrowUp"])
        assert.equal(fanInspectionNeighbor(i, key, count), Math.max(0, i - 1));
      for (const key of ["ArrowRight", "ArrowDown"])
        assert.equal(
          fanInspectionNeighbor(i, key, count),
          Math.min(count - 1, i + 1),
        );
      assert.equal(fanInspectionNeighbor(i, "Enter", count), i);
    }
});
