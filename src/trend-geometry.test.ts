import { test } from "node:test";
import assert from "node:assert/strict";
import {
  trendGeometry,
  trendLeft,
  trendRight,
  trendTimeAtX,
} from "./trend-geometry.ts";
import {
  reviewHistories,
  reviewEvents,
  eventsBySource,
} from "./review-model.ts";
import type { ReviewPoint } from "./review-model.ts";
import { spatialSnapshot } from "./spatial.ts";
import { devices } from "./installation.ts";

test("温度与功耗使用同一时间快照，保留缺失、过期、有效零值及有效覆盖", () => {
  for (const id of [
    "room-01",
    "rack-a01",
    "srv-01",
    "srv-59",
    "srv-63",
    "memory-01",
    "cooling-01",
  ]) {
    const history = reviewHistories(id, "srv-01");
    assert.equal(history.temperature.length, 121);
    assert.equal(history.power.length, 121);
    for (const time of [0, 44, 45, 60, 120]) {
      const reading = spatialSnapshot(time).readings.get(id);
      for (const metric of ["temperature", "power"] as const) {
        const point = history[metric][time];
        assert.equal(point.time, time);
        assert.equal(point.quality, reading?.quality ?? "missing");
        assert.equal(
          point.value,
          reading?.quality === "valid" ? reading[metric] : null,
        );
        assert.equal(
          point.coverage,
          reading
            ? metric === "temperature"
              ? reading.coverageTemperature
              : reading.coveragePower
            : 0,
        );
      }
    }
  }
  assert.equal(reviewHistories("srv-63", "srv-63").power[60].value, 0);
  assert.equal(reviewHistories("srv-59", "srv-59").power[45].value, null);
});

test("曲线在缺失处断开，未来数据不绘制、不影响量程和单位；零功耗仍有曲线", () => {
  const point = (time: number, value: number | null): ReviewPoint => ({
    time,
    value,
    coverage: value === null ? 0 : 1,
    count: 1,
    quality: value === null ? "missing" : "valid",
  });
  const series = [
    point(0, 10),
    point(1, null),
    point(2, 12),
    point(120, 20000),
  ];
  const chart = trendGeometry(series, "power", 2, 500, 82);
  assert.equal(chart.path.split("M").length - 1, 2);
  assert.ok(!chart.path.includes("L"));
  assert.ok(chart.ticks[2] < 100);
  assert.equal(chart.unit, "W");
  assert.ok(!/NaN|Infinity/.test(chart.path));
  assert.equal(trendGeometry(series, "power", 120, 500, 82).unit, "kW");
  const zero = trendGeometry([point(0, 0), point(1, 0)], "power", 1, 220, 82);
  assert.equal(zero.empty, false);
  assert.ok(zero.path.includes("L"));
  assert.equal(
    new Set(zero.ticks.map(zero.text)).size,
    3,
    "零功耗量程的刻度不能因取整而重复",
  );
  assert.ok(!/NaN|Infinity/.test(zero.path));
  const missing = trendGeometry([point(0, null)], "temperature", 0, 220, 82);
  assert.equal(missing.empty, true);
  assert.equal(missing.path, "");
});

test("桌面与窄屏的曲线坐标都映射到同一秒，不受外侧坐标轴区域干扰", () => {
  for (const width of [220, 358, 740]) {
    assert.equal(trendTimeAtX(trendLeft, width), 0);
    assert.equal(trendTimeAtX((trendLeft + width - trendRight) / 2, width), 60);
    assert.equal(trendTimeAtX(width - trendRight, width), 120);
    assert.equal(trendTimeAtX(-50, width), 0);
    assert.equal(trendTimeAtX(width + 50, width), 120);
  }
});

test("公共输入只显示一次，设备告警独立；过期保留已知事件，不提前显示未来或离线事件", () => {
  const ids = devices.map((d) => d.id),
    all = reviewEvents(ids, 120);
  assert.equal(all.filter((e) => e.kind === "input").length, 4);
  assert.ok(
    all
      .filter((e) => e.kind !== "input")
      .every((e) => e.deviceIds.length === 1),
  );
  assert.deepEqual(reviewEvents(["srv-01"], 19), []);
  assert.equal(reviewEvents(["srv-01"], 20).length, 1);
  const early = reviewEvents(["srv-01"], 40);
  assert.ok(early.every((e) => e.time <= 40));
  assert.ok(!early.some((e) => e.kind === "recovered"));
  assert.deepEqual(reviewEvents(["srv-25"], 120), []);
  assert.deepEqual(reviewEvents(["srv-59"], 90), reviewEvents(["srv-59"], 44));
  assert.ok(reviewEvents(["srv-63"], 120).every((e) => e.kind === "input"));
  assert.ok(
    all.filter((e) => e.kind === "input").every((e) => e.deviceIds.length > 1),
  );
});

test("告警过程按实体分组，逐组从发生到恢复，公共输入不归到设备", () => {
  const rack = devices.filter((d) => d.rackId === "rack-a01").map((d) => d.id);
  for (const time of [0, 20, 35, 49, 60, 95, 120]) {
    const events = reviewEvents(rack, time);
    const groups = eventsBySource(events);
    assert.deepEqual(
      groups.map((g) => g.source),
      [...new Set(events.map((e) => e.entityId))],
    );
    for (const { source, history } of groups) {
      assert.deepEqual(
        history,
        events.filter((e) => e.entityId === source).reverse(),
      );
      assert.ok(
        history.every(
          (e) => (e.kind === "input") === (source === "cooling-01"),
        ),
      );
    }
  }
  const history = eventsBySource(reviewEvents(rack, 95)).find(
    (g) => g.source === "srv-01",
  )!.history;
  assert.deepEqual(
    history.map((e) => e.kind),
    ["raised", "escalated", "downgraded", "recovered"],
  );
});
