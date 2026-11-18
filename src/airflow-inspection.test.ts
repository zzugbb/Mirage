import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeAirflowInspection,
  airflowEndpointObject,
  airflowInspectionContext,
  beginAirflowInspection,
} from "./airflow-inspection.ts";
import { airflowSnapshot } from "./airflow.ts";
import { devices } from "./installation.ts";
import { spatialSnapshot } from "./spatial.ts";
import { createWorkspace, reviewTransition } from "./review-model.ts";
import { entityById } from "./domain.ts";

test("全部设备气流端点只关联既有制冷单元、格栅排和本机，不生成回风测点", () => {
  const readings = spatialSnapshot(60).readings;
  for (const device of devices) {
    const route = airflowSnapshot(60, readings, device.id).routes[0];
    const ids = route.endpoints.map(
      (endpoint) => airflowEndpointObject(route, endpoint.kind).id,
    );
    assert.equal(ids[0], route.sourceId);
    assert.equal(ids[2], device.id);
    assert.equal(ids[3], route.sourceId);
    assert.ok(ids[1].startsWith("grilles-row-"));
    for (const id of ids) assert.ok(entityById(id));
  }
});

test("连续端点预览保持首次对象与面板状态，同一设备支路随回看更新且过期仍静态", () => {
  const state = createWorkspace().scene;
  const context = airflowInspectionContext(state, "airflow", 0);
  for (const deviceId of ["srv-27", "srv-59"]) {
    const route = airflowSnapshot(60, spatialSnapshot(60).readings, deviceId)
      .routes[0];
    const origin = {
      originId: deviceId,
      context,
      nav: true,
      inspector: false,
      analysis: true,
    };
    let visit = beginAirflowInspection(
      null,
      route,
      airflowEndpointObject(route, "floor").id,
      origin,
    )!;
    for (const kind of ["supply", "intake", "return"] as const) {
      const target = airflowEndpointObject(route, kind).id;
      visit = beginAirflowInspection(visit, route, target, {
        ...origin,
        originId: visit.targetId,
        nav: false,
        inspector: true,
        analysis: false,
      })!;
      assert.equal(visit.originId, deviceId);
      assert.equal(visit.nav, true);
      assert.equal(visit.inspector, false);
      assert.equal(visit.analysis, true);
      assert.equal(activeAirflowInspection(visit, target, context), visit);
      const later = airflowSnapshot(
        120,
        spatialSnapshot(120).readings,
        visit.deviceId,
      ).routes[0];
      assert.equal(later.id, route.id);
      assert.deepEqual(later.segments, route.segments);
      if (deviceId === "srv-59") {
        assert.equal(later.animated, false);
        assert.match(later.endpoints[2].detail, /过期/);
      } else
        assert.notEqual(later.endpoints[2].detail, route.endpoints[2].detail);
    }
    assert.equal(
      beginAirflowInspection(visit, route, "rack-a01", origin),
      null,
    );
  }
});

test("独立气流按显式设备固定支路，回看保留端点核对；定位、图层和预设结束核对", () => {
  const workspace = createWorkspace();
  const context = airflowInspectionContext(workspace.scene, "airflow", 0);
  const route = airflowSnapshot(60, spatialSnapshot(60).readings, "srv-01")
    .routes[0];
  assert.equal(route.deviceId, "srv-01");
  const visit = beginAirflowInspection(null, route, route.sourceId, {
    originId: "srv-01",
    context,
    nav: true,
    inspector: true,
    analysis: false,
  })!;
  let review = reviewTransition(workspace, {
    type: "scene",
    action: { type: "seek", time: 120 },
  });
  review = reviewTransition(review, { type: "analysis", value: true });
  assert.equal(airflowInspectionContext(review.scene, "airflow", 0), context);
  for (const changed of [
    airflowInspectionContext(
      { ...workspace.scene, focusRevision: 1 },
      "airflow",
      0,
    ),
    airflowInspectionContext(
      { ...workspace.scene, level: "rack" },
      "airflow",
      0,
    ),
    airflowInspectionContext(workspace.scene, "environment", 0),
    airflowInspectionContext(workspace.scene, "airflow", 1),
  ])
    assert.equal(activeAirflowInspection(visit, visit.targetId, changed), null);
  assert.equal(activeAirflowInspection(visit, "room-01", context), null);
});
