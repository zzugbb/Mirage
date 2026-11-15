import { test } from "node:test";
import assert from "node:assert/strict";
import { inletAirflowIncludes } from "./inlet-airflow.ts";
import { devices } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { grilleRowForRack } from "./floor-grilles.ts";
import { coolingSource } from "./cooling.ts";

test("全机房进风气流往返仅延续本设备、所属柜和既定设施端点", () => {
  for (const device of devices) {
    for (const selected of [
      device.id,
      device.rackId,
      coolingSource.id,
      grilleRowForRack(device.rackId)!.id,
    ])
      assert.equal(inletAirflowIncludes(device.id, selected, device.id), true);
    for (const selected of [
      "room-01",
      "smoke-01",
      "power-01",
      ...devices.filter((d) => d.id !== device.id).map((d) => d.id),
    ])
      assert.equal(inletAirflowIncludes(device.id, selected, device.id), false);
  }
  assert.equal(
    inletAirflowIncludes("room-01", coolingSource.id, "srv-01"),
    false,
  );
});

test("四机型模块和子件可连续检视，相同部件 ID 不串入另一台设备", () => {
  for (const modelId of new Set(devices.map((d) => d.modelId))) {
    const device = devices.find((d) => d.modelId === modelId)!;
    const other = devices.find((d) => d.id !== device.id)!;
    for (const part of [
      ...partsForDevice(device.id),
      ...subpartsForDevice(device.id),
    ]) {
      assert.equal(inletAirflowIncludes(device.id, part.id, device.id), true);
      assert.equal(inletAirflowIncludes(device.id, part.id, other.id), false);
    }
  }
});
