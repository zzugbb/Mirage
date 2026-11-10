import { test } from "node:test";
import assert from "node:assert/strict";
import { coolingRangeRows, coolingRangeIncludes } from "./cooling-range.ts";
import { coolingDeviceIds, coolingSource, coolingSummary } from "./cooling.ts";
import { devices, racks } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { spatialSnapshot } from "./spatial.ts";

test("制冷范围按真实关联分柜与 U 位排序，查找保留八柜及完整汇总", () => {
  const readings = spatialSnapshot(60).readings;
  const all = coolingRangeRows(readings);
  assert.equal(all.length, 8);
  assert.deepEqual(
    new Set(all.flatMap((row) => row.matching.map((d) => d.id))),
    new Set(coolingDeviceIds(coolingSource.id)),
  );
  assert.equal(
    all.reduce((n, r) => n + r.summary.count, 0),
    84,
  );
  for (const row of all) {
    assert.ok(
      row.matching.every(
        (d, i, a) => i === 0 || a[i - 1].startUnit >= d.startUnit,
      ),
    );
    const expected = coolingSummary(coolingDeviceIds(row.rack.id), readings);
    assert.deepEqual(
      { ...row.summary, alarmIds: [...row.summary.alarmIds].sort() },
      { ...expected, alarmIds: [...expected.alarmIds].sort() },
    );
  }
  for (const query of [" STO-01 ", "B03", "服务器", "不可能匹配"]) {
    const filtered = coolingRangeRows(readings, query);
    assert.deepEqual(
      filtered.map((r) => r.summary),
      all.map((r) => r.summary),
    );
    assert.deepEqual(
      filtered.map((r) => r.rack.id),
      racks.map((r) => r.id),
    );
  }
  assert.deepEqual(
    coolingRangeRows(readings, " STO-01 ").flatMap((r) =>
      r.matching.map((d) => d.id),
    ),
    ["sto-01"],
  );
  assert.equal(
    coolingRangeRows(readings, "不可能匹配").flatMap((r) => r.matching).length,
    0,
  );
});

test("无当前进风和告警筛选逐秒跟随共享快照，不改变制冷配置或汇总口径", () => {
  for (let time = 0; time <= 120; time++) {
    const readings = spatialSnapshot(time).readings;
    const all = coolingRangeRows(readings);
    const unavailable = coolingRangeRows(readings, "", "unavailable");
    const alarm = coolingRangeRows(readings, "", "alarm");
    assert.equal(
      unavailable.reduce((n, r) => n + r.matching.length, 0),
      all.reduce((n, r) => n + r.summary.count - r.summary.coverage, 0),
    );
    assert.deepEqual(
      alarm.flatMap((r) => r.matching.map((d) => d.id)).sort(),
      all.flatMap((r) => r.summary.alarmIds).sort(),
    );
    assert.deepEqual(
      unavailable.map((r) => r.summary),
      all.map((r) => r.summary),
    );
  }
});

test("有效零进风与无效旧值分开，过期、离线、缺失和停机不补零", () => {
  const readings = spatialSnapshot(60).readings;
  const id = devices[0].id,
    base = readings.get(id)!;
  for (const quality of ["stale", "offline", "missing"] as const) {
    readings.set(id, { ...base, quality, temperature: 99 });
    assert.ok(
      coolingRangeRows(readings, id, "unavailable").some((r) =>
        r.matching.some((d) => d.id === id),
      ),
    );
  }
  readings.set(id, { ...base, quality: "valid", temperature: 0 });
  assert.equal(
    coolingRangeRows(readings, id, "unavailable").flatMap((r) => r.matching)
      .length,
    0,
  );
  readings.set(id, {
    ...base,
    quality: "valid",
    lifecycle: "stopped",
    temperature: null,
  });
  assert.equal(
    coolingRangeRows(readings, id, "unavailable").flatMap((r) => r.matching)
      .length,
    1,
  );
});

test("检视往返覆盖所查柜的四种机型及子件，换柜或环境点位不沿用旧上下文", () => {
  for (const device of devices) {
    assert.ok(coolingRangeIncludes(device.rackId, device.id, device.id));
    assert.ok(coolingRangeIncludes(device.rackId, device.rackId, device.id));
    assert.ok(coolingRangeIncludes(device.rackId, coolingSource.id, device.id));
    for (const part of [
      ...partsForDevice(device.id),
      ...subpartsForDevice(device.id),
    ])
      assert.ok(coolingRangeIncludes(device.rackId, part.id, device.id));
    const other = devices.find((d) => d.rackId !== device.rackId)!;
    assert.equal(
      coolingRangeIncludes(device.rackId, other.id, device.id),
      false,
    );
    assert.equal(
      coolingRangeIncludes(
        device.rackId,
        partsForDevice(other.id)[0].id,
        other.id,
      ),
      false,
    );
    for (const id of ["room-01", "power-01", "environment-01", "unknown"])
      assert.equal(coolingRangeIncludes(device.rackId, id, device.id), false);
  }
});
