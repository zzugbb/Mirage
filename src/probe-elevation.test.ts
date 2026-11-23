import assert from "node:assert/strict";
import { test } from "node:test";
import { environmentRounds } from "./environment-rounds.ts";
import { probeElevation } from "./probe-elevation.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

test("两排探头的标高分别对应本排四柜 U29 的配置设备", () => {
  const result = environmentRounds.flatMap(({ racks, probe }) =>
    racks.map((rack) => {
      const projected = probeElevation(rack.id, probe.position[1])!;
      assert.equal(projected.unit, 29);
      assert.ok(projected.fraction > 0 && projected.fraction < 1);
      return projected.segment?.id;
    }),
  );
  assert.deepEqual(result, [
    "srv-12",
    "srv-18",
    "srv-24",
    "srv-31",
    "srv-39",
    "srv-47",
    "srv-55",
    "srv-63",
  ]);
});

test("标高落到盲板、柜外和缺少配置时不产生设备对端", () => {
  const { unitOrigin, unitPitch } = definition.rack;
  const id = environmentRounds[0].racks[0].id;
  assert.equal(
    probeElevation(id, unitOrigin + unitPitch)?.segment?.kind,
    "blanking",
  );
  assert.equal(probeElevation(id, 0)?.segment, undefined);
  assert.equal(probeElevation(id, 3)?.segment, undefined);
  assert.equal(probeElevation("unknown", 1.5), null);
  assert.equal(probeElevation(id, NaN), null);
});

test("相邻安装位共用的边界归入上方 U 位", () => {
  const { unitOrigin, unitPitch, units } = definition.rack;
  const id = environmentRounds[0].racks[0].id;
  for (let u = 1; u <= units; u++) {
    const edge = unitOrigin + (u + 0.5) * unitPitch;
    assert.equal(probeElevation(id, edge)?.unit, u + 1);
    assert.equal(probeElevation(id, edge - 1e-8)?.unit, u);
  }
});
