import { test } from "node:test";
import assert from "node:assert/strict";
import { fixtureRoster, fixtureRosterRows } from "./fixture-roster.ts";
import { roomLayoutFixtures } from "./room-layout.ts";
import {
  environmentObservation,
  environmentProbes,
} from "./environment-monitoring.ts";

test("设施名单与环境安全布置图使用同一组点位，采样资格取自已配置探头", () => {
  const ids = (rows: typeof fixtureRoster) =>
    rows.map((r) => r.fixture.id).sort();
  assert.deepEqual(
    ids(fixtureRosterRows("all", "")),
    roomLayoutFixtures.map((f) => f.id).sort(),
  );
  assert.deepEqual(
    ids(fixtureRosterRows("simulated", "")),
    environmentProbes.map((p) => p.fixtureId).sort(),
  );
  assert.deepEqual(ids(fixtureRosterRows("layout", "")), [
    "access-reader-01",
    "leak-cable-01",
    "leak-controller-01",
    "smoke-01",
    "smoke-02",
  ]);
  for (const row of fixtureRoster) {
    for (const time of [0, 40, 60, 85])
      assert.equal(
        !!environmentObservation(row.fixture.id, time),
        row.simulated,
      );
  }
  assert.equal(
    environmentObservation("environment-02", 60)!.humidity.quality,
    "stale",
  );
  assert.equal(
    environmentObservation("environment-02", 40)!.humidity.quality,
    "valid",
  );
});
test("同一点位内组合匹配常用名称、编号、来源与位置", () => {
  for (const [source, query, id] of [
    ["simulated", " 温湿度  后段 ", "environment-02"],
    ["layout", "检漏 地面", "leak-cable-01"],
    ["layout", "ＳＭＯＫＥ－０２ B 排", "smoke-02"],
    ["layout", "门禁 后墙", "access-reader-01"],
  ] as const)
    assert.deepEqual(
      fixtureRosterRows(source, query).map((r) => r.fixture.id),
      [id],
    );
  assert.deepEqual(fixtureRosterRows("layout", "温湿度"), []);
  assert.deepEqual(fixtureRosterRows("simulated", "前段 后段"), []);
});
