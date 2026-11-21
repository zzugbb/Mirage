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
import { budgetPercent, budgetStateAt } from "./power-budget.ts";
import { metricAttentionColor, signalStyles } from "./status.ts";

test("侧栏读数按本对象的进风告警和预算分别强调", () => {
  const readings = spatialSnapshot(60, 0, "srv-01").readings;
  const device = readings.get("srv-01")!;
  const cpu = readings.get("processor-01")!;
  assert.equal(
    metricAttentionColor(device, "temperature"),
    signalStyles.critical.color,
  );
  assert.equal(metricAttentionColor(device, "power"), undefined);
  assert.equal(metricAttentionColor(cpu, "power"), signalStyles.critical.color);
  assert.equal(metricAttentionColor(cpu, "temperature"), undefined);
  assert.equal(
    metricAttentionColor(readings.get("rack-a01"), "temperature"),
    undefined,
  );
  const early = spatialSnapshot(4, 0, "srv-01").readings.get("processor-01");
  assert.equal(
    metricAttentionColor(early, "power"),
    signalStyles.warning.color,
  );
  for (const quality of ["missing", "stale", "offline"] as const) {
    assert.equal(
      metricAttentionColor({ ...device, quality }, "temperature"),
      undefined,
    );
    assert.equal(metricAttentionColor({ ...cpu, quality }, "power"), undefined);
  }
});

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
    "dd332e",
  );
  assert.equal(
    observationColor({ ...device, power: 0 }, "power").getHexString(),
    "295388",
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

test("功耗占比只沿蓝色提高亮度，设备列表与模型共用表面温度量程", () => {
  let previous = -1;
  for (let percent = 0; percent <= 100; percent++) {
    const { r, g, b } = powerColor(percent / 100);
    assert.ok(b > g && g > r);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    assert.ok(luminance > previous);
    previous = luminance;
  }
  const part = spatialSnapshot(43, 0, "srv-12").readings.get("processor-02")!;
  assert.equal(
    observationColor(part, "temperature", 80).getHex(),
    temperatureColor(part.temperature!, undefined, 80).getHex(),
  );
});

test("预算关注、持续超限与进风告警独立，回看及循环从模拟时刻重新判定", () => {
  const partAt = (at: number, id: string, cycle = 0) =>
    spatialSnapshot(at, cycle, id).readings.get("processor-02")!;
  const over = partAt(52, "srv-01");
  assert.deepEqual(over.budgetState, { level: "over", seconds: 52 });
  assert.equal(over.alarm, 0);
  assert.equal(
    "#" + observationColor(over, "power").getHexString(),
    signalStyles.critical.color,
  );
  assert.deepEqual(partAt(4, "srv-01").budgetState, {
    level: "near",
    seconds: 4,
  });
  assert.deepEqual(partAt(5, "srv-01").budgetState, {
    level: "over",
    seconds: 5,
  });
  assert.deepEqual(partAt(0, "srv-01", 1).budgetState, {
    level: "near",
    seconds: 0,
  });
  assert.equal(partAt(52, "srv-10").budgetState?.level, "near");
  assert.equal(partAt(52, "srv-12").budgetState, undefined);
  for (const id of ["srv-25", "srv-56", "srv-59", "srv-63"])
    assert.equal(partAt(60, id).budgetState, undefined);
});

test("预算边界、采样中断与回落按当前连续区间计算", () => {
  const samples = [
    0.899,
    0.9,
    1,
    1.1,
    null,
    1.1,
    1.1,
    1.1,
    1.1,
    1.1,
    1.1,
    1,
    0.85,
    0,
  ];
  const levels = samples.map(
    (v, t) => budgetStateAt("example", v, t, (at) => samples[at])?.level,
  );
  assert.deepEqual(levels, [
    undefined,
    "near",
    "near",
    "near",
    undefined,
    "near",
    "near",
    "near",
    "near",
    "near",
    "over",
    "near",
    undefined,
    undefined,
  ]);
});

test("整柜占比与柜内整机关注分别表达，接近满量程时保留越界方向", () => {
  const rules: Record<string, { attentionRatio: number }> =
    definition.installation.powerDistribution.budgetPolicy.overrides;
  rules["srv-01"] = { attentionRatio: 0.73 };
  try {
    const { readings } = spatialSnapshot(60);
    const rack = readings.get("rack-a01")!;
    assert.equal(rack.budgetState, undefined);
    assert.equal(rack.memberBudgetCount, 1);
    assert.equal(rack.memberBudgetLevel, "near");
    assert.equal(readings.get("srv-01")?.budgetState?.level, "near");
    assert.equal(
      spatialSnapshot(0).readings.get("rack-a01")?.memberBudgetCount,
      0,
    );
  } finally {
    delete rules["srv-01"];
  }
  assert.equal(budgetPercent(1.000833), "100.1%");
  assert.equal(budgetPercent(1.00001), ">100%");
  assert.equal(budgetPercent(0.99999), "<100%");
  assert.equal(budgetPercent(1), "100%");
});
