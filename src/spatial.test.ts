import { test } from "node:test";
import assert from "node:assert/strict";
import { devices, racks, deviceHeight, rackForDevice } from "./installation.ts";
import {
  spatialSnapshot,
  selectedReading,
  componentReading,
} from "./spatial.ts";
import { createState, transition, getPath, presentationKey } from "./domain.ts";
import { simulate } from "./simulation.ts";
import { signalFor, signalStyles } from "./status.ts";
import { deviceObservation, observedHistory } from "./device-data.ts";

test("八机柜六十四设备有独立输入、合法安装位置与可重演的共享时钟", () => {
  const first = spatialSnapshot(60);
  assert.equal(racks.length, 8);
  assert.equal(devices.length, 64);
  assert.ok(
    new Set(devices.map((device) => simulate(0, 0, device.id).temperature))
      .size > 10,
  );
  assert.ok(
    new Set(devices.map((device) => first.readings.get(device.id)!.power))
      .size > 20,
  );
  assert.deepEqual(spatialSnapshot(60), first);
  assert.throws(() => simulate(60, 0, "unknown-device"), /未登记/);
  for (const rack of racks) {
    const children = devices.filter((device) => device.rackId === rack.id);
    assert.equal(children.length, 8);
    const units = new Set<number>();
    for (const child of children) {
      for (const unit of [child.startUnit, child.startUnit + 1]) {
        assert.ok(unit >= 1 && unit <= 42);
        assert.ok(!units.has(unit));
        units.add(unit);
      }
      assert.ok(deviceHeight(child.id) > 0);
      assert.equal(rackForDevice(child.id).id, rack.id);
    }
  }
  assert.equal(first.readings.get("srv-01")!.alarm, 2);
  assert.equal(signalFor(first.readings.get("srv-05")), "normal");
});

test("汇总只计有效观测，保留零值并单独报告功耗和温度覆盖率", () => {
  const { readings } = spatialSnapshot(60);
  for (const rack of racks) {
    const children = devices
      .filter((device) => device.rackId === rack.id)
      .map((device) => readings.get(device.id)!);
    const parent = readings.get(rack.id)!;
    assert.equal(parent.count, 8);
    const thermal = children.filter(
        (child) => child.quality === "valid" && child.temperature !== null,
      ),
      power = children.filter(
        (child) => child.quality === "valid" && child.power !== null,
      );
    assert.equal(
      parent.temperature,
      Math.max(...thermal.map((child) => child.temperature!)),
    );
    assert.ok(
      Math.abs(
        parent.power! - power.reduce((sum, child) => sum + child.power!, 0),
      ) < 1e-8,
    );
    assert.equal(parent.coverageTemperature, thermal.length);
    assert.equal(parent.coveragePower, power.length);
    assert.equal(
      parent.alarm,
      Math.max(...children.map((child) => child.alarm)),
    );
  }
  const room = readings.get("room-01")!;
  assert.equal(room.count, 64);
  assert.equal(room.coveragePower, 61);
  assert.equal(room.coverageTemperature, 60);
  assert.equal(room.lifecycleCounts.offline, 1);
  assert.equal(room.lifecycleCounts.maintenance, 2);
  assert.equal(room.lifecycleCounts.stopped, 1);
  assert.equal(room.qualityCounts.stale, 1);
  assert.equal(room.qualityCounts.missing, 1);
  assert.equal(spatialSnapshot(120).readings.get("room-01")!.alarmCount, 0);
  assert.equal(
    selectedReading({ ...createState(), selected: "cooling-01" }, readings),
    null,
  );
});

test("离线、维护、未配置、过期和停机不混同为正常或零功耗", () => {
  const map = spatialSnapshot(60).readings;
  assert.equal(signalFor(map.get("srv-25")), "offline");
  assert.equal(map.get("srv-25")!.power, null);
  assert.equal(signalFor(map.get("srv-43")), "maintenance");
  assert.ok(map.get("srv-43")!.power! > 0);
  assert.equal(signalFor(map.get("srv-56")), "missing");
  assert.equal(map.get("srv-56")!.temperature, null);
  assert.equal(signalFor(map.get("srv-59")), "stale");
  assert.equal(map.get("srv-59")!.observedAt, 44);
  assert.equal(signalFor(map.get("srv-63")), "stopped");
  assert.equal(map.get("srv-63")!.power, 0);
  assert.equal(map.get("srv-63")!.coveragePower, 1);
  assert.equal(deviceObservation(60, "srv-63").energyWh, 0);
  assert.equal(deviceObservation(60, "srv-59").energyWh, null);
  assert.equal(deviceObservation(60, "srv-25").energyWh, null);
  assert.equal(
    deviceObservation(90, "srv-59").temperature,
    deviceObservation(60, "srv-59").temperature,
  );
  assert.equal(observedHistory(90, "srv-59", "power").at(-1)!.observedAt, 44);
  assert.equal(observedHistory(60, "srv-25", "power").length, 0);
  assert.ok(
    observedHistory(60, "srv-63", "power").every((point) => point.value === 0),
  );
  assert.equal(
    new Set(
      ["normal", "warning", "critical", "maintenance"].map(
        (key) => signalStyles[key as keyof typeof signalStyles].color,
      ),
    ).size,
    4,
  );
  assert.notEqual(signalStyles.offline.icon, signalStyles.missing.icon);
});

test("部件分级是明确的模型评估，不能冒充设备测点告警；未知来源不伪造部件值", () => {
  const sample = simulate(60);
  const lid = componentReading(sample, "srv-01", "lid-01"),
    heatSink = componentReading(sample, "srv-01", "cpu-01"),
    bay = componentReading(sample, "srv-01", "bay-01");
  assert.equal(lid.power, 0);
  assert.equal(heatSink.power, 0);
  assert.equal(bay.power, null);
  assert.ok(heatSink.temperature! > lid.temperature!);
  assert.equal(heatSink.alarm, 0);
  const snapshot = spatialSnapshot(60);
  assert.ok(snapshot.readings.get("dimm-07")!.evaluation > 0);
  assert.equal(snapshot.readings.get("dimm-07")!.alarm, 0);
  const watts = Array.from(
    { length: 16 },
    (_, i) =>
      snapshot.readings.get(`dimm-${String(i + 1).padStart(2, "0")}`)!.power!,
  ).reduce((sum, power) => sum + power, 0);
  assert.ok(
    Math.abs(watts - snapshot.readings.get("memory-01")!.power!) < 1e-8,
  );
  const offline = spatialSnapshot(60, 0, "srv-25").readings.get("dimm-01")!;
  assert.equal(offline.temperature, null);
  assert.equal(offline.power, null);
  assert.equal(signalFor(offline), "offline");
  assert.notEqual(
    spatialSnapshot(60, 0, "srv-04").readings.get("dimm-01")!.id,
    snapshot.readings.get("dimm-01")!.id,
  );
});

test("跨机柜设备定位保持实例、时间与部件作用域，返回路径不跳回第一机柜", () => {
  let state = transition(createState(), { type: "seek", time: 60 });
  state = transition(state, {
    type: "navigate",
    level: "rack",
    id: "rack-a02",
  });
  assert.equal(state.deviceId, "srv-03");
  assert.deepEqual(getPath(state), ["room-01", "rack-a02"]);
  const previous = presentationKey(state);
  state = transition(state, { type: "locate", id: "srv-04" });
  assert.equal(state.deviceId, "srv-04");
  assert.equal(state.time, 60);
  assert.notEqual(presentationKey(state), previous);
  state = transition(state, { type: "select", id: "dimm-07" });
  assert.deepEqual(getPath(state), [
    "room-01",
    "rack-a02",
    "srv-04",
    "dimm-07",
  ]);
  state = transition(state, { type: "back" });
  assert.equal(state.selected, "rack-a02");
  assert.equal(
    transition(state, { type: "navigate", level: "device" }).deviceId,
    "srv-04",
  );
});
