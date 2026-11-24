import assert from "node:assert/strict";
import { test } from "node:test";
import { representativeAirflowDevice } from "./airflow.ts";
import { modelForDevice, unitLabel } from "./catalog.ts";
import { outletAirflow } from "./outlet-airflow.ts";
import { pduById } from "./power-config.ts";

test("从两条出线的插座查实际对端气流，保持原机柜与格栅身份", () => {
  for (const sample of [
    {
      pdu: "pdu-a01-b",
      outlet: 3,
      feeder: "QF-02",
      device: "srv-07",
      rack: "rack-a01",
      model: "server-2u",
      units: "U3–4",
      grille: "grille-row-a-03",
    },
    {
      pdu: "pdu-b03-b",
      outlet: 9,
      feeder: "QF-14",
      device: "sto-01",
      rack: "rack-a07",
      model: "storage-4u",
      units: "U25–28",
      grille: "grille-row-b-11",
    },
  ]) {
    const result = outletAirflow(sample.pdu, sample.outlet);
    assert.ok(result);
    const { input, route } = result;
    assert.equal(pduById(input.pduId)?.sourcePort, sample.feeder);
    assert.equal(input.outlet, sample.outlet);
    assert.equal(input.inlet, "B");
    assert.equal(input.deviceId, sample.device);
    assert.equal(route.deviceId, sample.device);
    assert.equal(route.rackId, sample.rack);
    assert.equal(route.sourceId, "cooling-01");
    assert.equal(route.floorGrille.id, sample.grille);
    assert.equal(modelForDevice(route.deviceId).id, sample.model);
    assert.equal(unitLabel(route.deviceId), sample.units);
    assert.notEqual(
      representativeAirflowDevice(route.rackId)?.id,
      route.deviceId,
    );
    assert.equal(route.animated, false);
  }
});

test("空插座或无效编号没有对端气流", () => {
  assert.equal(outletAirflow("pdu-b03-b", 24), null);
  assert.equal(outletAirflow("pdu-b03-b", null), null);
  assert.equal(outletAirflow("pdu-b03-b", 0), null);
  assert.equal(outletAirflow("pdu-b03-b", 3.5), null);
  assert.equal(outletAirflow("cooling-01", 9), null);
});
