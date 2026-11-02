import { test } from "node:test";
import assert from "node:assert/strict";
import {
  workspacePreset,
  visibleResourceRows,
  resourceRowText,
} from "./workspace-presets.ts";
import { resourceCatalog, findResources } from "./review-resources.ts";
import { spatialSnapshot } from "./spatial.ts";
import { createReview, reviewTransition } from "./review-model.ts";
test("四个演示画面装载一致的暂停时钟，分析回看保留结构姿态", () => {
  const initial = createReview();
  for (const shot of ["overview", "structure", "alarms", "time"] as const) {
    const next = workspacePreset(initial, shot);
    assert.equal(next.scene.time, 60);
    assert.equal(next.scene.playing, false);
    assert.equal(next.tour.mode, "manual");
    assert.equal(next.analysis, shot === "time");
    assert.equal(next.layer, shot === "alarms" ? "alarms" : "overview");
  }
  const structure = workspacePreset(initial, "structure");
  const replay = reviewTransition(structure, {
    type: "scene",
    action: { type: "seek", time: 32 },
  });
  assert.equal(replay.scene.explosion, structure.scene.explosion);
  assert.equal(replay.scene.coverOpen, structure.scene.coverOpen);
  assert.equal(replay.scene.focusRevision, structure.scene.focusRevision);
  assert.equal(initial.scene.level, "room");
});
test("异常筛选沿用当前范围顺序，零告警为空，部件评估不进入告警清单", () => {
  const scene = createReview().scene;
  const rows = findResources(scene, "", "all");
  const current = spatialSnapshot(60, 0, scene.deviceId).readings;
  const filtered = visibleResourceRows(rows, current, true);
  assert.ok(filtered.length > 0);
  assert.ok(
    filtered.every(
      (row) => row.kind === "rack" && current.get(row.id)!.alarm > 0,
    ),
  );
  assert.deepEqual(
    visibleResourceRows(
      rows,
      spatialSnapshot(0, 0, scene.deviceId).readings,
      true,
    ),
    [],
  );
  const parts = resourceCatalog(scene.deviceId).filter(
    (r) => r.kind === "part",
  );
  assert.deepEqual(visibleResourceRows(parts, current, true), []);
  assert.equal(visibleResourceRows(rows, current, false), rows);
});
test("资源行将设备编号与类型位置分离，机柜和部件保留可读名称", () => {
  const catalog = resourceCatalog("srv-01");
  assert.deepEqual(resourceRowText(catalog.find((r) => r.id === "srv-01")!), {
    title: "SRV-01",
    detail: "2U 服务器 · U23–24",
  });
  assert.deepEqual(
    resourceRowText(
      catalog.find((r) => r.id === "srv-01")!,
      true,
    ),
    {
      title: "SRV-01",
      detail: "2U 服务器 · A01 机柜 / U23–24",
    },
  );
  assert.deepEqual(resourceRowText(catalog.find((r) => r.id === "rack-a01")!), {
    title: "A01 机柜",
    detail: "42U · 10 台设备",
  });
  const part = catalog.find((r) => r.kind === "part")!;
  assert.equal(resourceRowText(part).title, part.name);
});
