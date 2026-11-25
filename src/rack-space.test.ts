import { test } from "node:test";
import assert from "node:assert/strict";
import {
  inspectRackSpace,
  rackSpaceCandidates,
  inspectRackCapacity,
  rackCapacity,
  roomRackCapacity,
  spaceRows,
} from "./rack-space.ts";
import { devices, racks } from "./installation.ts";
import { modelForDevice } from "./catalog.ts";
import { createState } from "./domain.ts";
import { rackUnitSpan } from "./scene/rack-unit-guide.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

test("容量登记为样板配置，逐 U 无重叠、越界或已安装占用", () => {
  const { label, ranges } = definition.installation.rackCapacity;
  assert.match(label, /样板/);
  for (const rack of racks) {
    const entries = ranges.filter((range) => range.rackId === rack.id);
    const registered = new Map<number, string>();
    for (const range of entries) {
      assert.ok(
        ["available", "reserved", "unavailable"].includes(range.status),
      );
      assert.ok(range.reason.startsWith("样板"));
      const installation = inspectRackSpace(range);
      assert.ok(installation);
      assert.equal(installation.occupied, 0);
      for (let u = range.first; u <= range.last; u++) {
        assert.ok(!registered.has(u), `${rack.name} U${u} 重复登记`);
        registered.set(u, range.status);
      }
    }
    const result = rackCapacity(rack.id)!;
    const slots = result.segments.flatMap((segment) =>
      Array.from({ length: segment.last - segment.first + 1 }, (_, index) => ({
        unit: segment.first + index,
        status: segment.status,
      })),
    );
    assert.equal(slots.length, result.units);
    assert.equal(new Set(slots.map((slot) => slot.unit)).size, result.units);
    for (const { unit, status } of slots) {
      const occupied = inspectRackSpace({
        rackId: rack.id,
        first: unit,
        last: unit,
      })!.occupied;
      assert.equal(
        status,
        occupied ? "occupied" : (registered.get(unit) ?? "unknown"),
      );
    }
  }
  assert.ok(
    ranges.every((range) => racks.some((rack) => rack.id === range.rackId)),
  );
});

test("机房的 1U、2U 和 4U 候选只包含连续可分配登记，查找与柜排取交集", () => {
  for (const size of [1, 2, 4, 42]) {
    const comparison = roomRackCapacity(size);
    assert.deepEqual(
      comparison.map(({ rack }) => rack.id),
      racks.map(({ id }) => id),
    );
    for (const { rack, units, candidates } of comparison) {
      const expected = Array.from({ length: units - size + 1 }, (_, i) => ({
        rackId: rack.id,
        first: i + 1,
        last: i + size,
      })).filter((range) => inspectRackCapacity(range)?.available);
      assert.deepEqual(candidates, expected);
    }
    for (const row of spaceRows)
      assert.deepEqual(
        roomRackCapacity(size, row.id),
        comparison.filter(({ rack }) => row.rackIds.includes(rack.id)),
      );
  }
  assert.deepEqual(
    roomRackCapacity(
      2,
      spaceRows.find((row) => row.rackIds.includes("rack-a08"))!.id,
      "Ｂ０４",
    ).flatMap(({ candidates }) =>
      candidates.map(({ first, last }) => [first, last]),
    ),
    [
      [12, 13],
      [13, 14],
      [31, 32],
    ],
  );
  assert.equal(roomRackCapacity(4, "all", "B04")[0]?.candidates.length, 0);
  assert.equal(roomRackCapacity(1, "all", "missing-rack").length, 0);
  assert.equal(roomRackCapacity(2, "missing-row").length, 0);
});

test("逐段依据分开占用、预留、不可用、可分配和配置未知，0U 不进入核对", () => {
  const rackId = "rack-a07";
  const result = inspectRackCapacity({ rackId, first: 18, last: 35 })!;
  assert.equal(result.available, false);
  assert.deepEqual(
    new Set(result.segments.map(({ status }) => status)),
    new Set(["occupied", "reserved", "unavailable", "available", "unknown"]),
  );
  const storage = result.segments.find(
    (segment) => segment.reason === "STO-02",
  );
  assert.deepEqual(storage?.overlap, { first: 35, last: 35 });
  assert.equal(storage?.last, 38);
  assert.deepEqual(
    inspectRackCapacity({ rackId, first: 31, last: 32 })!.segments[0]?.overlap,
    { first: 31, last: 32 },
  );
  assert.equal(inspectRackCapacity({ rackId, first: 0, last: 0 }), null);
  assert.equal(
    inspectRackCapacity({ rackId: "missing", first: 1, last: 1 }),
    null,
  );
});

test("八柜连续空段候选与逐U暴力检查一致，重叠起点不作为可安装台数", () => {
  for (const rack of racks) {
    const occupied = new Set<number>();
    for (const d of devices.filter((d) => d.rackId === rack.id))
      for (
        let u = d.startUnit;
        u < d.startUnit + modelForDevice(d.id).units;
        u++
      )
        occupied.add(u);
    for (const size of [1, 2, 4, 42]) {
      const candidates = rackSpaceCandidates(rack.id, size);
      const actual = candidates
        .flatMap((g) =>
          g.ranges.map((range) => {
            assert.equal(range.rackId, rack.id);
            assert.equal(range.last, range.first + size - 1);
            return range.first;
          }),
        )
        .sort((a, b) => a - b);
      const expected = Array.from(
        { length: 43 - size },
        (_, i) => i + 1,
      ).filter((start) =>
        Array.from({ length: size }, (_, i) => start + i).every(
          (u) => !occupied.has(u),
        ),
      );
      assert.deepEqual(actual, expected);
      for (const g of candidates)
        assert.equal(inspectRackSpace(g.sample)!.occupied, 0);
    }
    const full = inspectRackSpace({ rackId: rack.id, first: 1, last: 42 })!;
    assert.equal(full.occupied, occupied.size);
    assert.equal(full.occupied + full.blanked, 42);
  }
});

test("部分相交仍报告完整设备跨度，4U与边界校验不截断安装配置", () => {
  const result = inspectRackSpace({ rackId: "rack-a07", first: 27, last: 29 })!;
  assert.equal(result.occupied, 3);
  assert.deepEqual(
    result.conflicts.map((d) => [d.id, d.first, d.last]),
    [
      ["srv-55", 29, 30],
      ["sto-01", 25, 28],
    ],
  );
  for (const [first, last] of [
    [0, 2],
    [1, 43],
    [3, 2],
    [1.5, 3],
    [NaN, 3],
    [1, Infinity],
  ])
    assert.equal(inspectRackSpace({ rackId: "rack-a01", first, last }), null);
  assert.equal(
    inspectRackSpace({ rackId: "missing", first: 1, last: 2 }),
    null,
  );
  for (const size of [0, 43, 1.5, NaN])
    assert.deepEqual(rackSpaceCandidates("rack-a01", size), []);
});

test("三维核查范围只属于当前机柜，抽出和回看保持占用，不污染设备层级", () => {
  const state = {
    ...createState(),
    level: "rack" as const,
    deviceId: "srv-01",
    selected: "rack-a01",
  };
  const range = { rackId: "rack-a01", first: 1, last: 6 };
  const span = rackUnitSpan(state, range)!;
  assert.equal(span.label, "U1–6");
  assert.deepEqual(
    rackUnitSpan({ ...state, trayExtended: true, time: 120 }, range),
    span,
  );
  assert.equal(rackUnitSpan({ ...state, deviceId: "srv-49" }, range), null);
  assert.equal(rackUnitSpan({ ...state, level: "device" }, range), null);
  assert.equal(rackUnitSpan(state, { ...range, last: 43 }), null);
  assert.equal(
    inspectRackSpace({ rackId: "rack-a01", first: 23, last: 24 })!.occupied,
    2,
  );
});

test("机房 U 位括线只出现在选中的候选机柜", () => {
  const range = { rackId: "rack-a08", first: 31, last: 32 };
  const state = {
    ...createState(),
    level: "room" as const,
    selected: range.rackId,
  };
  const span = rackUnitSpan(state, range)!;
  assert.equal(span.rack.id, range.rackId);
  assert.equal(span.label, "U31–32");
  assert.equal(rackUnitSpan({ ...state, selected: "rack-a07" }, range), null);
  assert.equal(rackUnitSpan({ ...state, selected: "room-01" }, range), null);
});
