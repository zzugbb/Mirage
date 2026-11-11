import { test } from "node:test";
import assert from "node:assert/strict";
import {
  beginSourceInspection,
  sourceInspectionIncludes,
  sourceInspectionRow,
} from "./source-inspection.ts";
import { readingSources, sourceMetrics } from "./reading-sources.ts";
import { spatialSnapshot } from "./spatial.ts";
import { devices, racks, rackForDevice } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { grilleRowForRack } from "./floor-grilles.ts";
import { pdus, powerLinks } from "./power-config.ts";
import { createReview, reviewTransition } from "./review-model.ts";
import { presentationKey } from "./domain.ts";

test("输入检视固定五类范围的当秒口径，拒绝跨范围、错误分组与部件", () => {
  const readings = spatialSnapshot(60).readings;
  for (const sourceId of [
    "room-01",
    "cooling-01",
    "power-01",
    ...racks.map((r) => r.id),
    ...pdus.map((p) => p.id),
  ])
    for (const metric of sourceMetrics(sourceId)) {
      const sources = readingSources(sourceId, metric, readings)!;
      for (const row of sources.rows) {
        const check = {
          sourceId,
          metric,
          group: row.included ? ("included" as const) : ("excluded" as const),
          query: row.name,
        };
        const visit = beginSourceInspection(check, row.id, 60, readings)!;
        assert.deepEqual(visit.row, row);
        assert.equal(visit.coverage, sources.coverage);
        assert.equal(visit.count, sources.count);
        assert.notEqual(visit.check, check);
        assert.equal(
          beginSourceInspection(
            { ...check, group: row.included ? "excluded" : "included" },
            row.id,
            60,
            readings,
          ),
          null,
        );
      }
      for (const id of [
        "cpu-01",
        "unknown",
        ...devices
          .filter((d) => !sources.rows.some((r) => r.id === d.id))
          .map((d) => d.id),
      ])
        assert.equal(
          beginSourceInspection(
            { sourceId, metric, group: "included", query: "" },
            id,
            60,
            readings,
          ),
          null,
        );
    }
});

test("回看只更新当前计入状态，保留原过期依据；有效零值与三种无效输入分开", () => {
  const check = {
    sourceId: "room-01",
    metric: "temperature" as const,
    group: "excluded" as const,
    query: "SRV-59",
  };
  const visit = beginSourceInspection(
    check,
    "srv-59",
    60,
    spatialSnapshot(60).readings,
  )!;
  const before = structuredClone(visit);
  assert.equal(visit.row.value, null);
  assert.match(visit.row.detail, /44 秒/);
  assert.equal(
    sourceInspectionRow(visit, spatialSnapshot(44).readings).included,
    true,
  );
  assert.equal(
    sourceInspectionRow(visit, spatialSnapshot(60).readings).included,
    false,
  );
  assert.deepEqual(visit, before);
  const zero = beginSourceInspection(
    { ...check, metric: "power", group: "included" },
    "srv-63",
    60,
    spatialSnapshot(60).readings,
  )!;
  assert.equal(zero.row.value, 0);
  assert.equal(zero.row.reason, "有效零值");
  for (const [id, reason] of [
    ["srv-25", "设备离线"],
    ["srv-56", "未配置观测"],
    ["srv-59", "数据过期"],
  ]) {
    const invalid = beginSourceInspection(
      { ...check, metric: "power" },
      id,
      60,
      spatialSnapshot(60).readings,
    )!;
    assert.equal(invalid.row.value, null);
    assert.equal(invalid.row.reason, reason);
  }
});

test("温度与功耗仅延续各自端点和四机型部件，不串设备身份", () => {
  const readings = spatialSnapshot(60).readings;
  for (const modelId of new Set(devices.map((d) => d.modelId))) {
    const device = devices.find((d) => d.modelId === modelId)!;
    for (const metric of ["temperature", "power"] as const) {
      const row = readingSources("room-01", metric, readings)!.rows.find(
        (r) => r.id === device.id,
      )!;
      const visit = beginSourceInspection(
        {
          sourceId: "room-01",
          metric,
          group: row.included ? "included" : "excluded",
          query: "",
        },
        device.id,
        60,
        readings,
      )!;
      for (const id of [device.id, rackForDevice(device.id).id])
        assert.equal(sourceInspectionIncludes(visit, id, device.id), true);
      for (const id of ["cooling-01", grilleRowForRack(device.rackId)!.id])
        assert.equal(
          sourceInspectionIncludes(visit, id, device.id),
          metric === "temperature",
        );
      for (const id of [
        "power-01",
        ...powerLinks
          .filter((l) => l.deviceId === device.id)
          .map((l) => l.pduId),
      ])
        assert.equal(
          sourceInspectionIncludes(visit, id, device.id),
          metric === "power",
        );
      for (const part of [
        ...partsForDevice(device.id),
        ...subpartsForDevice(device.id),
      ]) {
        assert.equal(sourceInspectionIncludes(visit, part.id, device.id), true);
        assert.equal(
          sourceInspectionIncludes(visit, part.id, "other-device"),
          false,
        );
      }
      for (const id of [
        "room-01",
        "environment-01",
        ...devices.filter((d) => d.id !== device.id).map((d) => d.id),
      ])
        assert.equal(sourceInspectionIncludes(visit, id, device.id), false);
    }
  }
});

test("四机型返回五类输入范围先归位，保留最新时间和机柜层级", () => {
  for (const modelId of new Set(devices.map((d) => d.modelId)))
    for (const target of [
      { id: "room-01", level: "room" },
      { id: "cooling-01", level: "room" },
      { id: "power-01", level: "room" },
      { id: "rack-a01", level: "room" },
      { id: "rack-a01", level: "rack" },
      { id: pdus[0].id, level: "room" },
      { id: pdus[0].id, level: "rack" },
    ] as const) {
      const device = devices.find((d) => d.modelId === modelId)!;
      let state = reviewTransition(createReview(), {
        type: "scene",
        action: { type: "locate", id: device.id },
      });
      state = reviewTransition(state, {
        type: "scene",
        action: { type: "explode", amount: 1 },
      });
      state = reviewTransition(state, {
        type: "scene",
        action: { type: "seek", time: 100 },
      });
      const returning = reviewTransition(state, {
        type: "return-input-scope",
        ...target,
      });
      assert.equal(returning.scene.deviceId, device.id);
      assert.equal(returning.scene.explosion, 0);
      assert.equal(returning.scene.coverOpen, false);
      assert.equal(returning.scene.trayExtended, false);
      assert.equal(returning.scene.time, 100);
      assert.equal(
        reviewTransition(returning, {
          type: "navigation-ready",
          key: "obsolete",
        }),
        returning,
      );
      const finished = reviewTransition(returning, {
        type: "navigation-ready",
        key: presentationKey(returning.scene),
      });
      assert.equal(finished.pendingId, null);
      assert.equal(finished.scene.level, target.level);
      assert.equal(finished.selectedId, target.id);
      assert.equal(finished.scene.time, 100);
    }
});

test("输入返回拒绝非汇总对象、错误层级与未完成导航，不扩大最高来源的口径", () => {
  const state = createReview();
  for (const id of ["srv-01", "cpu-01", "environment-01", "unknown"])
    assert.equal(
      reviewTransition(state, {
        type: "return-input-scope",
        id,
        level: "room",
      }),
      state,
    );
  for (const id of ["room-01", "cooling-01", "power-01"])
    assert.equal(
      reviewTransition(state, {
        type: "return-input-scope",
        id,
        level: "rack",
      }),
      state,
    );
  assert.equal(
    reviewTransition(state, {
      type: "return-analysis-scope",
      id: "power-01",
      level: "room",
    }),
    state,
  );
  const pending = { ...state, pendingId: "srv-01" };
  assert.equal(
    reviewTransition(pending, {
      type: "return-input-scope",
      id: "room-01",
      level: "room",
    }),
    pending,
  );
});
