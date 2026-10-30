import { test } from "node:test";
import assert from "node:assert/strict";
import { devices, racks } from "./installation.ts";
import {
  spatialSnapshot,
  selectedReading,
  componentReading,
} from "./spatial.ts";
import { createState, transition, getPath, presentationKey } from "./domain.ts";
import { simulate } from "./simulation.ts";

test("设备有独立基线、负载和热响应，所有层级共用回放时刻且确定可重演", () => {
  const first = spatialSnapshot(60);
  assert.equal(
    new Set(devices.map((device) => simulate(0, 0, device.id).temperature))
      .size,
    5,
  );
  assert.equal(
    new Set(devices.map((device) => first.readings.get(device.id)!.power)).size,
    6,
  );
  assert.equal(
    new Set(devices.map((device) => first.readings.get(device.id)!.temperature))
      .size,
    6,
  );
  assert.equal(first.readings.get("srv-01")!.alarm, 2);
  assert.equal(first.readings.get("srv-05")!.alarm, 0);
  assert.deepEqual(spatialSnapshot(60), first);
  assert.throws(() => simulate(60, 0, "unknown-device"), /未登记/);
  for (const device of devices)
    assert.equal(first.samples.get(device.id)!.observedAt, 60);
});

test("机柜和机房温度取最高、功耗求和、告警取最高级别，覆盖率不冒充整机房实测", () => {
  const { readings } = spatialSnapshot(60);
  for (const rack of racks) {
    const children = devices
      .filter((device) => device.rackId === rack.id)
      .map((device) => readings.get(device.id)!);
    const parent = readings.get(rack.id)!;
    assert.equal(parent.count, 2);
    assert.equal(
      parent.temperature,
      Math.max(...children.map((child) => child.temperature!)),
    );
    assert.ok(
      Math.abs(
        parent.power! - children.reduce((sum, child) => sum + child.power!, 0),
      ) < 1e-8,
    );
    assert.equal(
      parent.alarm,
      Math.max(...children.map((child) => child.alarm)),
    );
    assert.equal(
      parent.alarmCount,
      children.reduce((sum, child) => sum + child.alarmCount, 0),
    );
  }
  assert.equal(readings.get("room-01")!.count, 6);
  assert.equal(readings.get("room-01")!.alarmCount, 2);
  assert.equal(spatialSnapshot(120).readings.get("room-01")!.alarmCount, 0);
  assert.equal(
    selectedReading({ ...createState(), selected: "cooling-01" }, readings),
    null,
  );
});

test("部件示意温度随设备变化，被动件零耗电、未知盘位耗电与未归因告警分开", () => {
  const sample = simulate(60);
  const lid = componentReading(sample, "srv-01", "lid-01");
  const heatSink = componentReading(sample, "srv-01", "cpu-01");
  const bay = componentReading(sample, "srv-01", "bay-01");
  assert.equal(lid.power, 0);
  assert.equal(heatSink.power, 0);
  assert.equal(bay.power, null);
  assert.ok(heatSink.temperature! > lid.temperature!);
  assert.equal(heatSink.alarm, 0);
  const snapshot = spatialSnapshot(60);
  assert.ok(
    Math.abs(
      Array.from(
        { length: 16 },
        (_, i) =>
          snapshot.readings.get(`dimm-${String(i + 1).padStart(2, "0")}`)!
            .power!,
      ).reduce((sum, value) => sum + value, 0) -
        snapshot.readings.get("memory-01")!.power!,
    ) < 1e-8,
  );
  assert.notEqual(
    spatialSnapshot(60, 0, "srv-04").readings.get("dimm-01")!.id,
    snapshot.readings.get("dimm-01")!.id,
  );
  assert.ok(
    spatialSnapshot(60, 0, "srv-04").readings.get("cpu-01")!.temperature! <
      heatSink.temperature!,
  );
});

test("跨机柜设备定位保持实例身份、时间与部件作用域，返回路径不跳回第一机柜", () => {
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
  assert.equal(state.deviceId, "srv-04");
  assert.equal(
    transition(state, { type: "navigate", level: "device" }).deviceId,
    "srv-04",
  );
});
