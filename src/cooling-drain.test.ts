import assert from "node:assert/strict";
import { test } from "node:test";
import { airflowSnapshot } from "./airflow.ts";
import { condensateFixtures, outlet } from "./condensate.ts";
import { coolingDrainIncludes, coolingDrainLink } from "./cooling-drain.ts";
import { rackForDevice } from "./installation.ts";
import { leakController } from "./leak-detection.ts";

test("A02 与 B03 的实际支路核对同一制冷柜的送回风和排水标高", () => {
  for (const [deviceId, rack] of [
    ["srv-13", "A02"],
    ["srv-55", "B03"],
  ]) {
    assert.equal(rackForDevice(deviceId).name.split(" ")[0], rack);
    const [route] = airflowSnapshot(40, new Map(), deviceId).routes;
    const link = coolingDrainLink(route);
    assert.ok(link);
    assert.deepEqual([link.sourceId, link.deviceId], ["cooling-01", deviceId]);
    assert.equal(
      link.supplyHeight,
      route.endpoints.find((endpoint) => endpoint.kind === "supply")?.point[1],
    );
    assert.equal(
      link.returnHeight,
      route.endpoints.find((endpoint) => endpoint.kind === "receiver")
        ?.point[1],
    );
    assert.equal(link.socketHeight, outlet[1]);
    assert.deepEqual(
      [link.supplyHeight, link.returnHeight, link.socketHeight].map((height) =>
        height.toFixed(3),
      ),
      ["0.300", "1.750", "0.540"],
    );
  }
});

test("源不匹配、缺少逻辑送风或缺少逻辑回风时没有同柜排水核对", () => {
  const [route] = airflowSnapshot(40, new Map(), "srv-55").routes;
  assert.equal(coolingDrainLink({ ...route, sourceId: "cooling-other" }), null);
  for (const kind of ["supply", "receiver"]) {
    assert.equal(
      coolingDrainLink({
        ...route,
        endpoints: route.endpoints.filter((endpoint) => endpoint.kind !== kind),
      }),
      null,
    );
  }
});

test("同柜排水核对只包括该制冷柜、登记排水设施和关联感应线", () => {
  for (const id of [
    "cooling-01",
    ...condensateFixtures.map((fixture) => fixture.id),
    "leak-cable-01",
  ])
    assert.ok(coolingDrainIncludes(id), id);

  for (const id of [leakController.id, "srv-55", "room-01", "unknown"])
    assert.equal(coolingDrainIncludes(id), false, id);
});
