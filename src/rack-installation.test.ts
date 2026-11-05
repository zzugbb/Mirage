import { test } from "node:test";
import assert from "node:assert/strict";
import { rackInstallation, installationMetric } from "./rack-installation.ts";
import { devices, racks } from "./installation.ts";
import { modelForDevice } from "./catalog.ts";
import { rackBlankingUnits } from "./rack-blanking.ts";
import { spatialSnapshot } from "./spatial.ts";

test("八柜安装图逐 U 完整覆盖，设备只占一个完整跨度，后置 PDU 不侵占标准 U 位", () => {
  const seen = new Set<string>();
  for (const rack of racks) {
    const layout = rackInstallation(rack.id)!;
    const covered: number[] = [],
      blanked: number[] = [];
    let previous = layout.units + 1;
    for (const segment of layout.segments) {
      assert.equal(segment.last, previous - 1);
      previous = segment.first;
      for (let u = segment.first; u <= segment.last; u++) {
        covered.push(u);
        if (segment.kind === "blanking") blanked.push(u);
      }
      if (segment.kind === "device") {
        const d = devices.find((d) => d.id === segment.id)!;
        assert.equal(d.rackId, rack.id);
        assert.equal(segment.first, d.startUnit);
        assert.equal(
          segment.last - segment.first + 1,
          modelForDevice(d.id).units,
        );
        assert.equal(seen.has(d.id), false);
        seen.add(d.id);
      }
    }
    assert.deepEqual(
      covered.sort((a, b) => a - b),
      Array.from({ length: layout.units }, (_, i) => i + 1),
    );
    assert.deepEqual(
      blanked.sort((a, b) => a - b),
      rackBlankingUnits(rack.id),
    );
    assert.equal(layout.installedUnits + layout.blankingUnits, layout.units);
    assert.equal(layout.pdus.length, 2);
    assert.ok(
      layout.pdus.every((p) => p.rackId === rack.id && !seen.has(p.id)),
    );
  }
  assert.equal(seen.size, devices.length);
  assert.equal(rackInstallation("unknown"), null);
});

test("安装图随共享时间区分当前、过期、缺失、离线和有效零功耗", () => {
  const current = spatialSnapshot(60, 0, "srv-01").readings;
  for (const layer of ["environment", "power"] as const) {
    assert.equal(
      installationMetric(current.get("srv-59"), layer)?.text,
      "已过期",
    );
    assert.match(
      installationMetric(current.get("srv-59"), layer)!.detail,
      /44 秒.*不作为当前/,
    );
    assert.equal(
      installationMetric(current.get("srv-56"), layer)?.text,
      "未配置",
    );
    assert.equal(
      installationMetric(current.get("srv-25"), layer)?.text,
      "离线",
    );
    assert.equal(installationMetric(undefined, layer)?.text, "未配置");
  }
  assert.equal(installationMetric(current.get("srv-63"), "power")?.text, "0 W");
  assert.equal(
    installationMetric(current.get("srv-63"), "environment")?.text,
    "无进风值",
  );
  const before = spatialSnapshot(44, 0, "srv-59").readings.get("srv-59");
  const after = spatialSnapshot(45, 0, "srv-59").readings.get("srv-59");
  assert.match(installationMetric(before, "environment")!.text, /°C/);
  assert.equal(installationMetric(after, "environment")?.text, "已过期");
});

test("安装图只在告警视图呈现告警，温度与功耗沿用整机观测口径", () => {
  const reading = spatialSnapshot(60, 0, "srv-01").readings.get("srv-01")!;
  assert.equal(reading.alarm, 2);
  assert.equal(installationMetric(reading, "overview"), null);
  assert.equal(
    installationMetric(reading, "environment")?.text,
    `${reading.temperature!.toFixed(1)} °C`,
  );
  assert.equal(
    installationMetric(reading, "power")?.text,
    `${reading.power!.toFixed(0)} W`,
  );
  assert.equal(installationMetric(reading, "alarms")?.text, "◆ 严重");
  const recovered = spatialSnapshot(120, 0, "srv-01").readings.get("srv-01");
  assert.equal(installationMetric(recovered, "alarms")?.text, "正常");
});
