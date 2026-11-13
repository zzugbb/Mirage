import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coolingSource,
  coolingRelations,
  roomAirflowTarget,
  coolingDeviceIds,
  coolingSummary,
} from "./cooling.ts";
import { devices, racks } from "./installation.ts";
import { spatialSnapshot } from "./spatial.ts";
import { partsForDevice } from "./catalog.ts";
import {
  reviewCoolingHistories,
  reviewEvents,
  createReview,
  reviewTransition,
} from "./review-model.ts";
import { coolingCapacityAt } from "./simulation.ts";
import { trendGeometry } from "./trend-geometry.ts";
import { airflowSnapshot } from "./airflow.ts";
import {
  alignAirflowSlice,
  initialSliceControls,
} from "./temperature-slice.ts";
import { presentationKey } from "./domain.ts";

test("冷却服务范围使用稳定关系，84 台设备分别唯一关联到已配置单元", () => {
  assert.equal(coolingRelations.length, 84);
  assert.equal(new Set(coolingRelations.map((r) => r.id)).size, 84);
  assert.equal(new Set(coolingRelations.map((r) => r.target)).size, 84);
  assert.deepEqual(
    new Set(coolingDeviceIds(coolingSource.id)),
    new Set(devices.map((d) => d.id)),
  );
  assert.ok(
    coolingRelations.every(
      (r) => r.source === coolingSource.id && r.sourceType === "simulation",
    ),
  );
  for (const rack of racks)
    assert.deepEqual(
      new Set(coolingDeviceIds(rack.id)),
      new Set(devices.filter((d) => d.rackId === rack.id).map((d) => d.id)),
    );
  for (const modelId of ["server-1u", "server-2u", "switch-1u", "storage-4u"]) {
    const device = devices.find((d) => d.modelId === modelId)!;
    assert.deepEqual(coolingDeviceIds(device.id), [device.id]);
    assert.deepEqual(
      coolingDeviceIds(partsForDevice(device.id)[0].id, device.id),
      [device.id],
    );
  }
  assert.deepEqual(coolingDeviceIds("power-01"), []);
  assert.deepEqual(coolingDeviceIds("pdu-a01-a"), []);
  assert.deepEqual(coolingDeviceIds("unknown"), []);
});

test("关联进风只取有效有限设备值，保持去重、有效零值和数据质量边界", () => {
  const readings = spatialSnapshot(60).readings;
  const ids = coolingDeviceIds(coolingSource.id);
  const range = coolingSummary([...ids, ids[0]], readings);
  const valid = devices
    .map((d) => readings.get(d.id)!)
    .filter((r) => r.quality === "valid" && r.temperature !== null);
  assert.equal(range.count, 84);
  assert.equal(range.coverage, valid.length);
  assert.equal(range.maximum, Math.max(...valid.map((r) => r.temperature!)));
  assert.equal(range.maximum, readings.get(range.hottestId!)!.temperature);
  assert.equal(range.quality.stale, 1);
  assert.equal(range.quality.missing, 1);
  assert.equal(range.quality.offline, 1);
  assert.equal(range.lifecycle.stopped, 1);
  assert.ok(range.alarmIds.every((id) => readings.get(id)!.alarm > 0));
  const zero = new Map([
    ["zero", { ...readings.get(ids[0])!, id: "zero", temperature: 0 }],
  ]);
  assert.equal(coolingSummary(["zero"], zero).maximum, 0);
  assert.equal(coolingSummary(["absent"], zero).maximum, null);
  zero.set("zero", { ...zero.get("zero")!, temperature: Number.NaN });
  assert.equal(coolingSummary(["zero"], zero).coverage, 0);
  zero.set("zero", { ...zero.get("zero")!, temperature: 99, quality: "stale" });
  assert.equal(coolingSummary(["zero"], zero).maximum, null);
  assert.equal(
    readings.has(coolingSource.id),
    false,
    "不把关联汇总写入设施测点或房间计量",
  );
});

test("冷却输入与最高进风共用快照，恢复输入后温度仍滞后，不生成设施功耗或告警", () => {
  const history = reviewCoolingHistories();
  assert.equal(history.cooling.length, 121);
  assert.equal(history.temperature.length, 121);
  for (let t = 0; t <= 120; t++) {
    const range = coolingSummary(
      coolingDeviceIds(coolingSource.id),
      spatialSnapshot(t).readings,
    );
    assert.equal(history.cooling[t].value, Math.round(coolingCapacityAt(t)));
    assert.equal(history.temperature[t].value, range.maximum);
    assert.equal(history.temperature[t].coverage, range.coverage);
    assert.equal(history.temperature[t].count, 84);
  }
  assert.equal(history.cooling[26].value, 35);
  assert.equal(history.cooling[78].value, 100);
  assert.ok(history.temperature[78].value! > history.temperature[0].value! + 3);
  assert.ok(history.temperature[120].value! < history.temperature[78].value!);
  const events = reviewEvents(coolingDeviceIds(coolingSource.id), 120);
  assert.equal(events.filter((e) => e.kind === "input").length, 4);
  assert.ok(
    events
      .filter((e) => e.kind !== "input")
      .every(
        (e) =>
          e.entityId !== coolingSource.id &&
          devices.some((d) => d.id === e.entityId),
      ),
  );
  assert.ok(
    reviewEvents(coolingDeviceIds(coolingSource.id), 20).every(
      (e) => e.time <= 20,
    ),
  );
});

test("冷却百分比曲线固定 0–100% 并截断未来；回看仍保留断点", () => {
  const history = reviewCoolingHistories();
  const before = trendGeometry(history.cooling, "cooling", 20, 270, 100);
  assert.deepEqual(before.ticks, [0, 50, 100]);
  assert.equal(before.unit, "%");
  assert.ok(!before.path.includes(`L${before.x(26).toFixed(1)},`));
  const gaps = history.cooling.map((p) =>
    p.time === 30 ? { ...p, value: null } : p,
  );
  const chart = trendGeometry(gaps, "cooling", 60, 270, 100);
  assert.equal(chart.path.split("M").length - 1, 2);
  assert.ok(!/NaN|Infinity/.test(chart.path));
});

test("从展开设备定位制冷单元先安全归位，再进入机房，保留共享时间", () => {
  let review = createReview();
  review = {
    ...review,
    scene: {
      ...review.scene,
      level: "device",
      deviceId: "sto-01",
      selected: "sto-psu-a",
      coverOpen: true,
      explosion: 1,
      time: 78,
    },
    selectedId: "sto-psu-a",
  };
  review = reviewTransition(review, { type: "layer", layer: "environment" });
  review = reviewTransition(review, {
    type: "open-resource",
    id: coolingSource.id,
  });
  assert.equal(review.pendingId, coolingSource.id);
  assert.equal(review.scene.level, "rack");
  assert.equal(review.scene.explosion, 0);
  review = reviewTransition(review, {
    type: "navigation-ready",
    key: presentationKey(review.scene),
  });
  assert.equal(review.pendingId, null);
  assert.equal(review.scene.level, "room");
  assert.equal(review.selectedId, coolingSource.id);
  assert.equal(review.scene.time, 78);
  assert.equal(review.layer, "environment");
});

test("从 B 排展开部件查看气流，等待本实例归位，再显示所属整机的支路", () => {
  const state = createReview();
  Object.assign(state.scene, {
    level: "device",
    selected: "sto-fan-01",
    deviceId: "sto-01",
    explosion: 1,
    trayExtended: true,
    doorOpen: true,
    time: 78,
  });
  state.selectedId = state.scene.selected;
  const target = roomAirflowTarget(state.selectedId, state.scene.deviceId)!;
  assert.deepEqual(target, { id: "sto-01", rowId: "row-b" });
  const priorSlice = {
    ...initialSliceControls(),
    orientation: "vertical" as const,
    distance: 0.36,
  };
  const slice = alignAirflowSlice(priorSlice, target.rowId);
  assert.deepEqual(slice, { ...priorSlice, rowId: "row-b" });
  const returning = reviewTransition(state, {
    type: "room-airflow",
    id: state.selectedId,
  });
  assert.equal(returning.scene.level, "rack");
  assert.equal(returning.pendingId, "room-01");
  assert.equal(returning.scene.explosion, 0);
  assert.equal(
    reviewTransition(returning, {
      type: "navigation-ready",
      key: presentationKey(state.scene),
    }),
    returning,
  );
  const room = reviewTransition(returning, {
    type: "navigation-ready",
    key: presentationKey(returning.scene),
  });
  assert.equal(room.pendingId, null);
  assert.equal(room.scene.level, "room");
  assert.equal(room.selectedId, target.id);
  assert.equal(room.scene.selected, target.id);
  assert.equal(room.scene.time, 78);
  const [route] = airflowSnapshot(
    room.scene.time,
    spatialSnapshot(78).readings,
    room.selectedId,
    room.scene.deviceId,
    slice.rowId,
  ).routes;
  assert.equal(route.deviceId, target.id);
});

test("机柜及设备气流均使用显式目标，水平切片保留高度，普通预览继续遵守所选排", () => {
  const state = createReview();
  Object.assign(state.scene, {
    level: "rack",
    deviceId: "srv-33",
    selected: "rack-a05",
    time: 60,
  });
  state.selectedId = state.scene.selected;
  for (const id of ["rack-a05", "srv-33"]) {
    const room = reviewTransition(state, { type: "room-airflow", id });
    assert.equal(room.scene.level, "room");
    assert.equal(room.scene.selected, id);
    assert.equal(room.layer, "airflow");
    const target = roomAirflowTarget(id, state.scene.deviceId)!;
    const horizontal = { ...initialSliceControls(), height: 0.75 };
    assert.equal(alignAirflowSlice(horizontal, target.rowId), horizontal);
    const readings = spatialSnapshot(60).readings;
    assert.equal(
      airflowSnapshot(60, readings, id, state.scene.deviceId, target.rowId)
        .routes[0].rackId,
      "rack-a05",
    );
    assert.equal(
      airflowSnapshot(60, readings, id, state.scene.deviceId, "row-a").routes[0]
        .rackId,
      "rack-a01",
    );
  }
  for (const id of ["power-01", "sto-fan-01", "unknown"])
    assert.equal(reviewTransition(state, { type: "room-airflow", id }), state);
  const onSource = reviewTransition(state, {
    type: "room-airflow",
    id: coolingSource.id,
  });
  assert.equal(onSource.selectedId, coolingSource.id);
  assert.equal(
    roomAirflowTarget(coolingSource.id, state.scene.deviceId)?.rowId,
    null,
  );
});

test("抽出设备先收回，用户改选可取消待完成的机房气流导航", () => {
  const state = createReview();
  Object.assign(state.scene, {
    level: "rack",
    selected: "srv-33",
    deviceId: "srv-33",
    trayExtended: true,
    doorOpen: true,
    time: 86,
  });
  const pending = reviewTransition(state, {
    type: "room-airflow",
    id: "srv-33",
  });
  assert.equal(pending.pendingId, "room-01");
  assert.equal(pending.scene.level, "rack");
  assert.equal(pending.scene.trayExtended, false);
  const cancel = reviewTransition(pending, { type: "pick", id: "srv-34" });
  assert.equal(cancel.pendingId, null);
  assert.equal(
    reviewTransition(cancel, {
      type: "navigation-ready",
      key: presentationKey(pending.scene),
    }),
    cancel,
  );
  const room = reviewTransition(cancel, {
    type: "open-resource",
    id: "room-01",
  });
  assert.equal(room.selectedId, "room-01");
  assert.equal(room.scene.time, 86);
});
