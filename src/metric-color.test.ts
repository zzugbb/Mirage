import { test } from "node:test";
import assert from "node:assert/strict";
import { workspaceColors } from "./workspace-colors.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  powerColor,
  temperatureColor,
  observationColor,
} from "./scene/metric-color.ts";
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
    "ee4847",
  );
  assert.equal(
    observationColor({ ...device, power: 0 }, "power").getHexString(),
    "485ca9",
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

test("温度和预算图例与场景在各色标处一致，超量程钳制到两端", () => {
  const { temperature, power } = definition.rendering.observationColors;
  const colors = workspaceColors as Record<string, string>;
  for (const [metric, stops, sample] of [
    ["temperature", temperature, (t: number) => temperatureColor(20 + t * 25)],
    ["power", power, powerColor],
  ] as const) {
    assert.deepEqual(colors[`--${metric}-ramp`].match(/#[a-f0-9]{6}/g), stops);
    stops.forEach((stop, i) =>
      assert.equal("#" + sample(i / (stops.length - 1)).getHexString(), stop),
    );
    assert.equal("#" + sample(-1).getHexString(), stops[0]);
    assert.equal("#" + sample(2).getHexString(), stops.at(-1));
  }
});

test("同一对象可同时保留告警与过期读数，各图层呈现各自语义", () => {
  const device = spatialSnapshot(60).readings.get("srv-01")!;
  const reading = { ...device, quality: "stale", alarm: 2 } as const;
  assert.equal(
    "#" + observationColor(reading, "power").getHexString(),
    signalStyles.stale.color,
  );
  assert.equal(
    "#" + observationColor(reading, "alarms").getHexString(),
    signalStyles.critical.color,
  );
});

test("设备表面与机房进风图例按各自量程标注同一色阶", () => {
  assert.equal(
    temperatureColor(50, undefined, 80).getHex(),
    temperatureColor(32.5).getHex(),
  );
  assert.notEqual(
    temperatureColor(39, undefined, 80).getHex(),
    temperatureColor(39).getHex(),
  );
});
