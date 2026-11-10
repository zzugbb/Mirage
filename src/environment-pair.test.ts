import { test } from "node:test";
import assert from "node:assert/strict";
import {
  environmentPair,
  environmentPairIncludes,
  environmentPairMarkers,
} from "./environment-pair.ts";
import {
  environmentComparison,
  environmentHistories,
  environmentProbe,
  type EnvironmentMetric,
} from "./environment-monitoring.ts";
import { trendGeometry } from "./trend-geometry.ts";
const pair = environmentPair("environment-01", "environment-02")!;

test("两端身份固定，预览两端保留对照，无关资源与未知点位不进入", () => {
  assert.ok(environmentPairIncludes(pair, pair.firstId));
  assert.ok(environmentPairIncludes(pair, pair.secondId));
  assert.equal(environmentPairIncludes(pair, "srv-01"), false);
  assert.equal(environmentPair(pair.firstId, pair.firstId), null);
  assert.equal(environmentPair("smoke-01", pair.secondId), null);
  assert.equal(environmentPairIncludes(null, pair.firstId), false);
});

test("双曲线沿用同一采样序列、共用刻度，仅同采样有效值可相减，反向进入反转差值", () => {
  const first = environmentHistories(pair.firstId)!,
    second = environmentHistories(pair.secondId)!;
  for (let time = 0; time <= 120; time++) {
    const rows = environmentComparison(pair.firstId, pair.secondId, time)!;
    const reversed = environmentComparison(pair.secondId, pair.firstId, time)!;
    for (const [index, row] of rows.entries()) {
      assert.equal(first[row.metric][time].value, row.left.value);
      assert.equal(second[row.metric][time].value, row.right.value);
      const eligible =
        row.left.value !== null &&
        row.right.value !== null &&
        row.left.observedAt !== null &&
        row.left.observedAt === row.right.observedAt;
      assert.equal(row.delta !== null, eligible);
      if (row.delta !== null)
        assert.ok(Math.abs(reversed[index].delta! + row.delta) < 1e-10);
      const a = trendGeometry(
        first[row.metric],
        row.metric,
        time,
        360,
        140,
        second[row.metric],
      );
      const b = trendGeometry(
        second[row.metric],
        row.metric,
        time,
        360,
        140,
        first[row.metric],
      );
      for (const v of [10, 30, 50]) assert.equal(a.y(v), b.y(v));
      const future = second[row.metric].map((p) =>
        p.time > time ? { ...p, value: 9999 } : p,
      );
      assert.deepEqual(
        trendGeometry(first[row.metric], row.metric, time, 360, 140, future)
          .ticks,
        a.ticks,
      );
    }
  }
});

test("空间双标记只沿用固定点位；缺失、过期、离线和露点不可推导不标旧读数", () => {
  for (const time of [12, 52, 60, 100, 112]) {
    for (const metric of [
      "ambientTemperature",
      "humidity",
      "dewPoint",
    ] as EnvironmentMetric[]) {
      const markers = environmentPairMarkers(pair, metric, time);
      const row = environmentComparison(
        pair.firstId,
        pair.secondId,
        time,
      )!.find((row) => row.metric === metric)!;
      for (const [index, marker] of markers.entries()) {
        assert.deepEqual(
          marker.position,
          environmentProbe(marker.id)!.fixture.position,
        );
        const reading = index ? row.right : row.left;
        assert.equal(marker.value.startsWith("—"), reading.value === null);
        assert.ok(marker.value.endsWith(reading.status));
      }
    }
  }
  assert.match(
    environmentPairMarkers(pair, "humidity", 60)[1].value,
    /— · 过期/,
  );
  assert.match(
    environmentPairMarkers(pair, "ambientTemperature", 100)[1].value,
    /— · 离线/,
  );
});
