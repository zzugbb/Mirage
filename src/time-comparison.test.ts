import { test } from "node:test";
import assert from "node:assert/strict";
import { compareTimes } from "./time-comparison.ts";
import { reviewHistories } from "./review-model.ts";
import type { ReviewPoint } from "./review-model.ts";

test("基准与对照方向固定，零值有效且不生成百分比变化", () => {
  const points: ReviewPoint[] = [0, 10, 5].map((value, time) => ({
    time,
    value,
    quality: "valid",
    coverage: 1,
    count: 1,
  }));
  assert.equal(compareTimes(points, 0, 1).difference, 10);
  assert.equal(compareTimes(points, 1, 0).difference, -10);
  assert.equal(compareTimes(points, 1, 1).difference, 0);
  assert.equal(compareTimes(points, 0, 0).reference, 0);
  assert.equal(compareTimes(points, 0, 7).difference, null);
});
test("无效旧值与非有限值不参加差值，两端质量保留", () => {
  for (const quality of ["missing", "stale", "offline"] as const) {
    const points: ReviewPoint[] = [
      { time: 0, value: 12, quality: "valid", coverage: 1, count: 1 },
      { time: 1, value: 12, quality, coverage: 0, count: 1 },
    ];
    const result = compareTimes(points, 0, 1);
    assert.equal(result.current, null);
    assert.equal(result.difference, null);
    assert.equal(result.second!.quality, quality);
    assert.equal(result.coverageChanged, true);
  }
  for (const value of [null, NaN, Infinity])
    assert.equal(
      compareTimes(
        [{ time: 0, value, quality: "valid", coverage: 0, count: 1 }],
        0,
        0,
      ).difference,
      null,
    );
});
test("真实模拟中的过期边界和范围覆盖分别解释，不把聚合差值当同集合响应", () => {
  const device = reviewHistories("srv-59", "srv-59");
  assert.equal(compareTimes(device.power, 44, 45).difference, null);
  const rack = reviewHistories("rack-a08", "srv-01");
  assert.equal(compareTimes(rack.power, 44, 45).coverageChanged, true);
  assert.notEqual(compareTimes(rack.power, 44, 45).difference, null);
  const zero = reviewHistories("srv-63", "srv-63");
  assert.equal(compareTimes(zero.power, 0, 120).difference, 0);
});
