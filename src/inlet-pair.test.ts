import { test } from "node:test";
import assert from "node:assert/strict";
import { inletHistory, inletPairSnapshot } from "./inlet-pair.ts";
import { spatialSnapshot } from "./spatial.ts";
import { trendGeometry } from "./trend-geometry.ts";

test("双设备对照只接受两台不同整机，差值方向为所查减基准", () => {
  for (const ids of [
    ["srv-01", "srv-01"],
    ["cpu-01", "srv-02"],
    ["room-01", "srv-02"],
    ["srv-01", "unknown"],
  ])
    assert.equal(inletPairSnapshot(ids[0], ids[1], 60), null);
  const pair = inletPairSnapshot("srv-01", "srv-02", 60)!;
  const readings = spatialSnapshot(60).readings;
  assert.equal(pair.first.value, readings.get("srv-01")!.temperature);
  assert.equal(pair.second.value, readings.get("srv-02")!.temperature);
  assert.equal(
    pair.difference,
    Math.round((pair.first.value! - pair.second.value!) * 10) / 10,
  );
  assert.equal(
    inletPairSnapshot("srv-02", "srv-01", 60)!.difference,
    -pair.difference!,
  );
});

test("过期、离线、缺失与停机不计算差值，过期旧值只作最后观测", () => {
  for (const [id, reason] of [
    ["srv-59", "数据过期"],
    ["srv-25", "设备离线"],
    ["srv-56", "未配置观测"],
    ["srv-63", "停机 · 无进风值"],
  ]) {
    const pair = inletPairSnapshot("srv-01", id, 60)!;
    assert.equal(pair.second.value, null);
    assert.equal(pair.second.reason, reason);
    assert.equal(pair.difference, null);
  }
  assert.equal(
    inletPairSnapshot("srv-01", "srv-59", 60)!.second.observedAt,
    44,
  );
  assert.notEqual(inletPairSnapshot("srv-01", "srv-59", 44)!.difference, null);
});

test("整机进风历史与共享快照一致，保留失效后的断线，不混入部件温度", () => {
  for (const id of [
    "srv-01",
    "srv-59",
    "srv-25",
    "srv-56",
    "srv-63",
    "sto-01",
    "sw-01",
  ]) {
    const series = inletHistory(id);
    assert.equal(series.length, 121);
    for (const time of [0, 44, 45, 60, 120]) {
      const reading = spatialSnapshot(time).readings.get(id)!;
      assert.equal(
        series[time].value,
        reading.quality === "valid" ? reading.temperature : null,
      );
      assert.equal(series[time].quality, reading.quality);
    }
  }
});

test("双曲线共用已发生观测的量程，未来极值不提前扩大量程，无效点断线", () => {
  const first = inletHistory("srv-01"),
    second = inletHistory("srv-59");
  const a = trendGeometry(first, "temperature", 60, 360, 120, second);
  const b = trendGeometry(second, "temperature", 60, 360, 120, first);
  assert.deepEqual(a.ticks, b.ticks);
  assert.equal(a.y(35), b.y(35));
  second[120] = { ...second[120], value: 1000, quality: "valid" };
  assert.deepEqual(
    trendGeometry(first, "temperature", 60, 360, 120, second).ticks,
    a.ticks,
  );
  assert.ok(
    trendGeometry(first, "temperature", 120, 360, 120, second).ticks[2] > 1000,
  );
  assert.ok(!b.path.includes(`L${b.x(45).toFixed(1)},`));
});

test("共用量程保留有效零值，忽略过期旧值与非有限值，两侧全缺时为空", () => {
  const base = {
    time: 0,
    coverage: 1,
    count: 1,
    quality: "valid" as const,
    value: 0,
  };
  const series = [
    base,
    { ...base, time: 1, value: NaN },
    { ...base, time: 2, value: 10 },
  ];
  const reference = [
    { ...base, time: 0, quality: "stale" as const, value: 900 },
  ];
  const chart = trendGeometry(series, "temperature", 2, 360, 140, reference);
  assert.equal(chart.empty, false);
  assert.equal(chart.path.split("M").length - 1, 2);
  assert.ok(chart.ticks[2] < 100);
  assert.ok(!/NaN|Infinity/.test(chart.path));
  assert.equal(
    trendGeometry(reference, "temperature", 2, 360, 140, []).empty,
    true,
  );
});
