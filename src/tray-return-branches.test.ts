import assert from "node:assert/strict";
import test from "node:test";
import { airflowSnapshot } from "./airflow.ts";
import { airflowReturnTray } from "./airflow-return-tray.ts";
import { trayReturnBranches } from "./tray-return-branches.ts";

test("桥架反查按实际交会返回各柜代表支路和原侧梁量距", () => {
  const branches = trayReturnBranches("cable-tray-b");
  assert.deepEqual(
    branches.map(({ rackId, rackName, deviceId, deviceName, units }) => [
      rackId,
      rackName,
      deviceId,
      deviceName,
      units,
    ]),
    [
      ["rack-a01", "A01 机柜", "srv-01", "SRV-01", "U23–24"],
      ["rack-a02", "A02 机柜", "srv-03", "SRV-03", "U23–24"],
      ["rack-a03", "A03 机柜", "srv-05", "SRV-05", "U23"],
      ["rack-a04", "A04 机柜", "srv-30", "SRV-30", "U23–24"],
    ],
  );
  for (const { deviceId, sourceId, sourceName, crossings } of branches) {
    assert.equal(sourceId, "cooling-01");
    assert.equal(sourceName, "制冷单元");
    assert.deepEqual(
      crossings.map(({ fixtureId, side }) => [fixtureId, side]),
      [
        ["cable-tray-b", 1],
        ["cable-tray-b", -1],
      ],
    );
    assert.deepEqual(
      crossings,
      airflowReturnTray(airflowSnapshot(40, new Map(), deviceId).routes[0])
        .crossings,
    );
  }
  assert.deepEqual(trayReturnBranches("cable-tray-a"), []);
  assert.deepEqual(trayReturnBranches("cooling-01"), []);
});
