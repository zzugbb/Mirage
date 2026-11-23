import assert from "node:assert/strict";
import { test } from "node:test";
import { coolingRelations } from "./cooling.ts";
import {
  coolingProbeForDevice,
  compareCoolingTemperatures,
} from "./cooling-probe.ts";
import { environmentObservation } from "./environment-monitoring.ts";
import { spatialSnapshot } from "./spatial.ts";
import { rackById } from "./installation.ts";

test("服务设备按本柜所在排找到登记探头，制冷柜、柜与未知对象不借用设备身份", () => {
  const probes = new Set<string>();
  for (const { target } of coolingRelations) {
    const context = coolingProbeForDevice(target)!;
    assert.ok(context.row.rackIds.includes(context.device.rackId));
    const rowName = rackById(context.device.rackId)!.name[0];
    assert.equal(context.probe.name, "环境探头 " + rowName);
    probes.add(context.probe.id);
  }
  assert.equal(probes.size, 2);
  for (const id of ["cooling-01", "rack-a01", "unknown"])
    assert.equal(coolingProbeForDevice(id), null);
});

test("进风减探头温度仅取同秒有效样本，保留零值，分开处理采样不同步和不可用", () => {
  const device = spatialSnapshot(40).readings.get("srv-55")!;
  const probe = environmentObservation("environment-02", 40)!.temperature;
  assert.equal(
    compareCoolingTemperatures(device, probe).difference?.toFixed(1),
    "4.6",
  );
  assert.equal(
    compareCoolingTemperatures(
      { ...device, temperature: 0 },
      { ...probe, value: 0 },
    ).difference,
    0,
  );
  assert.deepEqual(
    compareCoolingTemperatures({ ...device, observedAt: 41 }, probe),
    { difference: null, reason: "采样时刻不同" },
  );
  for (const quality of ["stale", "offline", "missing"] as const) {
    assert.equal(
      compareCoolingTemperatures({ ...device, quality }, probe).difference,
      null,
    );
    assert.equal(
      compareCoolingTemperatures(device, { ...probe, quality }).difference,
      null,
    );
  }
  assert.equal(
    compareCoolingTemperatures({ ...device, temperature: null }, probe)
      .difference,
    null,
  );
  assert.equal(
    compareCoolingTemperatures(device, { ...probe, observedAt: null })
      .difference,
    null,
  );
});
