import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetReference } from "./budget-reference.ts";
import { spatialSnapshot } from "./spatial.ts";
import { readingSources } from "./reading-sources.ts";
import { reviewHistories } from "./review-model.ts";
import { pdus, powerSettings } from "./power-config.ts";
import { racks, deviceById } from "./installation.ts";

test("预算历史与八柜、机房和供电设施输入核对共用每秒有效集合", () => {
  for (let time = 0; time <= 120; time++) {
    const { readings } = spatialSnapshot(time);
    for (const id of [
      "room-01",
      ...racks.map((rack) => rack.id),
      powerSettings.sourceId,
      ...pdus.map((pdu) => pdu.id),
    ]) {
      const budget = readingSources(id, "power", readings)!.budget!;
      assert.equal(
        budgetReference(id, readings),
        budget.ratio === null ? null : budget.observed.watts,
      );
    }
  }
});
test("有效零值保留预算，过期旧值断线，部件与冷却无预算参照", () => {
  const { readings } = spatialSnapshot(60);
  assert.equal(
    budgetReference("srv-63", readings),
    deviceById("srv-63")!.budgetWatts,
  );
  for (const id of ["srv-59", "srv-25", "srv-56"])
    assert.equal(budgetReference(id, readings), null);
  for (const id of ["fan-01", "cooling-01", "unknown"])
    assert.equal(budgetReference(id, readings), undefined);
  const history = reviewHistories("srv-59", "srv-59");
  assert.ok(history.power[44].budget! > 0);
  assert.equal(history.power[45].budget, null);
  assert.equal(history.power[45].value, null);
  assert.equal(history.temperature[44].budget, undefined);
});
test("同一范围覆盖变化同步改变预算，未知功耗不伪装为预算零", () => {
  const history = reviewHistories("rack-a08", "srv-01").power;
  assert.equal(
    history[44].budget! - history[45].budget!,
    deviceById("srv-59")!.budgetWatts,
  );
  assert.equal(history[44].coverage - history[45].coverage, 1);
  const { readings } = spatialSnapshot(60);
  for (const [id, reading] of readings)
    if (deviceById(id)?.rackId === "rack-a01")
      readings.set(id, { ...reading, quality: "missing" });
  assert.equal(budgetReference("rack-a01", readings), null);
});
