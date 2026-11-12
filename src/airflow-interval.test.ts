import { test } from "node:test";
import assert from "node:assert/strict";
import { airflowIntervals } from "./airflow-interval.ts";
import { devices, coolingRelationFor } from "./installation.ts";
import { coolingCapacityAt } from "./simulation.ts";
import { deviceObservation } from "./device-data.ts";
const target = (id: string) => ({
  id: coolingRelationFor(id).id,
  sourceId: "cooling-01",
  deviceId: id,
});
test("输入阶段只包含截至当前秒的已知事件，边界连续且无重复", () => {
  for (let time = 0; time <= 120; time++) {
    const rows = airflowIntervals(target("srv-07"), time)!;
    assert.equal(rows[0].start, 0);
    assert.equal(rows.at(-1)!.end, time);
    assert.deepEqual(
      rows.map((r) => r.start),
      [0, 20, 26, 70, 78].filter((t) => t <= time),
    );
    assert.equal(
      rows.reduce((n, r) => n + r.count, 0),
      time + 1,
    );
    rows.forEach((r, i) => {
      assert.ok(r.end >= r.start);
      if (i) assert.equal(r.start, rows[i - 1].end + 1);
    });
  }
  assert.equal(
    airflowIntervals({ ...target("srv-07"), id: "missing" }, 60),
    null,
  );
  assert.equal(airflowIntervals(target("srv-07"), NaN)![0].end, 0);
});
test("八柜四机型使用本支路整机首末值，输入百分比不变成温度或设施计量", () => {
  for (const device of devices)
    for (const row of airflowIntervals(target(device.id), 120)!) {
      for (const point of [row.first, row.last]) {
        const observed = deviceObservation(point.time, device.id);
        assert.equal(point.input, Math.round(coolingCapacityAt(point.time)));
        assert.equal(
          point.temperature,
          observed.quality === "valid" ? observed.temperature : null,
        );
      }
      assert.equal(
        row.difference,
        row.first.temperature !== null && row.last.temperature !== null
          ? Math.round((row.last.temperature - row.first.temperature) * 10) / 10
          : null,
      );
    }
});
test("过期、离线、缺失和停机不补零，公共输入阶段保留且有效维护观测计入", () => {
  const stale = airflowIntervals(target("srv-59"), 90)!;
  assert.equal(stale.length, 5);
  assert.equal(stale[2].validCount, 19);
  assert.equal(stale[2].difference, null);
  assert.equal(stale[2].last.observedAt, 44);
  assert.equal(stale[2].last.temperature, null);
  for (const id of ["srv-25", "srv-56", "srv-63"]) {
    const rows = airflowIntervals(target(id), 120)!;
    assert.equal(rows.length, 5);
    assert.ok(rows.every((r) => r.validCount === 0 && r.difference === null));
  }
  assert.ok(
    airflowIntervals(target("srv-43"), 120)!.every(
      (r) => r.validCount === r.count,
    ),
  );
});
