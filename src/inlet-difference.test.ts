import { test } from "node:test";
import assert from "node:assert/strict";
import { inletDifferenceProcess } from "./inlet-difference.ts";
import { inletPairSnapshot } from "./inlet-pair.ts";

test("温差过程只核对已发生记录，极值方向和首次时刻与逐秒有效差值一致", () => {
  for (const [first, second] of [
    ["srv-01", "srv-02"],
    ["srv-59", "srv-07"],
    ["sto-01", "sw-02"],
  ])
    for (const end of [0, 25, 44, 45, 60, 100, 120]) {
      const process = inletDifferenceProcess(first, second, end)!;
      const values = Array.from({ length: end + 1 }, (_, time) => ({
        time,
        value: inletPairSnapshot(first, second, time)!.difference,
      })).filter(
        (point): point is { time: number; value: number } =>
          point.value !== null,
      );
      const min = Math.min(...values.map((p) => p.value)),
        max = Math.max(...values.map((p) => p.value));
      assert.equal(process.count, end + 1);
      assert.equal(process.validCount, values.length);
      assert.deepEqual(
        process.minimum,
        values.find((p) => p.value === min) ?? null,
      );
      assert.deepEqual(
        process.maximum,
        values.find((p) => p.value === max) ?? null,
      );
      for (const [index, row] of process.intervals.entries()) {
        assert.equal(
          row.start,
          index ? process.intervals[index - 1].end + 1 : 0,
        );
        assert.ok(row.end <= end);
        for (let time = row.start; time <= row.end; time++) {
          const pair = inletPairSnapshot(first, second, time)!;
          assert.equal(row.comparable, pair.difference !== null);
          assert.equal(row.firstStatus, pair.first.reason);
          assert.equal(row.secondStatus, pair.second.reason);
        }
      }
      assert.equal(process.intervals.at(-1)!.end, end);
    }
});

test("过期前有效值参与极值，失效后不沿用旧值；离线、缺失和停机各自说明", () => {
  const process = inletDifferenceProcess("srv-59", "srv-07", 60)!;
  assert.equal(process.validCount, 45);
  assert.deepEqual(
    process.intervals.map((r) => [r.start, r.end, r.comparable]),
    [
      [0, 44, true],
      [45, 60, false],
    ],
  );
  assert.equal(process.intervals[1].firstStatus, "数据过期");
  assert.ok(process.minimum!.time <= 44);
  assert.ok(process.maximum!.time <= 44);
  for (const [id, reason] of [
    ["srv-25", "设备离线"],
    ["srv-56", "未配置观测"],
    ["srv-63", "停机 · 无进风值"],
  ]) {
    const empty = inletDifferenceProcess(id, "srv-07", 120)!;
    assert.equal(empty.validCount, 0);
    assert.equal(empty.minimum, null);
    assert.equal(empty.maximum, null);
    assert.equal(empty.intervals.length, 1);
    assert.equal(empty.intervals[0].firstStatus, reason);
  }
});

test("有效零温差与缺失分开，并列极值取首次，交换对象后极值取反且时刻对应", () => {
  const zero = inletDifferenceProcess("sw-01", "sw-02", 120)!;
  assert.equal(zero.validCount, 121);
  assert.deepEqual(zero.minimum, { time: 0, value: 0 });
  assert.deepEqual(zero.maximum, { time: 0, value: 0 });
  assert.equal(zero.intervals.length, 1);
  const a = inletDifferenceProcess("srv-59", "srv-07", 120)!,
    b = inletDifferenceProcess("srv-07", "srv-59", 120)!;
  assert.deepEqual(a.minimum, {
    time: b.maximum!.time,
    value: -b.maximum!.value,
  });
  assert.deepEqual(a.maximum, {
    time: b.minimum!.time,
    value: -b.minimum!.value,
  });
  assert.deepEqual(
    a.intervals.map((r) => ({
      ...r,
      firstStatus: r.secondStatus,
      secondStatus: r.firstStatus,
    })),
    b.intervals,
  );
});

test("异常时间归一，冻结历史结果不会被后续查询污染，非法对象不能生成温差过程", () => {
  for (const t of [-1, NaN, Infinity])
    assert.equal(inletDifferenceProcess("srv-01", "srv-02", t)!.end, 0);
  assert.equal(inletDifferenceProcess("srv-01", "srv-02", 60.8)!.end, 60);
  assert.equal(inletDifferenceProcess("srv-01", "srv-02", 999)!.end, 120);
  const saved = inletDifferenceProcess("srv-01", "srv-02", 25),
    copy = structuredClone(saved);
  inletDifferenceProcess("srv-01", "srv-02", 120);
  assert.deepEqual(saved, copy);
  for (const id of ["srv-01", "cpu-01", "rack-a01", "unknown"])
    assert.equal(inletDifferenceProcess("srv-01", id, 60), null);
});
