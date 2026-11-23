import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deviceIntervalEnergy,
  feederEnergyInterval,
  feederIntervalEnergy,
  energyText,
} from "./feeder-energy.ts";
import { deviceObservation } from "./device-data.ts";
import { feederConnections, initialFeeders } from "./power-feeders.ts";

test("出线区间电量按整机逐秒积分，双输入去重且各柜互不串入", () => {
  const interval = feederEnergyInterval(60, 40);
  assert.deepEqual(interval, feederEnergyInterval(40, 60));
  const { members } = feederConnections({
    ...initialFeeders(),
    first: "pdu-b04-a",
    second: "pdu-b04-b",
    group: "both",
    query: "SRV-59",
  });
  const ids = members.flatMap((row) => row.links.map((link) => link.deviceId));
  assert.equal(ids.length, 24);
  const energy = feederIntervalEnergy(ids, interval);
  assert.deepEqual(
    [
      energy.complete,
      energy.partial,
      energy.unavailable,
      energy.covered,
      energy.possible,
    ],
    [11, 1, 0, 224, 240],
  );
  let expected = 0;
  for (const id of new Set(ids))
    for (let t = 40; t < 60; t++) {
      const a = deviceObservation(t, id),
        b = deviceObservation(t + 1, id);
      if (a.quality === "valid" && b.quality === "valid")
        expected += (a.power! + b.power!) / 7200;
    }
  assert.ok(Math.abs(energy.wattHours! - expected) < 1e-10);
  assert.equal(energyText(energy.wattHours), "12.084 Wh");
});

test("过期边界只计至最后有效时刻，单侧有效及两个过期旧值都不成段", () => {
  const chunk = (a: number, b: number) =>
    deviceIntervalEnergy("srv-59", feederEnergyInterval(a, b));
  const known = chunk(40, 60);
  assert.deepEqual(
    [energyText(known.wattHours), known.covered, known.lastEnd],
    ["0.121 Wh", 4, 44],
  );
  assert.equal(chunk(43, 44).covered, 1);
  for (const [a, b] of [
    [44, 45],
    [45, 60],
    [40, 40],
  ])
    assert.deepEqual(chunk(a, b), {
      wattHours: null,
      covered: 0,
      lastEnd: null,
    });
});

test("停机零电量计满时长；离线、未配置以及空交集保留空缺", () => {
  const interval = feederEnergyInterval(40, 60);
  const zero = feederIntervalEnergy(["srv-63"], interval);
  assert.equal(energyText(zero.wattHours), "0.000 Wh");
  assert.equal(zero.covered, 20);
  const missing = feederIntervalEnergy(["srv-25", "srv-56"], interval);
  assert.deepEqual(
    [missing.wattHours, missing.covered, missing.possible, missing.unavailable],
    [null, 0, 40, 2],
  );
  const empty = feederIntervalEnergy([], interval);
  assert.deepEqual(
    [energyText(empty.wattHours), empty.covered, empty.possible],
    ["—", 0, 0],
  );
});
