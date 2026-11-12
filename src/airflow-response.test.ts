import { test } from "node:test";
import assert from "node:assert/strict";
import {
  airflowResponseTarget,
  airflowResponseHistory,
  airflowResponseEvents,
  airflowResponseContext,
} from "./airflow-response.ts";
import { airflowSnapshot } from "./airflow.ts";
import { airflowInspectionContext } from "./airflow-inspection.ts";
import { spatialSnapshot } from "./spatial.ts";
import { devices } from "./installation.ts";
import { coolingCapacityAt, simulate } from "./simulation.ts";
import { createState } from "./domain.ts";
import { initialSliceControls } from "./temperature-slice.ts";
const routeFor = (id: string) =>
  airflowSnapshot(60, spatialSnapshot(60).readings, id).routes[0];

test("气流对照固定八柜全部设备的显式两端，拒绝伪造关系和部件", () => {
  for (const device of devices) {
    const route = routeFor(device.id);
    assert.ok(route);
    assert.deepEqual(airflowResponseTarget(route), {
      id: route.id,
      sourceId: route.sourceId,
      deviceId: device.id,
    });
    assert.equal(airflowResponseTarget({ ...route, id: "missing" }), null);
    assert.equal(
      airflowResponseTarget({ ...route, sourceId: "power-01" }),
      null,
    );
    assert.equal(
      airflowResponseTarget({ ...route, deviceId: "memory-01" }),
      null,
    );
    assert.equal(
      airflowResponseTarget({
        ...route,
        deviceId: device.id === "srv-01" ? "srv-02" : "srv-01",
      }),
      null,
    );
  }
});

test("四机型对照使用本支路整机进风及独立冷却输入，不采用最高值或部件推导", () => {
  for (const model of ["server-1u", "server-2u", "switch-1u", "storage-4u"]) {
    const id = devices.find(
      (d) => d.modelId === model && d.telemetry === "valid",
    )!.id;
    const history = airflowResponseHistory(routeFor(id))!;
    assert.equal(history.temperature.length, 121);
    for (const time of [0, 20, 44, 45, 60, 75, 90, 120]) {
      const point = history.temperature[time],
        reading = spatialSnapshot(time).readings.get(id)!;
      assert.equal(point.value, reading.temperature);
      assert.equal(point.count, 1);
      assert.equal(point.peakSources, undefined);
      assert.equal(
        history.cooling[time].value,
        Math.round(coolingCapacityAt(time)),
      );
      assert.equal(history.cooling[time].quality, "valid");
    }
  }
  assert.equal(
    airflowResponseHistory({ ...routeFor("srv-01"), deviceId: "unknown" }),
    null,
  );
});

test("过期断线、离线、未配置、停机分开；有效维护进风保留，输入不随设备质量消失", () => {
  for (const id of ["srv-25", "srv-56", "srv-59", "srv-63", "srv-43"]) {
    const history = airflowResponseHistory(routeFor(id))!;
    for (let time = 0; time <= 120; time++) {
      const r = spatialSnapshot(time).readings.get(id)!;
      assert.equal(history.temperature[time].quality, r.quality);
      assert.equal(
        history.temperature[time].value,
        r.quality === "valid" ? r.temperature : null,
      );
      assert.equal(
        history.cooling[time].value,
        Math.round(coolingCapacityAt(time)),
      );
    }
    if (id === "srv-59") {
      assert.notEqual(history.temperature[44].value, null);
      assert.equal(history.temperature[45].value, null);
    }
  }
});

test("输入事件独立回看，设备过期后不编造新设备事件，所有事件不超前且不重复", () => {
  for (const id of ["srv-01", "srv-25", "srv-56", "srv-59", "srv-63"]) {
    const target = routeFor(id);
    for (const time of [0, 20, 44, 45, 60, 75, 90, 120]) {
      const events = airflowResponseEvents(target, time, 2);
      assert.deepEqual(
        events
          .filter((e) => e.kind === "input")
          .map((e) => e.time)
          .sort((a, b) => a - b),
        simulate(time, 2, id)
          .events.filter((e) => e.kind === "input")
          .map((e) => e.time),
      );
      assert.ok(events.every((e) => e.time <= time));
      assert.equal(new Set(events.map((e) => e.id)).size, events.length);
      assert.ok(
        events.every((e) =>
          e.kind === "input"
            ? e.entityId === target.sourceId
            : e.entityId === id,
        ),
      );
      if (id === "srv-59")
        assert.ok(
          events.filter((e) => e.kind !== "input").every((e) => e.time <= 44),
        );
      if (["srv-25", "srv-56", "srv-63"].includes(id))
        assert.ok(events.every((e) => e.kind === "input"));
    }
  }
});

test("回看不改变对照会话，切片、主动定位、对象或固定画面变化结束旧会话", () => {
  const state = createState();
  const key = (
    s = state,
    selected = "room-01",
    slice = initialSliceControls(),
    revision = 0,
  ) =>
    airflowResponseContext(
      airflowInspectionContext(s, "environment", slice, revision),
      selected,
    );
  assert.equal(key(), key({ ...state, time: 89, playing: true }));
  assert.notEqual(key(), key({ ...state, focusRevision: 1 }));
  assert.equal(key(), key({ ...state, replayCycle: 1 }));
  assert.notEqual(key(), key(state, "srv-01"));
  assert.notEqual(
    key(),
    key(state, "room-01", {
      ...initialSliceControls(),
      orientation: "vertical",
    }),
  );
  assert.notEqual(key(), key(state, "room-01", initialSliceControls(), 1));
});
