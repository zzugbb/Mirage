import { test } from "node:test";
import assert from "node:assert/strict";
import { inletAssessment } from "./inlet-assessment.ts";
import { spatialSnapshot } from "./spatial.ts";

function at(time: number, id = "srv-01") {
  const { readings, samples } = spatialSnapshot(time);
  return inletAssessment(readings.get(id)!, samples.get(id)!);
}

test("进风持续条件按当前秒计时，确认后的起点来自同次越限，回看不泄露尚未发生的变化", () => {
  for (const [start, change, before, after] of [
    [30, 35, "正常", "预警"],
    [44, 49, "预警", "严重"],
    [78, 83, "严重", "预警"],
    [87, 95, "预警", "已恢复"],
  ] as const) {
    const confirmed = at(change);
    assert.equal(confirmed.status, after);
    assert.equal(confirmed.since, start);
    assert.equal(confirmed.confirmed, change);
    const pending = at(change - 1);
    assert.equal(pending.status, before);
    assert.equal(pending.confirmed, null);
    assert.equal(pending.since, start);
    assert.ok(
      pending.detail.includes(`${change - start - 1} / ${change - start} 秒`),
    );
    assert.deepEqual(at(change), confirmed);
  }
  assert.match(at(120).detail, /第 95 秒/);
});

test("过期、离线、未配置和停机设备不会从模型样本获得当前告警或持续区间", () => {
  for (const [id, status] of [
    ["srv-59", "已过期"],
    ["srv-25", "离线"],
    ["srv-56", "未配置"],
    ["srv-63", "停机"],
  ]) {
    const current = at(60, id);
    assert.equal(current.status, status);
    assert.equal(current.since, null);
    assert.equal(current.confirmed, null);
    assert.equal(current.activeBasis, null);
  }
  assert.match(at(45, "srv-59").detail, /最后观测在第 44 秒/);
  assert.notEqual(at(44, "srv-59").status, "已过期");
});

test("当前告警的确认依据与正在计时的下一次变化分别保留", () => {
  assert.equal(at(32, "srv-07").activeBasis, null);
  const warning = at(40, "srv-07");
  assert.equal(warning.status, "预警");
  assert.match(
    warning.activeBasis ?? "",
    /第 34 秒进风温度预警.*≥ 33 °C 已持续 5 秒/,
  );
  assert.match(warning.detail, /严重条件 ≥ 38 °C.*2 \/ 5 秒/);
  assert.equal(warning.since, 38);
  assert.equal(warning.confirmed, null);
  assert.equal(at(43, "srv-07").activeBasis, null);
  assert.equal(at(43, "srv-07").status, "严重");
  assert.match(at(82).activeBasis ?? "", /第 49 秒进风温度升级为严重/);
  assert.match(at(82).detail, /降级条件/);
  assert.match(at(94).activeBasis ?? "", /第 83 秒温度告警降级为预警/);
  assert.match(at(94).detail, /恢复条件/);
});
