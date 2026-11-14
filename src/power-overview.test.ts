import { test } from "node:test";
import assert from "node:assert/strict";
import { powerOverview, powerOverviewIncludes } from "./power-overview.ts";
import { spatialSnapshot } from "./spatial.ts";
import { deviceById } from "./installation.ts";
import { powerLinks } from "./power-config.ts";
import { partsForDevice } from "./catalog.ts";

test("八柜功耗与三维汇总共用有效设备和预算，完整周期不重复A/B计量", () => {
  for (let time = 0; time <= 120; time++) {
    const { readings } = spatialSnapshot(time),
      all = powerOverview(readings);
    assert.equal(all.length, 8);
    assert.equal(
      all.reduce((n, item) => n + item.count, 0),
      84,
    );
    assert.ok(
      Math.abs(
        all.reduce((n, item) => n + (item.value ?? 0), 0) -
          readings.get("room-01")!.power!,
      ) < 1e-6,
    );
    for (const item of all) {
      const reading = readings.get(item.rack.id)!;
      assert.equal(item.coverage, reading.coveragePower);
      assert.ok(Math.abs(item.value! - reading.power!) < 1e-6);
      assert.equal(item.budget!.observed.watts, reading.budget);
      assert.ok(
        item.rows.every(
          (row, i) =>
            !i ||
            deviceById(item.rows[i - 1].id)!.startUnit >=
              deviceById(row.id)!.startUnit,
        ),
      );
    }
  }
});
test("零功耗仍计入预算，无效旧值不计入；整个柜无有效功耗留空", () => {
  const { readings } = spatialSnapshot(60),
    all = powerOverview(readings);
  const zero = all
    .flatMap((item) => item.rows)
    .find((row) => row.id === "srv-63")!;
  assert.equal(zero.value, 0);
  assert.equal(zero.included, true);
  assert.ok(zero.budget! > 0);
  const stale = all
    .flatMap((item) => item.rows)
    .find((row) => row.id === "srv-59")!;
  assert.equal(stale.value, null);
  assert.equal(stale.included, false);
  assert.match(stale.detail, /最后观测/);
  for (const row of all[0].rows) {
    readings.set(row.id, { ...readings.get(row.id)!, quality: "missing" });
  }
  const empty = powerOverview(readings)[0];
  assert.equal(empty.value, null);
  assert.equal(empty.coverage, 0);
  assert.equal(empty.budget!.ratio, null);
});
test("多词与数据分组只过滤名单，不修改八柜统计或U位排序", () => {
  const { readings } = spatialSnapshot(60),
    all = powerOverview(readings);
  for (const filter of ["all", "included", "excluded", "zero"] as const) {
    const filtered = powerOverview(readings, "", filter);
    assert.deepEqual(
      filtered.map((item) => [item.value, item.budget, item.rows]),
      all.map((item) => [item.value, item.budget, item.rows]),
    );
  }
  assert.deepEqual(
    powerOverview(readings, "A01 SRV-01")
      .flatMap((item) => item.matching)
      .map((row) => row.id),
    ["srv-01"],
  );
  assert.equal(
    powerOverview(readings, "不存在").flatMap((item) => item.matching).length,
    0,
  );
  assert.equal(
    powerOverview(readings, "", "zero").flatMap((item) => item.matching).length,
    1,
  );
  assert.equal(
    powerOverview(readings, "", "excluded").flatMap((item) => item.matching)
      .length,
    3,
  );
  const before = powerOverview(spatialSnapshot(44).readings, "", "excluded"),
    after = powerOverview(spatialSnapshot(45).readings, "", "excluded");
  assert.equal(
    after.flatMap((item) => item.matching).length -
      before.flatMap((item) => item.matching).length,
    1,
  );
});
test("功耗对照往返只沿原柜/设备及其供电端点，不把无关网络或冷却对象加入", () => {
  for (const id of ["srv-01", "srv-08", "sw-01", "sto-01"]) {
    assert.ok(powerOverviewIncludes(id, id, id));
    assert.ok(powerOverviewIncludes(id, deviceById(id)!.rackId, id));
    for (const link of powerLinks.filter((link) => link.deviceId === id))
      assert.ok(powerOverviewIncludes(id, link.pduId, id));
    for (const part of partsForDevice(id))
      assert.ok(powerOverviewIncludes(id, part.id, id));
    assert.equal(powerOverviewIncludes(id, "cooling-01", id), false);
    assert.equal(powerOverviewIncludes(id, "srv-55", id), false);
  }
  assert.ok(powerOverviewIncludes("rack-a01", "srv-08", "srv-08"));
  assert.equal(powerOverviewIncludes("rack-a01", "sto-01", "sto-01"), false);
});
