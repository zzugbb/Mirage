import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alarmQueue,
  alarmCurrentStatus,
  alarmVisitIncludes,
} from "./alarm-queue.ts";
import { spatialSnapshot } from "./spatial.ts";
import { devices } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";

test("整个模拟周期的设备队列与机房告警数一致，不重复计算机柜或部件", () => {
  for (let time = 0; time <= 120; time++) {
    const { readings } = spatialSnapshot(time);
    const queue = alarmQueue(readings);
    assert.equal(queue.all.length, readings.get("room-01")!.alarmCount);
    assert.equal(queue.critical + queue.warning, queue.all.length);
    assert.equal(
      new Set(queue.all.map((row) => row.device.id)).size,
      queue.all.length,
    );
    assert.ok(
      queue.all.every((row) =>
        devices.some((device) => device.id === row.device.id),
      ),
    );
    assert.ok(
      queue.all.every(
        (row, i) => !i || queue.all[i - 1].reading.alarm >= row.reading.alarm,
      ),
    );
  }
  const queue = alarmQueue(spatialSnapshot(60).readings);
  assert.deepEqual([queue.critical, queue.warning], [3, 8]);
  assert.equal(alarmQueue(spatialSnapshot(100).readings).all.length, 0);
});

test("告警查找支持柜位与设备的多词交集，严重度筛选不改变全房计数", () => {
  const readings = spatialSnapshot(60).readings;
  const queue = alarmQueue(readings, "a01 srv-01", "critical");
  assert.deepEqual(
    queue.rows.map((row) => row.device.id),
    ["srv-01"],
  );
  assert.equal(queue.all.length, 11);
  assert.equal(alarmQueue(readings, "srv-01", "warning").rows.length, 0);
  assert.equal(alarmQueue(readings, "不存在").rows.length, 0);
  assert.deepEqual(
    alarmQueue(readings, "A01 U24").rows.map((row) => row.device.id),
    ["srv-01"],
  );
  assert.equal(alarmQueue(readings, "U2").rows.length, 0);
  assert.equal(alarmQueue(readings, "U43").rows.length, 0);
  assert.ok(
    alarmQueue(readings, "U23").rows.some((row) => row.device.id === "srv-01"),
  );
  assert.deepEqual(
    alarmQueue(readings).rows,
    alarmQueue(new Map([...readings].reverse())).rows,
  );
});

test("缺失、过期、离线不当作活动告警或恢复，有效零值仍是有效读数", () => {
  const { readings } = spatialSnapshot(60);
  const sample = readings.get("srv-01")!;
  for (const [quality, label] of [
    ["missing", "缺失"],
    ["stale", "过期"],
    ["offline", "离线"],
  ] as const) {
    const reading = { ...sample, quality };
    readings.set("srv-01", reading);
    assert.equal(alarmQueue(readings, "srv-01").rows.length, 0);
    assert.match(alarmCurrentStatus(reading), new RegExp(label));
    assert.match(alarmCurrentStatus(reading), /不能判定/);
  }
  const zero = { ...sample, alarm: 0 as const, temperature: 0, power: 0 };
  readings.set("srv-01", zero);
  assert.equal(alarmCurrentStatus(zero), "当前无活动告警");
  assert.equal(
    alarmCurrentStatus({ ...zero, temperature: null, lifecycle: "stopped" }),
    "设备停机，当前无进风读数",
  );
  assert.match(alarmCurrentStatus({ ...zero, temperature: null }), /不能判定/);
  assert.equal(alarmCurrentStatus(undefined), "读数缺失，不能判定当前告警");
});

test("排查往返仅延续原设备、所属柜及部件，无关对象结束排查", () => {
  const visit = {
    id: "srv-01",
    time: 60,
    severity: 2 as const,
    temperature: 40,
  };
  for (const id of [
    "room-01",
    "rack-a01",
    "srv-01",
    ...partsForDevice("srv-01").map((x) => x.id),
    ...subpartsForDevice("srv-01").map((x) => x.id),
  ])
    assert.ok(alarmVisitIncludes(visit, id, "srv-01"));
  for (const id of ["srv-08", "rack-a02", "cooling-01", "unknown"])
    assert.equal(alarmVisitIncludes(visit, id, "srv-01"), false);
  assert.equal(alarmVisitIncludes(visit, "fan-01", "srv-08"), false);
});
