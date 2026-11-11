import { test } from "node:test";
import assert from "node:assert/strict";
import { environmentComparability } from "./environment-comparability.ts";
import { environmentComparison } from "./environment-monitoring.ts";
const pair = { firstId: "environment-01", secondId: "environment-02" };
test("三指标可比区间逐秒覆盖已知记录，条件与原始双点判断完全一致", () => {
  for (const metric of ["ambientTemperature", "humidity", "dewPoint"] as const)
    for (const time of [0, 12, 52, 56, 57, 60, 100, 112, 120]) {
      const rows = environmentComparability(pair, metric, time);
      assert.equal(rows[0].start, 0);
      assert.equal(rows.at(-1)!.end, time);
      for (const [index, row] of rows.entries()) {
        if (index) assert.equal(row.start, rows[index - 1].end + 1);
        for (let at = row.start; at <= row.end; at++) {
          const expected = environmentComparison(
            pair.firstId,
            pair.secondId,
            at,
          )!.find((r) => r.metric === metric)!;
          assert.equal(row.comparable, expected.delta !== null);
          assert.equal(row.reason, expected.reason);
          assert.equal(row.firstStatus, expected.left.status);
          assert.equal(row.secondStatus, expected.right.status);
        }
      }
    }
});
test("不同步、缺失、过期、离线及恢复分别保留，数值和正常采样变化不切段", () => {
  const rows = environmentComparability(pair, "humidity", 120);
  for (const status of ["缺失", "过期", "离线", "有效"])
    assert.ok(rows.some((r) => r.secondStatus === status));
  assert.ok(rows.some((r) => r.reason === "两侧采样不同步"));
  const temperature = environmentComparability(pair, "ambientTemperature", 60);
  assert.deepEqual(
    temperature.map((r) => [r.start, r.end, r.comparable]),
    [[0, 60, true]],
  );
  assert.ok(
    environmentComparability(pair, "dewPoint", 60).some(
      (r) => r.secondStatus === "不可推导",
    ),
  );
});
test("回看基准不补未来区间，异常时间边界归一，非探头与同点不可生成过程", () => {
  const past = environmentComparability(pair, "humidity", 60);
  const snapshot = structuredClone(past);
  environmentComparability(pair, "humidity", 120);
  assert.deepEqual(past, snapshot);
  assert.equal(past.at(-1)!.end, 60);
  for (const time of [-1, NaN, Infinity])
    assert.equal(
      environmentComparability(pair, "humidity", time).at(-1)!.end,
      0,
    );
  assert.equal(
    environmentComparability(pair, "humidity", 500).at(-1)!.end,
    120,
  );
  assert.equal(
    environmentComparability(pair, "humidity", 52.8).at(-1)!.end,
    52,
  );
  for (const secondId of [pair.firstId, "srv-01", "unknown"])
    assert.deepEqual(
      environmentComparability({ ...pair, secondId }, "humidity", 60),
      [],
    );
});
test("反向起点仅交换两侧身份，不改变可比区间", () => {
  for (const metric of [
    "ambientTemperature",
    "humidity",
    "dewPoint",
  ] as const) {
    const a = environmentComparability(pair, metric, 120),
      b = environmentComparability(
        { firstId: pair.secondId, secondId: pair.firstId },
        metric,
        120,
      );
    assert.deepEqual(
      a.map((r) => ({
        ...r,
        firstStatus: r.secondStatus,
        secondStatus: r.firstStatus,
      })),
      b,
    );
  }
});
