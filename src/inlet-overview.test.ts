import { test } from "node:test";
import assert from "node:assert/strict";
import { inletOverview } from "./inlet-overview.ts";
import { spatialSnapshot } from "./spatial.ts";
import { devices } from "./installation.ts";
import { modelForDevice } from "./catalog.ts";

test("八柜进风剖面按完整 U 位排列，每台整机只计一次，不含部件推导", () => {
  const readings = spatialSnapshot(60).readings;
  const room = inletOverview(readings);
  assert.equal(room.length, 8);
  const rows = room.flatMap((r) => r.rows);
  assert.equal(rows.length, 84);
  assert.equal(new Set(rows.map((r) => r.id)).size, 84);
  for (const rack of room) {
    assert.equal(
      rack.coverage,
      readings.get(rack.rack.id)!.coverageTemperature,
    );
    assert.equal(rack.maximum, readings.get(rack.rack.id)!.temperature);
    for (let i = 0; i < rack.rows.length; i++) {
      const row = rack.rows[i];
      const device = devices.find((d) => d.id === row.id)!;
      assert.equal(row.first, device.startUnit);
      assert.equal(row.last - row.first + 1, modelForDevice(row.id).units);
      if (i) assert.ok(rack.rows[i - 1].first > row.last);
    }
  }
});

test("查找仅筛选逐台名单，八柜分布、覆盖和最高值保留完整范围", () => {
  const readings = spatialSnapshot(60).readings;
  const room = inletOverview(readings, " b03 STO-01 ");
  assert.deepEqual(
    room.flatMap((r) => r.matching.map((d) => d.id)),
    ["sto-01"],
  );
  assert.deepEqual(
    room.map(({ matching, ...r }) => r),
    inletOverview(readings).map(({ matching, ...r }) => r),
  );
  assert.equal(
    inletOverview(readings, "不存在").flatMap((r) => r.matching).length,
    0,
  );
});

test("无效读数分开解释，过期旧值不参与色阶或最高值，有效零值保留", () => {
  const readings = spatialSnapshot(60).readings;
  const baseline = readings.get("srv-01")!;
  for (const [quality, lifecycle, value, reason] of [
    ["stale", "running", 99, "数据过期"],
    ["offline", "offline", null, "设备离线"],
    ["missing", "running", null, "未配置观测"],
    ["valid", "stopped", null, "停机 · 无进风值"],
    ["valid", "running", NaN, "无有效进风值"],
  ] as const) {
    readings.set("srv-01", {
      ...baseline,
      quality,
      lifecycle,
      temperature: value,
    });
    const row = inletOverview(readings)[0].rows.find((r) => r.id === "srv-01")!;
    assert.equal(row.value, null);
    assert.equal(row.reason, reason);
    assert.notEqual(inletOverview(readings)[0].maximum, 99);
  }
  readings.set("srv-01", { ...baseline, temperature: 0 });
  assert.equal(
    inletOverview(readings)[0].rows.find((r) => r.id === "srv-01")!.value,
    0,
  );
});

test("回看改变当前读数与质量，不改变安装分布；没有读数时保持未知", () => {
  const before = inletOverview(spatialSnapshot(30).readings);
  const after = inletOverview(spatialSnapshot(60).readings);
  assert.deepEqual(
    before.map((r) => r.rows.map((d) => [d.id, d.first, d.last])),
    after.map((r) => r.rows.map((d) => [d.id, d.first, d.last])),
  );
  assert.ok(before.some((r, i) => r.maximum !== after[i].maximum));
  const empty = inletOverview(new Map());
  assert.ok(
    empty.every(
      (r) =>
        r.maximum === null &&
        r.coverage === 0 &&
        r.rows.every((d) => d.value === null),
    ),
  );
});

test("从机房对照进入四种整机，展开后经就绪信号归位返回且保留回看秒数", async () => {
  const { createReview, reviewTransition } = await import("./review-model.ts");
  const { presentationKey } = await import("./domain.ts");
  for (const modelId of new Set(devices.map((d) => d.modelId))) {
    const device = devices.find((d) => d.modelId === modelId)!;
    let state = createReview();
    state = reviewTransition(state, {
      type: "scene",
      action: { type: "navigate", level: "device", id: device.id },
    });
    assert.equal(state.scene.level, "device");
    assert.equal(state.selectedId, device.id);
    state = reviewTransition(state, {
      type: "scene",
      action: { type: "explode", amount: 1 },
    });
    state = reviewTransition(state, {
      type: "scene",
      action: { type: "seek", time: 30 },
    });
    const returning = reviewTransition(state, {
      type: "room-inlet",
      id: device.id,
    });
    assert.equal(returning.scene.level, "rack");
    assert.equal(returning.pendingId, "room-01");
    assert.equal(returning.scene.explosion, 0);
    assert.equal(returning.scene.coverOpen, false);
    assert.equal(
      reviewTransition(returning, { type: "navigation-ready", key: "old-key" }),
      returning,
    );
    const room = reviewTransition(returning, {
      type: "navigation-ready",
      key: presentationKey(returning.scene),
    });
    assert.equal(room.scene.level, "room");
    assert.equal(room.layer, "environment");
    assert.equal(room.selectedId, device.id);
    assert.equal(room.scene.time, 30);
    assert.equal(room.scene.trayExtended, false);
  }
});
