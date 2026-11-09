import { test } from "node:test";
import assert from "node:assert/strict";
import { airflowStage, airflowStageEmphasis } from "./airflow-stage.ts";
import { AirflowGeometry } from "./scene/airflow.ts";
import { airflowSnapshot } from "./airflow.ts";
import { spatialSnapshot } from "./spatial.ts";

test("分段观察沿现有送风、穿柜、回风分界，只强调当前段", () => {
  for (const [view, kind] of [
    ["supply", "supply"],
    ["intake", "through"],
    ["return", "return"],
  ] as const) {
    assert.equal(airflowStage(view)!.kind, kind);
    for (const segment of ["supply", "through", "return"] as const)
      assert.equal(
        airflowStageEmphasis(view, segment),
        segment === kind ? 1 : 0.18,
      );
  }
  for (const view of [null, "all"] as const) {
    assert.equal(airflowStage(view), null);
    for (const kind of ["supply", "through", "return"] as const)
      assert.equal(airflowStageEmphasis(view, kind), 1);
  }
});

test("分段上下文只引用既有端点，回风不提供进排风温差", () => {
  const route = airflowSnapshot(60, spatialSnapshot(60).readings).routes[0];
  for (const view of ["supply", "intake", "return"] as const)
    for (const endpoint of airflowStage(view)!.endpoints)
      assert.ok(route.endpoints.some((point) => point.kind === endpoint));
  assert.match(airflowStage("return")!.boundary, /无排风测点/);
  assert.match(airflowStage("intake")!.boundary, /不表示内部/);
});

test("分段强调保留完整几何和深度遮挡，淡化段不播放粒子，复原恢复原样", () => {
  const geometry = new AirflowGeometry();
  const snapshot = airflowSnapshot(60, spatialSnapshot(60).readings, "srv-01");
  geometry.update(snapshot);
  const counts = geometry.batches.map((batch) => batch.band.count);
  const opacities = geometry.batches.map(
    (batch) => batch.band.material.opacity,
  );
  geometry.update(snapshot, "supply");
  geometry.animate(60);
  assert.deepEqual(
    geometry.batches.map((batch) => batch.band.count),
    counts,
  );
  for (const batch of geometry.batches) {
    assert.equal(batch.band.material.depthTest, true);
    assert.equal(batch.band.material.depthWrite, false);
    assert.equal(batch.sparks.count > 0, batch.kind === "supply");
    assert.equal(
      batch.band.material.opacity,
      opacities[geometry.batches.indexOf(batch)] *
        (batch.kind === "supply" ? 1 : 0.18),
    );
  }
  geometry.update(snapshot, "intake");
  geometry.animate(60, true);
  assert.ok(geometry.batches.every((batch) => batch.sparks.count === 0));
  assert.ok(geometry.batches.every((batch) => batch.arrows.count > 0));
  geometry.update(snapshot);
  assert.deepEqual(
    geometry.batches.map((batch) => batch.band.material.opacity),
    opacities,
  );
  assert.ok(geometry.batches.every((batch) => batch.sparks.count > 0));
  geometry.dispose();
});

test("过期、离线和停机的分段观察只保留静态方向，切回有效时正常恢复", () => {
  const geometry = new AirflowGeometry();
  for (const id of ["srv-59", "srv-25", "srv-63"])
    for (const view of ["supply", "intake", "return"] as const) {
      geometry.update(
        airflowSnapshot(60, spatialSnapshot(60).readings, id),
        view,
      );
      geometry.animate(61);
      assert.ok(geometry.batches.every((batch) => batch.sparks.count === 0));
      assert.ok(geometry.batches.every((batch) => batch.arrows.count > 0));
    }
  geometry.update(
    airflowSnapshot(44, spatialSnapshot(44).readings, "srv-59"),
    "return",
  );
  assert.ok(
    geometry.batches.find((batch) => batch.kind === "return")!.sparks.count > 0,
  );
  geometry.update(null);
  assert.equal(geometry.root.visible, false);
  geometry.dispose();
});
