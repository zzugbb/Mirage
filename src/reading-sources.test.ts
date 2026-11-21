import { test } from "node:test";
import assert from "node:assert/strict";
import {
  currentMetricValue,
  readingSources,
  sourceMetrics,
  matchingSourceRows,
} from "./reading-sources.ts";
import { spatialSnapshot } from "./spatial.ts";
import { associatedInputReading, pdus, powerLinks } from "./power-config.ts";
import { coolingSummary, coolingDeviceIds } from "./cooling.ts";
import { racks, devices } from "./installation.ts";

test("整机和部件过期后仅保留旧样本，当前值与有效零值分开", () => {
  const fresh = spatialSnapshot(44, 0, "srv-59").readings;
  const stale = spatialSnapshot(45, 0, "srv-59").readings;
  for (const id of ["srv-59", "processor-01"]) {
    for (const metric of ["temperature", "power"] as const) {
      const last = currentMetricValue(fresh.get(id), metric);
      assert.ok(last !== null);
      assert.equal(stale.get(id)?.[metric], last);
      assert.equal(currentMetricValue(stale.get(id), metric), null);
    }
  }
  for (const id of ["srv-25", "srv-56"]) {
    assert.equal(currentMetricValue(stale.get(id), "power"), null);
    assert.equal(currentMetricValue(stale.get(id), "temperature"), null);
  }
  assert.equal(currentMetricValue(stale.get("srv-63"), "power"), 0);
  assert.equal(currentMetricValue(stale.get("srv-63"), "temperature"), null);
});

test("全部回看秒数下，机房、机柜和设施核对与既有汇总及覆盖一致", () => {
  for (let time = 0; time <= 120; time++) {
    const readings = spatialSnapshot(time).readings;
    for (const id of [
      "room-01",
      ...racks.map((r) => r.id),
      "power-01",
      ...pdus.map((p) => p.id),
      "cooling-01",
    ]) {
      for (const metric of sourceMetrics(id)) {
        const sources = readingSources(id, metric, readings)!;
        const cooling =
          id === "cooling-01"
            ? coolingSummary(coolingDeviceIds(id), readings)
            : null;
        const aggregate =
          readings.get(id) ?? associatedInputReading(id, readings);
        const value = cooling ? cooling.maximum : aggregate![metric];
        const coverage = cooling
          ? cooling.coverage
          : metric === "temperature"
            ? aggregate!.coverageTemperature
            : aggregate!.coveragePower;
        assert.equal(sources.coverage, coverage, `${id}/${metric}/${time}`);
        assert.equal(sources.coverage + sources.excluded, sources.count);
        if (value === null) assert.equal(sources.value, null);
        else
          assert.ok(
            Math.abs(sources.value! - value) < 1e-8,
            `${id}/${metric}/${time}`,
          );
      }
    }
  }
});

test("功耗核对按设备去重，区分有效零值、过期、离线与未配置，不使用部件推导", () => {
  const readings = spatialSnapshot(60).readings;
  assert.equal(powerLinks.length, 168);
  const sources = readingSources("power-01", "power", readings)!;
  assert.equal(sources.count, 84);
  assert.equal(new Set(sources.rows.map((r) => r.id)).size, 84);
  const stopped = sources.rows.find((r) => r.id === "srv-63")!;
  assert.equal(stopped.included, true);
  assert.equal(stopped.value, 0);
  assert.equal(stopped.reason, "有效零值");
  for (const [id, reason] of [
    ["srv-59", "数据过期"],
    ["srv-25", "设备离线"],
    ["srv-56", "未配置观测"],
  ]) {
    const row = sources.rows.find((r) => r.id === id)!;
    assert.equal(row.included, false);
    assert.equal(row.value, null);
    assert.equal(row.reason, reason);
  }
  assert.match(
    sources.rows.find((r) => r.id === "srv-59")!.detail,
    /最后观测 44 秒.*W.*未计入/,
  );
  assert.equal(
    readingSources("room-01", "temperature", readings)!.rows.find(
      (r) => r.id === "srv-63",
    )!.included,
    false,
  );
  for (const id of ["srv-01", "psu-01", "cpu-01", "leak-01", "unknown"])
    assert.deepEqual(sourceMetrics(id), []);
  assert.equal(readingSources("cooling-01", "power", readings), null);
  assert.equal(readingSources(pdus[0].id, "temperature", readings), null);
});

test("全部输入不可用时保留空缺，NaN 不计入；回看过期前重新计入", () => {
  const readings = spatialSnapshot(60).readings;
  for (const d of devices)
    readings.set(d.id, { ...readings.get(d.id)!, quality: "missing" });
  for (const metric of ["temperature", "power"] as const) {
    const empty = readingSources("room-01", metric, readings)!;
    assert.equal(empty.value, null);
    assert.equal(empty.coverage, 0);
    assert.equal(empty.excluded, 84);
  }
  readings.set("srv-01", {
    ...readings.get("srv-01")!,
    quality: "valid",
    power: NaN,
  });
  assert.equal(readingSources("room-01", "power", readings)!.value, null);
  const before = readingSources(
    "room-01",
    "power",
    spatialSnapshot(44).readings,
  )!;
  const after = readingSources(
    "room-01",
    "power",
    spatialSnapshot(45).readings,
  )!;
  assert.equal(before.coverage, after.coverage + 1);
  assert.equal(before.rows.find((r) => r.id === "srv-59")!.included, true);
});

test("输入名单按读数稳定排序，分组和机柜查询只筛选名单，不改变合计", () => {
  const sources = readingSources(
    "room-01",
    "temperature",
    spatialSnapshot(60).readings,
  )!;
  const value = sources.value;
  const included = matchingSourceRows(sources, {
    group: "included",
    query: "",
  });
  assert.equal(included[0].value, sources.value);
  assert.ok(included.every((r, i) => !i || included[i - 1].value! >= r.value!));
  assert.equal(
    matchingSourceRows(sources, { group: "excluded", query: "SRV59" })[0].id,
    "srv-59",
  );
  assert.ok(
    matchingSourceRows(sources, { group: "included", query: "A01" }).every(
      (r) => r.rack.startsWith("A01"),
    ),
  );
  assert.equal(
    matchingSourceRows(sources, { group: "included", query: "srv59" }).length,
    0,
  );
  assert.equal(sources.value, value);
});
