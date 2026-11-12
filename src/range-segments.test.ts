import { test } from "node:test";
import assert from "node:assert/strict";
import { racks } from "./installation.ts";
import { inspectRackSpace } from "./rack-space.ts";
import { rangeSegments, rangeObservationTarget } from "./range-segments.ts";

test("八柜任意合法范围按高 U 到低 U 无遗漏、不重叠地覆盖设备与盲板", () => {
  for (const rack of racks)
    for (let first = 1; first <= 42; first++)
      for (let last = first; last <= 42; last++) {
        const range = { rackId: rack.id, first, last };
        const segments = rangeSegments(range);
        const result = inspectRackSpace(range)!;
        let next = last,
          occupied = 0,
          blanked = 0;
        for (const segment of segments) {
          assert.equal(segment.range.rackId, rack.id);
          assert.equal(segment.range.last, next);
          assert.ok(
            segment.first <= segment.range.first &&
              segment.last >= segment.range.last,
          );
          const units = segment.range.last - segment.range.first + 1;
          assert.ok(units > 0);
          if (segment.kind === "device") occupied += units;
          else blanked += units;
          next = segment.range.first - 1;
          assert.deepEqual(
            rangeObservationTarget(range, segment.id),
            segment.range,
          );
        }
        assert.equal(next, first - 1);
        assert.equal(occupied, result.occupied);
        assert.equal(blanked, result.blanked);
        assert.deepEqual(rangeObservationTarget(range, null), range);
      }
});

test("局部相交保留整台设备跨度，盲板只解释实际交集", () => {
  const partial = rangeSegments({ rackId: "rack-a01", first: 4, last: 5 });
  assert.equal(partial.length, 2);
  assert.equal(partial[0].kind, "blanking");
  assert.deepEqual(partial[0].range, { rackId: "rack-a01", first: 5, last: 5 });
  assert.equal(partial[1].id, "srv-07");
  assert.equal(partial[1].first, 3);
  assert.equal(partial[1].last, 4);
  assert.equal(partial[1].range.first, 4);
  for (const [rackId, first, last, id] of [
    ["rack-a01", 7, 7, "srv-08"],
    ["rack-a01", 39, 39, "sw-01"],
    ["rack-a07", 26, 27, "sto-01"],
  ] as const) {
    const [segment] = rangeSegments({ rackId, first, last });
    assert.equal(segment.id, id);
    assert.ok(segment.first <= first && segment.last >= last);
  }
});

test("过期分段身份不能移入另一柜或新范围，非法范围没有观察目标", () => {
  const range = { rackId: "rack-a01", first: 23, last: 35 };
  const original = { ...range };
  assert.equal(rangeObservationTarget(range, "srv-07"), null);
  assert.equal(
    rangeObservationTarget({ ...range, rackId: "rack-a02" }, "srv-02"),
    null,
  );
  assert.equal(rangeObservationTarget(range, "rack-a01:blanking:1"), null);
  assert.deepEqual(range, original);
  assert.deepEqual(rangeSegments(null), []);
  for (const invalid of [
    { ...range, first: 0 },
    { ...range, last: 43 },
    { ...range, first: 1.2 },
    { ...range, first: 36 },
    { ...range, rackId: "unknown" },
  ]) {
    assert.deepEqual(rangeSegments(invalid), []);
    assert.equal(rangeObservationTarget(invalid, null), null);
  }
});
