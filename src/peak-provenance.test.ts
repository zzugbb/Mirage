import { test } from "node:test";
import assert from "node:assert/strict";
import {
  maximumSources,
  peakScopeIds,
  peakSourceIntervals,
} from "./peak-provenance.ts";
import {
  reviewHistories,
  reviewCoolingHistories,
  type ReviewPoint,
} from "./review-model.ts";
import { racks } from "./installation.ts";
import { spatialSnapshot } from "./spatial.ts";

test("机房、八柜和制冷范围逐秒最高来源对应原有效整机最大值", () => {
  const snapshots = Array.from(
    { length: 121 },
    (_, time) => spatialSnapshot(time).readings,
  );
  for (const id of ["room-01", ...racks.map((r) => r.id), "cooling-01"]) {
    const ids = peakScopeIds(id)!;
    const history =
      id === "cooling-01"
        ? reviewCoolingHistories().temperature
        : reviewHistories(id, "srv-01").temperature;
    for (const point of history) {
      const valid = ids
        .map((id) => snapshots[point.time].get(id)!)
        .filter((r) => r.quality === "valid" && r.temperature !== null);
      const max = Math.max(...valid.map((r) => r.temperature!));
      assert.equal(point.value, max);
      assert.equal(point.coverage, valid.length);
      assert.equal(point.count, ids.length);
      assert.deepEqual(
        point.peakSources,
        valid
          .filter((r) => r.temperature === max)
          .map((r) => r.id)
          .sort(),
      );
      assert.ok(
        !point.peakSources!.some((id) =>
          ["srv-25", "srv-56", "srv-63"].includes(id),
        ),
      );
      if (point.time >= 45) assert.ok(!point.peakSources!.includes("srv-59"));
    }
    const intervals = peakSourceIntervals(history, 60);
    assert.deepEqual(
      intervals.flatMap((i) =>
        Array.from({ length: i.end - i.start + 1 }, (_, n) => n + i.start),
      ),
      Array.from({ length: 61 }, (_, n) => n),
    );
    for (const interval of intervals)
      for (let time = interval.start; time <= interval.end; time++) {
        assert.deepEqual(interval.sourceIds, history[time].peakSources);
        assert.equal(interval.coverage, history[time].coverage);
        assert.ok(
          history[time].value! >= interval.min! &&
            history[time].value! <= interval.max!,
        );
      }
  }
});

test("来源按未舍入值比较，保留并列且排除失效、空值，零值保持有效", () => {
  const base = spatialSnapshot(0).readings.get("srv-01")!;
  const readings = new Map([
    ["a", { ...base, temperature: 30.04 }],
    ["b", { ...base, temperature: 30.03 }],
    ["c", { ...base, temperature: 30.04 }],
    ["old", { ...base, quality: "stale" as const, temperature: 99 }],
    ["off", { ...base, quality: "offline" as const, temperature: 99 }],
    ["missing", { ...base, quality: "missing" as const, temperature: 99 }],
    ["null", { ...base, temperature: null }],
    ["nan", { ...base, temperature: NaN }],
    ["zero", { ...base, temperature: 0 }],
  ]);
  assert.deepEqual(
    maximumSources([...readings.keys(), "a", "unknown"], readings),
    ["a", "c"],
  );
  assert.deepEqual(
    maximumSources(["old", "off", "missing", "null", "nan"], readings),
    [],
  );
  assert.deepEqual(maximumSources(["zero", "null"], readings), ["zero"]);
});

test("来源与覆盖分别分段，双重变化明确，空段不补零，截止秒不泄露未来", () => {
  const point = (
    time: number,
    source: string[],
    coverage: number,
    value: number | null,
  ): ReviewPoint => ({
    time,
    peakSources: source,
    value,
    coverage,
    count: 3,
    quality: value === null ? "missing" : "valid",
  });
  const history = [
    point(0, ["a", "b"], 3, 30),
    point(1, ["b", "a"], 3, 31),
    point(2, ["a", "b"], 2, 32),
    point(3, ["b"], 2, 33),
    point(4, [], 0, null),
    point(5, [], 0, null),
    point(6, ["a"], 1, 29),
  ];
  const copy = structuredClone(history);
  const result = peakSourceIntervals(history, 5);
  assert.deepEqual(
    result.map((i) => [i.start, i.end, i.reason]),
    [
      [0, 1, "initial"],
      [2, 2, "coverage"],
      [3, 3, "source"],
      [4, 5, "source-coverage"],
    ],
  );
  assert.equal(result[0].min, 30);
  assert.equal(result[0].max, 31);
  assert.equal(result.at(-1)!.min, null);
  assert.equal(result.at(-1)!.max, null);
  assert.equal(peakSourceIntervals(history, 0).length, 1);
  assert.equal(peakSourceIntervals(history, 0)[0].end, 0);
  assert.deepEqual(history, copy);
  const room = reviewHistories("room-01", "srv-01").temperature;
  assert.equal(peakSourceIntervals(room, 44).at(-1)!.end, 44);
  assert.ok(
    peakSourceIntervals(room, 45).some(
      (i) => i.start === 45 && i.coverage === room[44].coverage - 1,
    ),
  );
});

test("单设备、部件和供电设施不产生最高进风来源过程", () => {
  for (const id of ["srv-01", "cpu-01", "power-01", "pdu-a01-a", "unknown"]) {
    assert.equal(peakScopeIds(id), null);
    assert.ok(
      reviewHistories(id, "srv-01").temperature.every(
        (p) => p.peakSources === undefined,
      ),
    );
  }
  // 通用曲线不提供制冷设施测点；专用关联曲线才提供其整机来源。
  assert.ok(
    reviewHistories("cooling-01", "srv-01").temperature.every(
      (p) => p.value === null && p.peakSources?.length === 0,
    ),
  );
  assert.ok(
    reviewHistories("room-01", "srv-01").power.every(
      (p) => p.peakSources === undefined,
    ),
  );
});
