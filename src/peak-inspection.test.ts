import { test } from "node:test";
import assert from "node:assert/strict";
import {
  beginPeakInspection,
  peakInspectionIncludes,
  peakInspectionStatus,
} from "./peak-inspection.ts";
import { maximumSources, peakScopeIds } from "./peak-provenance.ts";
import { spatialSnapshot } from "./spatial.ts";
import { devices, racks, rackForDevice } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { grilleRowForRack } from "./floor-grilles.ts";
import { createReview, reviewTransition } from "./review-model.ts";
import { presentationKey } from "./domain.ts";

test("最高来源检视只接受当秒有效最高设备，固定并列身份与覆盖，不冒用无效值", () => {
  for (const time of [0, 43, 45, 60, 100, 120])
    for (const scopeId of [
      "room-01",
      "cooling-01",
      ...racks.map((r) => r.id),
    ]) {
      const readings = spatialSnapshot(time).readings,
        ids = peakScopeIds(scopeId)!;
      const sources = maximumSources(ids, readings);
      for (const deviceId of sources) {
        const inspection = beginPeakInspection(
          scopeId,
          deviceId,
          time,
          readings,
        )!;
        assert.ok(inspection);
        assert.deepEqual(inspection.sources, sources);
        assert.equal(inspection.time, time);
        assert.equal(
          inspection.temperature,
          readings.get(deviceId)!.temperature,
        );
        assert.equal(inspection.count, ids.length);
        assert.equal(
          inspection.coverage,
          ids.filter(
            (id) =>
              readings.get(id)!.quality === "valid" &&
              readings.get(id)!.temperature !== null,
          ).length,
        );
      }
      const nonSource = devices.find((d) => !sources.includes(d.id))!;
      assert.equal(
        beginPeakInspection(scopeId, nonSource.id, time, readings),
        null,
      );
    }
  const readings = spatialSnapshot(60).readings;
  for (const scope of ["srv-07", "power-01", "unknown"])
    assert.equal(beginPeakInspection(scope, "srv-07", 60, readings), null);
  for (const id of [
    "srv-25",
    "srv-56",
    "srv-59",
    "srv-63",
    "cpu-01",
    "unknown",
  ])
    assert.equal(beginPeakInspection("room-01", id, 60, readings), null);
});

test("共享时间改变只更新当前说明，不重选来源或修改原时刻依据", () => {
  const inspection = beginPeakInspection(
    "room-01",
    "srv-07",
    60,
    spatialSnapshot(60).readings,
  )!;
  const before = structuredClone(inspection);
  assert.match(
    peakInspectionStatus(inspection, spatialSnapshot(60).readings),
    /仍为/,
  );
  assert.match(
    peakInspectionStatus(inspection, spatialSnapshot(0).readings),
    /已切换/,
  );
  const readings = spatialSnapshot(60).readings,
    original = readings.get(inspection.deviceId)!;
  for (const quality of ["stale", "offline", "missing"] as const) {
    readings.set(inspection.deviceId, {
      ...original,
      quality,
      temperature: 99,
    });
    assert.match(peakInspectionStatus(inspection, readings), /无有效进风/);
  }
  readings.set(inspection.deviceId, { ...original, temperature: null });
  assert.match(peakInspectionStatus(inspection, readings), /无有效进风/);
  readings.set(inspection.deviceId, { ...original, temperature: 0 });
  assert.match(peakInspectionStatus(inspection, readings), /已切换/);
  assert.deepEqual(inspection, before);
});

test("检视仅延续来源设备、所属柜与气流端点，四机型部件不串身份", () => {
  for (const modelId of new Set(devices.map((d) => d.modelId))) {
    const device = devices.find((d) => d.modelId === modelId)!;
    const readings = spatialSnapshot(60).readings;
    readings.set(device.id, {
      ...readings.get(device.id)!,
      quality: "valid",
      temperature: 100,
    });
    const inspection = beginPeakInspection("room-01", device.id, 60, readings)!;
    const rack = rackForDevice(device.id),
      grille = grilleRowForRack(rack.id)!;
    for (const id of [device.id, rack.id, grille.id, "cooling-01"])
      assert.equal(peakInspectionIncludes(inspection, id, device.id), true);
    for (const part of [
      ...partsForDevice(device.id),
      ...subpartsForDevice(device.id),
    ]) {
      assert.equal(
        peakInspectionIncludes(inspection, part.id, device.id),
        true,
      );
      const other = devices.find((d) => d.id !== device.id)!;
      assert.equal(
        peakInspectionIncludes(inspection, part.id, other.id),
        false,
      );
    }
    for (const id of ["power-01", "environment-01", "room-01", "unknown"])
      assert.equal(peakInspectionIncludes(inspection, id, device.id), false);
  }
});

test("四机型展开后的范围返回等待机构归位，保持最新时间与原范围层级", () => {
  for (const modelId of new Set(devices.map((d) => d.modelId)))
    for (const target of [
      { id: "room-01", level: "room" },
      { id: "cooling-01", level: "room" },
      { id: "rack-a01", level: "room" },
      { id: "rack-a01", level: "rack" },
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
        type: "return-analysis-scope",
        ...target,
      });
      assert.equal(returning.scene.level, "rack");
      assert.equal(returning.scene.deviceId, device.id);
      assert.equal(returning.scene.explosion, 0);
      assert.equal(returning.scene.coverOpen, false);
      assert.equal(returning.scene.trayExtended, false);
      assert.equal(returning.scene.time, 100);
      if (!returning.pendingId) {
        assert.equal(target.level, "rack");
        assert.equal(target.id, rackForDevice(device.id).id);
      }
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
      assert.equal(finished.scene.selected, target.id);
      assert.equal(finished.scene.time, 100);
      assert.equal(finished.scene.explosion, 0);
    }
});

test("范围返回拒绝非汇总对象与错误层级，已打开后门先关闭再回机房", () => {
  const state = createReview();
  for (const id of ["srv-01", "cpu-01", "power-01", "unknown"])
    assert.equal(
      reviewTransition(state, {
        type: "return-analysis-scope",
        id,
        level: "room",
      }),
      state,
    );
  for (const id of ["room-01", "cooling-01"])
    assert.equal(
      reviewTransition(state, {
        type: "return-analysis-scope",
        id,
        level: "rack",
      }),
      state,
    );
  let rack = reviewTransition(state, { type: "open-resource", id: "rack-a01" });
  rack = reviewTransition(rack, {
    type: "scene",
    action: { type: "rear-door", open: true },
  });
  const returning = reviewTransition(rack, {
    type: "return-analysis-scope",
    id: "rack-a01",
    level: "room",
  });
  assert.equal(returning.scene.level, "rack");
  assert.equal(returning.scene.rearDoorOpen, false);
  assert.equal(returning.pendingId, "room-01");
  const finished = reviewTransition(returning, {
    type: "navigation-ready",
    key: presentationKey(returning.scene),
  });
  assert.equal(finished.scene.level, "room");
  assert.equal(finished.selectedId, "rack-a01");
});
