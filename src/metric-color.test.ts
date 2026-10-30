import { test } from "node:test";
import assert from "node:assert/strict";
import { observationColor } from "./scene/metric-color.ts";
import { spatialSnapshot } from "./spatial.ts";
import { signalStyles } from "./status.ts";

test("温度和功耗采用独立连续色阶；未知、过期和离线保持质量标记", () => {
  const readings = spatialSnapshot(60).readings;
  const device = readings.get("srv-01")!;
  assert.notEqual(
    observationColor(device, "temperature").getHexString(),
    observationColor(device, "power").getHexString(),
  );
  assert.notEqual(
    observationColor(
      { ...device, temperature: 28 },
      "temperature",
    ).getHexString(),
    observationColor(
      { ...device, temperature: 40 },
      "temperature",
    ).getHexString(),
  );
  assert.equal(
    observationColor(
      { ...device, temperature: 45 },
      "temperature",
    ).getHexString(),
    "fa3348",
  );
  assert.equal(
    observationColor({ ...device, power: 0 }, "power").getHexString(),
    "1a386e",
  );
  assert.equal(
    observationColor({ ...device, budget: null }, "power").getHexString(),
    signalStyles.missing.color.slice(1),
    "没有预算的对象不能伪装成零占比",
  );
  for (const [id, signal] of [
    ["srv-25", "offline"],
    ["srv-56", "missing"],
    ["srv-59", "stale"],
  ] as const) {
    assert.equal(
      `#${observationColor(readings.get(id)!, "temperature").getHexString()}`,
      signalStyles[signal].color,
    );
  }
});
