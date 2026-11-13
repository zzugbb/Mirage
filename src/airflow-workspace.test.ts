import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createWorkspace,
  reviewLayers,
  reviewTransition,
  reviewPresentation,
} from "./review-model.ts";
import { partsForDevice } from "./catalog.ts";
import { presentationKey } from "./domain.ts";
import { installationMetric } from "./rack-installation.ts";
import { reviewSpatialMarks } from "./review-spatial.ts";
import { spatialSnapshot } from "./spatial.ts";
import { sceneLabels } from "./scene-labels.ts";
import { devices } from "./installation.ts";
import { airflowSnapshot } from "./airflow.ts";

test("五个工作区视图职责分开，气流不落入功耗、温度染色或告警标记", () => {
  assert.deepEqual(
    reviewLayers.map((item) => item.id),
    ["overview", "environment", "airflow", "power", "alarms"],
  );
  const state = createWorkspace(true).scene,
    readings = spatialSnapshot(60).readings;
  for (const level of ["room", "rack", "device"] as const) {
    assert.equal(reviewPresentation("airflow", level).mode, "status");
    assert.deepEqual(
      reviewSpatialMarks({ ...state, level }, "airflow", readings),
      [],
    );
  }
  assert.equal(installationMetric(readings.get("srv-01"), "airflow"), null);
  assert.deepEqual(
    sceneLabels(devices, readings, {
      level: "room",
      layer: "airflow",
      selectedId: "srv-01",
      more: false,
    }).map((item) => item.id),
    ["srv-01"],
  );
});

test("四机型在温度和气流之间切换保留机构、对象、共享时间和分析；显式机房气流才安全归位", () => {
  for (const id of ["srv-01", "srv-08", "sw-01", "sto-01"]) {
    let review = createWorkspace(true);
    const part = partsForDevice(id).find((item) => item.node !== "lid")!;
    review = {
      ...review,
      analysis: true,
      selectedId: part.id,
      scene: {
        ...review.scene,
        level: "device",
        deviceId: id,
        selected: part.id,
        coverOpen: true,
        explosion: 0.6,
        trayExtended: true,
        time: 91,
        playing: false,
      },
    };
    const before = structuredClone(review);
    for (const layer of [
      "environment",
      "airflow",
      "environment",
      "airflow",
    ] as const) {
      review = reviewTransition(review, { type: "layer", layer });
      assert.deepEqual(review.scene, before.scene);
      assert.equal(review.selectedId, part.id);
      assert.equal(review.analysis, true);
    }
    review = reviewTransition(review, { type: "room-airflow", id: part.id });
    assert.equal(review.layer, "airflow");
    assert.equal(review.scene.explosion, 0);
    assert.equal(review.scene.coverOpen, false);
    assert.equal(review.pendingId, "room-01");
    review = reviewTransition(review, {
      type: "navigation-ready",
      key: presentationKey(review.scene),
    });
    assert.equal(review.scene.level, "room");
    assert.equal(review.scene.trayExtended, false);
    assert.equal(review.scene.time, 91);
    assert.equal(
      airflowSnapshot(
        91,
        spatialSnapshot(91).readings,
        review.selectedId,
        review.scene.deviceId,
      ).routes[0].deviceId,
      id,
    );
    const inlet = reviewTransition(review, { type: "room-inlet", id });
    assert.equal(inlet.layer, "environment");
    assert.equal(inlet.scene.time, 91);
  }
});
