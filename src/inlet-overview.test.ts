import { test } from "node:test";
import assert from "node:assert/strict";
import { inletOverview, inletOverviewRows } from "./inlet-overview.ts";
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

test("全机房查找跨八柜保留四机型，当前柜范围只返回本柜结果", () => {
  const all = inletOverview(spatialSnapshot(60).readings);
  const room = inletOverviewRows(all, "rack-a01", "room", "installation");
  assert.equal(room.length, 84);
  assert.equal(new Set(room.map((row) => row.id)).size, 84);
  assert.equal(new Set(room.map((row) => modelForDevice(row.id).id)).size, 4);
  assert.deepEqual(
    inletOverviewRows(all, "rack-a07", "rack", "installation"),
    all.find((r) => r.rack.id === "rack-a07")!.rows,
  );
  const matches = inletOverview(spatialSnapshot(60).readings, "B03 STO-01");
  assert.deepEqual(
    inletOverviewRows(matches, "rack-a01", "room", "temperature").map(
      (row) => row.id,
    ),
    ["sto-01"],
  );
  assert.equal(
    inletOverviewRows(matches, "rack-a01", "rack", "temperature").length,
    0,
  );
});

test("有效性筛选不改写八柜输入、最高值与覆盖，查找和筛选取交集", () => {
  const readings = spatialSnapshot(60).readings;
  const all = inletOverview(readings);
  const valid = inletOverview(readings, "", "included");
  const unknown = inletOverview(readings, "", "excluded");
  assert.equal(
    valid.flatMap((r) => r.matching).length +
      unknown.flatMap((r) => r.matching).length,
    84,
  );
  assert.ok(valid.flatMap((r) => r.matching).every((r) => r.value !== null));
  assert.ok(unknown.flatMap((r) => r.matching).every((r) => r.value === null));
  for (const result of [valid, unknown])
    assert.deepEqual(
      result.map(({ matching, ...rest }) => rest),
      all.map(({ matching, ...rest }) => rest),
    );
  const stale = inletOverview(readings, "过期", "excluded").flatMap(
    (r) => r.matching,
  );
  assert.ok(stale.length > 0);
  assert.ok(stale.every((r) => r.reason === "数据过期"));
  assert.equal(
    inletOverview(readings, "过期", "included").flatMap((r) => r.matching)
      .length,
    0,
  );
});

test("进风排序有效零值先于未知，并列保持安装顺序，不修改原数据", () => {
  const readings = spatialSnapshot(60).readings;
  const ids = ["srv-01", "srv-02", "srv-03", "srv-04"];
  for (const [i, id] of ids.entries())
    readings.set(id, {
      ...readings.get(id)!,
      quality: i === 3 ? "stale" : "valid",
      temperature: [0, 30, 30, 99][i],
    });
  const all = inletOverview(readings);
  const before = JSON.stringify(all);
  const installed = inletOverviewRows(all, "rack-a01", "room", "installation");
  const sorted = inletOverviewRows(all, "rack-a01", "room", "temperature");
  assert.ok(
    sorted.findIndex((r) => r.id === "srv-01") <
      sorted.findIndex((r) => r.id === "srv-04"),
  );
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1],
      b = sorted[i];
    if (a.value === null) assert.equal(b.value, null);
    if (a.value !== null && b.value !== null) assert.ok(a.value >= b.value);
    if (a.value === b.value)
      assert.ok(installed.indexOf(a) < installed.indexOf(b));
  }
  assert.equal(JSON.stringify(all), before);
  const empty = inletOverviewRows(
    inletOverview(new Map()),
    "rack-a01",
    "room",
    "temperature",
  );
  assert.deepEqual(
    empty.map((r) => r.id),
    installed.map((r) => r.id),
  );
});
