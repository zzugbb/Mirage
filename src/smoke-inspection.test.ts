import { test } from "node:test";
import assert from "node:assert/strict";
import {
  smokeFixtures,
  smokePlacement,
  isSmokeFixture,
} from "./smoke-inspection.ts";
import { roomFixtures } from "./fixtures.ts";

test("烟感核对只使用已登记的两处静态设施，不混入探头或设备", () => {
  assert.equal(smokeFixtures.length, 2);
  assert.deepEqual(
    smokeFixtures.map((f) => f.id),
    roomFixtures.filter((f) => f.kind === "smoke").map((f) => f.id),
  );
  for (const id of ["environment-01", "srv-01", "room-01", "unknown"]) {
    assert.equal(isSmokeFixture(id), false);
    assert.equal(smokePlacement(id), null);
  }
  for (const fixture of smokeFixtures)
    assert.equal(fixture.dataStatus, "not-connected");
});
test("两端起点的中心距离对称，坐标高度与原配置一致且不改写设施", () => {
  const before = JSON.stringify(smokeFixtures);
  const [a, b] = smokeFixtures;
  const forward = smokePlacement(a.id)!,
    reverse = smokePlacement(b.id)!;
  assert.equal(forward[0].distance, 0);
  assert.equal(reverse[1].distance, 0);
  assert.equal(forward[1].distance, reverse[0].distance);
  assert.ok(
    Math.abs(forward[1].distance - Math.sqrt(5.6 ** 2 + 3.6 ** 2)) < 1e-9,
  );
  assert.equal(forward[0].position[1], 3.65);
  assert.equal(JSON.stringify(smokeFixtures), before);
});
