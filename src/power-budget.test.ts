import { test } from "node:test";
import assert from "node:assert/strict";
import { powerBudget, budgetRatio } from "./power-budget.ts";
import { readingSources, matchingSourceRows } from "./reading-sources.ts";
import { spatialSnapshot } from "./spatial.ts";
import { devices, racks } from "./installation.ts";
import { pdus } from "./power-config.ts";

test("全部回看秒数下，机房与八柜预算分母和三维标尺同口径，配置总额不随质量变化", () => {
  for (const id of ["room-01", ...racks.map((r) => r.id)]) {
    const members = devices.filter((d) => id === "room-01" || d.rackId === id);
    const configured = members.reduce((sum, d) => sum + d.budgetWatts, 0);
    for (let time = 0; time <= 120; time++) {
      const readings = spatialSnapshot(time).readings;
      const sources = readingSources(id, "power", readings)!;
      const budget = sources.budget!;
      const reading = readings.get(id)!;
      assert.equal(budget.configured.watts, configured);
      assert.equal(budget.observed.watts + budget.excluded.watts, configured);
      assert.equal(budget.observed.watts, reading.budget);
      assert.ok(Math.abs(budget.value! - reading.power!) < 1e-8);
      assert.ok(
        Math.abs(budget.ratio! - reading.power! / reading.budget!) < 1e-8,
      );
    }
  }
});

test("过期不使用旧功耗，停机零值仍保留预算，名单筛选不改变预算范围", () => {
  const before = readingSources(
    "room-01",
    "power",
    spatialSnapshot(44).readings,
  )!;
  const after = readingSources(
    "room-01",
    "power",
    spatialSnapshot(45).readings,
  )!;
  const stale = after.rows.find((r) => r.id === "srv-59")!;
  assert.equal(stale.value, null);
  assert.equal(budgetRatio(stale.value, stale.budget), null);
  assert.equal(
    before.budget!.observed.watts - after.budget!.observed.watts,
    stale.budget,
  );
  const zero = after.rows.find((r) => r.id === "srv-63")!;
  assert.equal(zero.included, true);
  assert.equal(budgetRatio(zero.value, zero.budget), 0);
  const saved = structuredClone(after.budget);
  matchingSourceRows(after, { group: "excluded", query: "srv59" });
  matchingSourceRows(after, { group: "included", query: "not-found" });
  assert.deepEqual(after.budget, saved);
  assert.equal(
    readingSources("room-01", "temperature", spatialSnapshot(60).readings)!
      .budget,
    null,
  );
});

test("设施只核对去重关联整机预算，不把双输入算作两台设备或设施额定值", () => {
  const readings = spatialSnapshot(60).readings;
  const room = readingSources("room-01", "power", readings)!.budget;
  assert.deepEqual(readingSources("power-01", "power", readings)!.budget, room);
  for (const pdu of pdus) {
    const rack = readingSources(pdu.rackId, "power", readings)!;
    assert.deepEqual(
      readingSources(pdu.id, "power", readings)!.budget,
      rack.budget,
    );
  }
});

test("没有有效功耗或预算时占比留空，有效零值及超过百分之百不被截断", () => {
  assert.equal(
    powerBudget([{ included: false, value: null, budget: 100 }]).ratio,
    null,
  );
  assert.equal(
    powerBudget([{ included: true, value: 0, budget: 100 }]).ratio,
    0,
  );
  assert.equal(
    powerBudget([{ included: true, value: 120, budget: 100 }]).ratio,
    1.2,
  );
  assert.equal(
    powerBudget([{ included: true, value: 100, budget: null }]).ratio,
    null,
  );
  for (const invalid of [null, NaN, Infinity, 0, -1])
    assert.equal(budgetRatio(10, invalid), null);
  for (const invalid of [null, NaN, Infinity, -1])
    assert.equal(budgetRatio(invalid, 100), null);
});
