import { smokeTrayPlacement } from "./fixture-crossing.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  environmentRounds,
  environmentRoundFor,
} from "./environment-rounds.ts";
import { environmentObservation } from "./environment-monitoring.ts";
import { fixtureRosterRows } from "./fixture-roster.ts";
import { trayRow } from "./cable-trays.ts";

test("两排巡检点各自对应本排桥架及四柜，横距按配置中心线计算", () => {
  assert.equal(environmentRounds.length, 2);
  const members = new Set<string>();
  for (const round of environmentRounds) {
    const [smoke, tray, probe] = round.points;
    assert.deepEqual(
      round.points.map((point) => point.kind),
      ["smoke", "cable-tray", "environment"],
    );
    assert.equal(round.racks.length, 4);
    assert.deepEqual(round.row.rackIds, trayRow(tray.id)?.rackIds);
    for (const point of round.points) {
      assert.ok(!members.has(point.id));
      members.add(point.id);
      assert.equal(environmentRoundFor(point.id), round);
    }
    assert.ok(Math.abs(round.smokeOffset - 0.7) < 1e-9);
    assert.deepEqual(
      fixtureRosterRows("layout", round.row.name).map((r) => r.fixture.id),
      [smoke.id],
    );
    assert.deepEqual(
      fixtureRosterRows("simulated", round.row.name).map((r) => r.fixture.id),
      [probe.id],
    );
    assert.equal(environmentObservation(smoke.id, 40), null);
    assert.equal(environmentObservation(tray.id, 40), null);
    assert.equal(
      environmentObservation(probe.id, 40)?.humidity.quality,
      "valid",
    );
  }
  assert.equal(environmentRoundFor("leak-cable-01"), undefined);
});

test("同框标记落在本排烟感中心及桥架轴线，竖差与水平距离分开核对", () => {
  for (const round of environmentRounds) {
    const placement = smokeTrayPlacement(round);
    const [center, axis] = placement.points;
    const [smoke, tray] = round.points;
    assert.deepEqual(center.toArray(), smoke.position);
    assert.equal(axis.y, tray.position[1]);
    assert.equal(axis.z, tray.position[2]);
    assert.equal(axis.x, center.x);
    assert.ok(Math.abs(placement.difference - 0.3) < 1e-9);
    assert.ok(
      Math.abs(placement.horizontal - Math.abs(axis.z - center.z)) < 1e-9,
    );
    assert.deepEqual(
      placement.markers.map((m) => m.point),
      placement.points,
    );
  }
});
