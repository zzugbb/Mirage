import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectRackSpace, rackSpaceCandidates } from "./rack-space.ts";
import { devices, racks } from "./installation.ts";
import { modelForDevice } from "./catalog.ts";
import { createState } from "./domain.ts";
import { rackUnitSpan } from "./scene/rack-unit-guide.ts";

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
          Array.from({ length: g.positions }, (_, i) => g.first + i),
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
