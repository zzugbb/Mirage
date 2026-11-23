import assert from "node:assert/strict";
import { test } from "node:test";
import { coolingRelations } from "./cooling.ts";
import {
  coolingProbeForDevice,
  coolingRackPeaks,
  compareCoolingTemperatures,
} from "./cooling-probe.ts";
import { environmentObservation } from "./environment-monitoring.ts";
import { spatialSnapshot } from "./spatial.ts";
import { environmentRounds } from "./environment-rounds.ts";
import { rackById } from "./installation.ts";

test("服务设备按本柜所在排找到登记探头，制冷柜、柜与未知对象不借用设备身份", () => {
  const probes = new Set<string>();
  for (const { target } of coolingRelations) {
    const context = coolingProbeForDevice(target)!;
    assert.ok(context.row.rackIds.includes(context.device.rackId));
    const rowName = rackById(context.device.rackId)!.name[0];
    assert.equal(context.probe.name, "环境探头 " + rowName);
    probes.add(context.probe.id);
  }
  assert.equal(probes.size, 2);
  for (const id of ["cooling-01", "rack-a01", "unknown"])
    assert.equal(coolingProbeForDevice(id), null);
});

test("进风减探头温度仅取同秒有效样本，保留零值，分开处理采样不同步和不可用", () => {
  const device = spatialSnapshot(40).readings.get("srv-55")!;
  const probe = environmentObservation("environment-02", 40)!.temperature;
  assert.equal(
    compareCoolingTemperatures(device, probe).difference?.toFixed(1),
    "4.6",
  );
  assert.equal(
    compareCoolingTemperatures(
      { ...device, temperature: 0 },
      { ...probe, value: 0 },
    ).difference,
    0,
  );
  assert.deepEqual(
    compareCoolingTemperatures({ ...device, observedAt: 41 }, probe),
    { difference: null, reason: "采样时刻不同" },
  );
  for (const quality of ["stale", "offline", "missing"] as const) {
    assert.equal(
      compareCoolingTemperatures({ ...device, quality }, probe).difference,
      null,
    );
    assert.equal(
      compareCoolingTemperatures(device, { ...probe, quality }).difference,
      null,
    );
  }
  assert.equal(
    compareCoolingTemperatures({ ...device, temperature: null }, probe)
      .difference,
    null,
  );
  assert.equal(
    compareCoolingTemperatures(device, { ...probe, observedAt: null })
      .difference,
    null,
  );
});

test("探头按登记柜排列出各柜制冷服务设备，在回看时刻重新确定最高来源与有效数", () => {
  const [a, b] = environmentRounds;
  const at40 = spatialSnapshot(40).readings;
  const at100 = spatialSnapshot(100).readings;
  for (const round of [a, b]) {
    const rows = coolingRackPeaks(round, at40);
    assert.deepEqual(
      rows.map((r) => r.rack.id),
      round.row.rackIds,
    );
    for (const { rack, device, maximum } of rows) {
      assert.equal(device?.rackId, rack.id);
      assert.equal(at40.get(device!.id)?.temperature, maximum);
    }
  }
  const storage = coolingRackPeaks(b, at40).at(-1)!;
  assert.deepEqual(
    [storage.device?.id, storage.coverage, storage.count],
    ["sto-04", 11, 12],
  );
  assert.equal(coolingRackPeaks(b, at100).at(-1)?.device?.id, "sw-15");
  assert.equal(coolingRackPeaks(a, at40)[1].device?.id, "srv-13");
  assert.equal(coolingRackPeaks(a, at100)[1].device?.id, "srv-14");
});

test("无有效进风时保留配置分母，同柜有效零值可定位，其他柜的高值不参与", () => {
  const row = environmentRounds[1],
    readings = new Map(spatialSnapshot(40).readings);
  for (const id of readings.keys())
    if (coolingProbeForDevice(id)?.device.rackId === row.racks[3].id)
      readings.delete(id);
  const empty = coolingRackPeaks(row, readings)[3];
  assert.deepEqual(
    [empty.maximum, empty.coverage, empty.count, empty.device],
    [null, 0, 12, undefined],
  );
  const original = spatialSnapshot(40).readings.get("sto-04")!;
  readings.set(original.id, { ...original, temperature: 0 });
  readings.set("sw-15", {
    ...original,
    id: "sw-15",
    temperature: 99,
    quality: "stale",
  });
  const only = coolingRackPeaks(row, readings)[3];
  assert.deepEqual(
    [only.maximum, only.coverage, only.device?.id],
    [0, 1, "sto-04"],
  );
});

test("同排八柜各自列全制冷服务输入，已计入首行与柜内最高值同源", () => {
  const at40 = spatialSnapshot(40).readings;
  for (const round of environmentRounds) {
    for (const {
      rack,
      inputs,
      device,
      coverage,
      count,
      maximum,
    } of coolingRackPeaks(round, at40)) {
      const ids = coolingRelations
        .map((r) => r.target)
        .filter((id) => coolingProbeForDevice(id)?.device.rackId === rack.id);
      assert.deepEqual(new Set(inputs.map((row) => row.id)), new Set(ids));
      assert.equal(inputs.length, count);
      assert.equal(inputs.filter((row) => row.included).length, coverage);
      assert.equal(inputs[0].value, maximum);
      assert.equal(inputs[0].id, device?.id);
    }
  }
});

test("停机、离线、未配置和过期进风分别说明；回到最后采样秒后设备重新计入", () => {
  const snapshot = (t: number) =>
    environmentRounds.flatMap((round) =>
      coolingRackPeaks(round, spatialSnapshot(t).readings),
    );
  const at60 = snapshot(60);
  const excluded = at60
    .flatMap((r) => r.inputs)
    .filter((input) => !input.included);
  const reasons = Object.fromEntries(excluded.map((i) => [i.id, i.reason]));
  assert.deepEqual(reasons, {
    "srv-25": "设备离线",
    "srv-56": "未配置观测",
    "srv-59": "数据过期",
    "srv-63": "停机 · 无进风值",
  });
  assert.ok(excluded.every((row) => row.value === null));
  const stale = excluded.find((i) => i.id === "srv-59")!;
  assert.match(stale.detail, /最后观测 44 秒 · 26\.2 °C/);
  const recovered = snapshot(44)
    .flatMap((r) => r.inputs)
    .find((i) => i.id === stale.id)!;
  assert.equal(recovered.value, 26.2);
  assert.equal(recovered.included, true);
});
