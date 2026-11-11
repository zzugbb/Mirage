import { test } from "node:test";
import assert from "node:assert/strict";
import {
  grilleBranches,
  grilleInspectionIncludes,
} from "./grille-inspection.ts";
import { airflowSnapshot } from "./airflow.ts";
import { floorGrilleRows, floorGrilles } from "./floor-grilles.ts";
import { spatialSnapshot } from "./spatial.ts";
import { devices, racks } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { coolingSource } from "./cooling.ts";

test("两排八柜入口复用气流代表设备与格栅落点，回看不改变配置身份", () => {
  const all = floorGrilleRows.flatMap((row) => grilleBranches(row.id));
  assert.deepEqual(
    all.map((branch) => branch.rack.id),
    racks.map((rack) => rack.id),
  );
  assert.equal(all.length, 8);
  for (const { row, rack, device, grille } of all) {
    assert.equal(device.rackId, rack.id);
    assert.ok(row.rackIds.includes(rack.id));
    assert.ok(floorGrilles.includes(grille));
    for (const time of [0, 44, 60, 100, 120]) {
      const readings = spatialSnapshot(time).readings;
      const fromRack = airflowSnapshot(time, readings, rack.id).routes[0];
      const fromEntry = airflowSnapshot(
        time,
        readings,
        device.id,
        device.id,
        row.rowId,
      ).routes[0];
      assert.equal(fromRack.deviceId, device.id);
      assert.equal(fromEntry.deviceId, device.id);
      assert.equal(fromEntry.floorGrille.id, grille.id);
      assert.deepEqual(fromEntry, fromRack);
      assert.equal(fromEntry.sourceId, coolingSource.id);
    }
  }
  for (const id of ["unknown", "room-01", "rack-a01", "environment-01"])
    assert.deepEqual(grilleBranches(id), []);
});

test("无有效读数仍保留既定代表支路，不以高温或缺失重新选设备", () => {
  const branch = grilleBranches(floorGrilleRows[0].id)[0];
  const { row, device, grille } = branch;
  for (const quality of ["valid", "stale", "offline", "missing"] as const) {
    const readings = spatialSnapshot(60).readings;
    const value = readings.get(device.id)!;
    readings.set(device.id, {
      ...value,
      quality,
      temperature: quality === "valid" ? 0 : 99,
    });
    const route = airflowSnapshot(60, readings, device.id, device.id, row.rowId)
      .routes[0];
    assert.equal(route.deviceId, device.id);
    assert.equal(route.floorGrille.id, grille.id);
    if (quality !== "valid") assert.equal(route.animated, false);
    else
      assert.match(
        route.endpoints.find((endpoint) => endpoint.kind === "intake")!.label,
        /0.0 °C/,
      );
    assert.equal(grilleBranches(row.id)[0].device.id, device.id);
  }
});

test("格栅往返只延续代表设备及端点，其他设备的同名部件不混入", () => {
  for (const row of floorGrilleRows)
    for (const branch of grilleBranches(row.id)) {
      const visit = {
        rowId: row.id,
        rackId: branch.rack.id,
        deviceId: branch.device.id,
      };
      for (const id of [
        row.id,
        branch.rack.id,
        branch.device.id,
        coolingSource.id,
      ])
        assert.ok(grilleInspectionIncludes(visit, id, branch.device.id));
      for (const part of [
        ...partsForDevice(branch.device.id),
        ...subpartsForDevice(branch.device.id),
      ])
        assert.ok(grilleInspectionIncludes(visit, part.id, branch.device.id));
      const other = devices.find(
        (d) => d.rackId === branch.rack.id && d.id !== branch.device.id,
      )!;
      assert.equal(grilleInspectionIncludes(visit, other.id, other.id), false);
      for (const part of partsForDevice(other.id))
        assert.equal(grilleInspectionIncludes(visit, part.id, other.id), false);
      for (const id of [
        "room-01",
        "power-01",
        "environment-01",
        "unknown",
        ...floorGrilleRows.filter((r) => r.id !== row.id).map((r) => r.id),
      ])
        assert.equal(
          grilleInspectionIncludes(visit, id, branch.device.id),
          false,
        );
    }
});
