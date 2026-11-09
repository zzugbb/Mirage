import { test } from "node:test";
import assert from "node:assert/strict";
import { inletProcess, inletConditions } from "./inlet-process.ts";
import { devices } from "./installation.ts";
import { deviceObservation } from "./device-data.ts";

test("四段持续条件由已确认事件还原，回差与等待秒数保持模拟定义", () => {
  const result = inletProcess("srv-01", 120);
  assert.deepEqual(
    result.intervals.map(({ kind, start, end, confirmed }) => ({
      kind,
      start,
      end,
      confirmed,
    })),
    [
      { kind: "raised", start: 30, end: 35, confirmed: true },
      { kind: "escalated", start: 44, end: 49, confirmed: true },
      { kind: "downgraded", start: 78, end: 83, confirmed: true },
      { kind: "recovered", start: 87, end: 95, confirmed: true },
    ],
  );
  for (const interval of result.intervals)
    assert.equal(
      interval.end - interval.start,
      inletConditions[interval.kind].required,
    );
});
test("等待区间只延伸至当前观测秒，不提前给出确认结果", () => {
  for (const [start, end] of [
    [30, 35],
    [44, 49],
    [78, 83],
    [87, 95],
  ]) {
    assert.equal(
      inletProcess("srv-01", start - 1).intervals.some(
        (i) => i.start === start,
      ),
      false,
    );
    const pending = inletProcess("srv-01", end - 1).intervals.at(-1)!;
    assert.equal(pending.start, start);
    assert.equal(pending.end, end - 1);
    assert.equal(pending.confirmed, false);
    const confirmed = inletProcess("srv-01", end).intervals.at(-1)!;
    assert.equal(confirmed.id, pending.id);
    assert.equal(confirmed.confirmed, true);
  }
});
test("失效和停机不产生当前计时，过期历史冻结且保留来源秒数", () => {
  for (const id of ["srv-25", "srv-56", "srv-63"])
    assert.deepEqual(inletProcess(id, 120).intervals, []);
  const stale = inletProcess("srv-59", 120);
  assert.equal(stale.observedAt, 44);
  assert.equal(stale.quality, "stale");
  assert.deepEqual(stale.intervals, inletProcess("srv-59", 45).intervals);
  assert.ok(stale.intervals.every((i) => i.confirmed && i.end <= 44));
});
test("全部机型和逐秒记录满足观测边界，确认区间每秒满足相同阈值", () => {
  for (const device of devices)
    for (let time = 0; time <= 120; time++) {
      const result = inletProcess(device.id, time);
      for (const interval of result.intervals) {
        assert.ok(interval.start <= interval.end && interval.end <= time);
        assert.ok(
          result.observedAt !== null && interval.end <= result.observedAt,
        );
        const rule = inletConditions[interval.kind];
        assert.ok(interval.end - interval.start <= rule.required);
        for (let t = interval.start; t <= interval.end; t++) {
          const value = deviceObservation(t, device.id).temperature!;
          assert.ok(
            rule.operator === "≥"
              ? value >= rule.threshold
              : value <= rule.threshold,
          );
        }
      }
    }
});
