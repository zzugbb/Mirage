import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dewPoint,
  environmentProcess,
  environmentDewPoint,
  environmentHistories,
  environmentObservation,
  environmentProbes,
  environmentSettings,
  environmentValue,
} from "./environment-monitoring.ts";
import type { EnvironmentChannel } from "./environment-monitoring.ts";
import { findResources } from "./review-resources.ts";
import { createReview } from "./review-model.ts";
import { fixtureById } from "./fixtures.ts";
import { spatialSnapshot } from "./spatial.ts";
import { trendGeometry } from "./trend-geometry.ts";

const observation = (time: number) =>
  environmentObservation("environment-02", time)!;

test("两处演示测点绑定现有固定探头，未接入真实数据，不混入设备进风汇总", () => {
  assert.equal(environmentSettings.source, "deterministic-demo");
  assert.equal(environmentProbes.length, 2);
  assert.equal(new Set(environmentProbes.map((p) => p.fixtureId)).size, 2);
  for (const probe of environmentProbes) {
    assert.equal(fixtureById(probe.fixtureId)?.kind, "environment");
    assert.equal(probe.fixture.dataStatus, "not-connected");
    assert.match(
      findResources(createReview().scene, probe.fixtureId, "all")[0].detail,
      /温湿度模拟/,
    );
    for (const metric of ["temperature", "humidity"] as const) {
      assert.equal(probe[metric][0][0], 0);
      assert.equal(probe[metric].at(-1)![0], 120);
      assert.ok(
        probe[metric].every(
          ([t, v], i, a) => Number.isFinite(v) && (!i || t > a[i - 1][0]),
        ),
      );
    }
    assert.equal(spatialSnapshot(60).readings.has(probe.fixtureId), false);
  }
  assert.equal(spatialSnapshot(60).readings.get("room-01")!.count, 84);
  assert.equal(environmentObservation("smoke-01", 60), null);
  assert.equal(environmentHistories("room-01"), null);
});

test("四秒采样保持读数，重播确定且时间限制在共享演示范围", () => {
  const a = environmentObservation("environment-01", 60)!;
  assert.equal(a.temperature.value, 25.8);
  assert.equal(a.humidity.value, 42);
  assert.deepEqual(
    environmentObservation("environment-01", 63)!.temperature,
    a.temperature,
  );
  assert.deepEqual(environmentObservation("environment-01", 60), a);
  assert.deepEqual(observation(-10), observation(0));
  assert.deepEqual(observation(NaN), observation(0));
  assert.deepEqual(observation(200), observation(120));
  assert.equal(observation(61.9).time, 61);
});

test("首段缺失、断采保鲜、过期与恢复逐通道判断，过期只保留最后观测", () => {
  assert.equal(observation(15).humidity.quality, "missing");
  assert.equal(observation(15).humidity.observedAt, null);
  assert.equal(observation(16).humidity.quality, "valid");
  assert.equal(observation(56).humidity.quality, "valid");
  assert.equal(observation(56).humidity.observedAt, 48);
  assert.equal(observation(57).temperature.quality, "valid");
  for (const t of [57, 60, 75]) {
    const h = observation(t).humidity;
    assert.equal(h.quality, "stale");
    assert.equal(h.value, null);
    assert.equal(h.observedAt, 48);
    assert.equal(h.lastValue, observation(48).humidity.value);
    assert.equal(observation(t).dewPoint.value, null);
  }
  assert.equal(observation(76).humidity.quality, "valid");
  assert.equal(observation(76).humidity.observedAt, 76);
  assert.ok(observation(76).dewPoint.value !== null);
});

test("离线优先于保鲜，温湿度均无当前值，恢复重新采样", () => {
  assert.equal(observation(95).temperature.quality, "valid");
  for (const t of [96, 100, 111]) {
    for (const metric of ["temperature", "humidity"] as const) {
      const c = observation(t)[metric];
      assert.equal(c.quality, "offline");
      assert.equal(c.value, null);
      assert.equal(c.observedAt, 92);
      assert.equal(c.lastValue, observation(92)[metric].value);
    }
    assert.equal(observation(t).dewPoint.value, null);
  }
  assert.equal(observation(112).temperature.quality, "valid");
  assert.equal(observation(112).humidity.observedAt, 112);
});

test("露点为水面 Magnus 反解，饱和时等于温度，零湿度与霜点范围不推导", () => {
  assert.ok(Math.abs(dewPoint(25, 50)! - 13.8516) < 0.001);
  assert.ok(Math.abs(dewPoint(20, 60)! - 11.9955) < 0.001);
  for (const t of [0, 20, 60])
    assert.ok(Math.abs(dewPoint(t, 100)! - t) < 1e-10);
  for (const [t, h] of [
    [25, 0],
    [25, -1],
    [25, 101],
    [-1, 50],
    [61, 50],
    [NaN, 50],
    [20, Infinity],
    [0, 50],
  ])
    assert.equal(dewPoint(t, h), null);
  assert.equal(environmentValue(0, "%RH"), "0.0 %RH");
  assert.equal(environmentValue(null, "%RH"), "—");
});

test("两路有效但采样不同步也不推导；推导不把无效输入当成零", () => {
  assert.equal(observation(52).temperature.quality, "valid");
  assert.equal(observation(52).humidity.quality, "valid");
  assert.equal(observation(52).dewPoint.value, null);
  assert.match(observation(52).dewPoint.reason, /不同步/);
  const c: EnvironmentChannel = {
    quality: "valid",
    value: 25,
    lastValue: 25,
    observedAt: 4,
  };
  for (const quality of ["missing", "stale", "offline"] as const) {
    assert.equal(environmentDewPoint({ ...c, quality }, c).value, null);
    assert.equal(environmentDewPoint(c, { ...c, quality }).value, null);
  }
  assert.equal(environmentDewPoint(c, { ...c, value: 0 }).value, null);
  assert.equal(environmentDewPoint(c, { ...c, value: null }).value, null);
});

test("环境历史与逐秒观测一致，三条曲线保留各自空缺，未来不绘制", () => {
  const history = environmentHistories("environment-02")!;
  for (let time = 0; time <= 120; time++) {
    const reading = observation(time);
    assert.equal(
      history.ambientTemperature[time].value,
      reading.temperature.value,
    );
    assert.equal(history.humidity[time].value, reading.humidity.value);
    assert.equal(history.dewPoint[time].value, reading.dewPoint.value);
  }
  const humidity = trendGeometry(history.humidity, "humidity", 120, 280, 82);
  assert.equal(humidity.unit, "%RH");
  assert.deepEqual(humidity.ticks, [0, 50, 100]);
  assert.equal(humidity.path.split("M").length - 1, 3);
  for (const metric of ["ambientTemperature", "dewPoint"] as const) {
    const chart = trendGeometry(history[metric], metric, 60, 280, 82);
    assert.equal(chart.unit, "°C");
    assert.equal(
      chart.path,
      trendGeometry(history[metric].slice(0, 61), metric, 60, 280, 82).path,
    );
    assert.ok(!/NaN|Infinity/.test(chart.path));
  }
  assert.equal(
    trendGeometry(history.humidity, "humidity", 15, 280, 82).empty,
    true,
  );
});

test("数据过程逐时刻合并变化，不把正常采样变成事件，保鲜后失效与恢复分开", () => {
  const events = environmentProcess("environment-02", 120);
  assert.deepEqual(
    events.map((e) => e.time),
    [0, 16, 52, 57, 76, 96, 112],
  );
  assert.deepEqual(events.find((e) => e.time === 52)!.changes, [
    { metric: "dewPoint", before: "derived", after: "unsynchronized" },
  ]);
  assert.deepEqual(
    events.find((e) => e.time === 57)!.changes.map((c) => [c.metric, c.after]),
    [
      ["humidity", "stale"],
      ["dewPoint", "unavailable"],
    ],
  );
  assert.equal(events.find((e) => e.time === 96)!.changes.length, 3);
  assert.deepEqual(
    events.at(-1)!.changes.map((c) => c.after),
    ["valid", "valid", "derived"],
  );
  assert.equal(environmentProcess("environment-01", 120).length, 1);
});

test("过程回看不泄露未来恢复，初始状态不伪装成变化，重播确定", () => {
  const all = environmentProcess("environment-02", 120);
  for (let time = 0; time <= 120; time++) {
    assert.deepEqual(
      environmentProcess("environment-02", time),
      all.filter((event) => event.time <= time),
    );
  }
  assert.ok(all[0].changes.every((change) => change.before === null));
  assert.deepEqual(environmentProcess("environment-02", -1), [all[0]]);
  assert.deepEqual(environmentProcess("environment-02", NaN), [all[0]]);
  assert.deepEqual(environmentProcess("unknown", 120), []);
});
