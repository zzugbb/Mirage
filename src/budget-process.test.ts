import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetSnapshot, budgetProcess } from "./budget-process.ts";
import { readingSources } from "./reading-sources.ts";
import { spatialSnapshot } from "./spatial.ts";
import { racks } from "./installation.ts";
import { pdus } from "./power-config.ts";
const scopes = [
  "room-01",
  "power-01",
  ...racks.map((r) => r.id),
  ...pdus.map((p) => p.id),
];
test("各范围历史预算与当前输入核对同口径，A/B范围不重复计量", () => {
  for (const time of [0, 44, 45, 60, 120]) {
    const spatial = spatialSnapshot(time);
    for (const id of scopes) {
      const history = budgetSnapshot(id, time)!.budget,
        current = readingSources(id, "power", spatial.readings)!.budget!;
      assert.deepEqual(history.observed, current.observed);
      assert.deepEqual(history.excluded, current.excluded);
      assert.deepEqual(history.configured, current.configured);
      assert.ok(Math.abs(history.value! - current.value!) < 1e-8);
      assert.ok(Math.abs(history.ratio! - current.ratio!) < 1e-10);
    }
    assert.deepEqual(
      budgetSnapshot("power-01", time)!.budget,
      budgetSnapshot("room-01", time)!.budget,
    );
  }
});
test("口径过程只报告已发生资格变化，普通负载起伏不产生新事件", () => {
  for (const time of [0, 19, 44, 45, 60, 120]) {
    const events = budgetProcess("room-01", time)!;
    assert.deepEqual(
      events.map((e) => e.time),
      time < 45 ? [0] : [0, 45],
    );
    assert.ok(events.every((e) => e.time <= time));
  }
  const changed = budgetProcess("room-01", 60)![1];
  assert.equal(changed.before!.time, 44);
  assert.equal(changed.after.time, 45);
  assert.deepEqual(changed.changed, [
    { id: "srv-59", name: "SRV-59", before: "已计入", after: "已过期" },
  ]);
  assert.equal(
    changed.before!.budget.observed.count - changed.after.budget.observed.count,
    1,
  );
  assert.equal(budgetProcess("rack-a01", 120)!.length, 1);
});
test("过期功耗不补零，停机零值保留预算，非法范围与时间有边界", () => {
  const rows = budgetSnapshot("room-01", 60)!.rows;
  const stale = rows.find((r) => r.id === "srv-59")!,
    zero = rows.find((r) => r.id === "srv-63")!;
  assert.equal(stale.included, false);
  assert.equal(stale.value, null);
  assert.equal(zero.included, true);
  assert.equal(zero.value, 0);
  assert.ok(zero.budget! > 0);
  for (const id of ["srv-01", "cpu-01", "cooling-01", "unknown"])
    assert.equal(budgetProcess(id, 60), null);
  assert.equal(budgetProcess("room-01", NaN)!.length, 1);
  assert.equal(budgetSnapshot("room-01", 999)!.time, 120);
});
