import { test } from "node:test";
import assert from "node:assert/strict";
import { sceneLabels } from "./scene-labels.ts";
import { spatialSnapshot } from "./spatial.ts";
import { racks, devices } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";

const options = {
  level: "room",
  layer: "overview",
  selectedId: "room-01",
  more: false,
} as const;
test("总览限制状态卡，保留选中对象优先级，完整告警仍留在读数中", () => {
  const readings = spatialSnapshot(60).readings;
  const labels = sceneLabels(racks, readings, options);
  assert.equal(labels.length, 3);
  assert.ok(labels.every((item) => readings.get(item.id)!.alarm > 0));
  assert.ok(
    racks.filter((r) => readings.get(r.id)!.alarm > 0).length > labels.length,
  );
  assert.equal(
    sceneLabels(racks, readings, { ...options, selectedId: "rack-a03" })[0].id,
    "rack-a03",
  );
  assert.equal(
    sceneLabels(racks, readings, { ...options, more: true }).length,
    6,
  );
  assert.deepEqual(
    new Set(
      sceneLabels(racks, readings, { ...options, layer: "alarms" }).map(
        (r) => r.id,
      ),
    ),
    new Set(
      racks.filter((r) => readings.get(r.id)!.alarm > 0).map((r) => r.id),
    ),
  );
});
test("内部总览只标所选部件，模型预警不自动铺开，子件也可识别", () => {
  const readings = spatialSnapshot(60).readings;
  const parts = [...partsForDevice("srv-01"), ...subpartsForDevice("srv-01")];
  assert.deepEqual(
    sceneLabels(parts, readings, {
      ...options,
      level: "device",
      selectedId: "srv-01",
    }),
    [],
  );
  const id = subpartsForDevice("srv-01")[0].id;
  assert.deepEqual(
    sceneLabels(parts, readings, {
      ...options,
      level: "device",
      selectedId: id,
    }).map((p) => p.id),
    [id],
  );
  assert.deepEqual(
    sceneLabels(parts, readings, {
      ...options,
      level: "device",
      selectedId: "nic-01",
      annotatedIds: ["nic-01"],
    }),
    [],
  );
  assert.equal(
    sceneLabels(parts, readings, { ...options, level: "device", more: true })
      .length,
    3,
  );
  assert.deepEqual(
    sceneLabels(parts, readings, {
      ...options,
      level: "device",
      layer: "alarms",
    }),
    [],
  );
});
test("路径端点优先留空间，指标排序不以过期值替代当前值，零值有效", () => {
  const readings = spatialSnapshot(60).readings;
  const offline = "srv-25";
  const chosen = devices.find((d) => readings.get(d.id)?.power === 0)!;
  assert.ok(chosen);
  const labels = sceneLabels(devices, readings, {
    ...options,
    level: "rack",
    layer: "power",
    selectedId: offline,
    hasPath: true,
  });
  assert.equal(labels.length, 2);
  assert.equal(labels[0].id, offline);
  const good = readings.get(chosen.id)!;
  const bad = readings.get(offline)!;
  const sample = new Map([
    [chosen.id, good],
    [offline, { ...bad, power: 99999 }],
  ]);
  assert.equal(
    sceneLabels([{ id: offline }, { id: chosen.id }], sample, {
      ...options,
      layer: "power",
    })[0].id,
    chosen.id,
  );
  const estimates = new Map(racks.map((r, i) => [r.id, i]));
  assert.equal(
    sceneLabels(racks, readings, {
      ...options,
      layer: "environment",
      estimates,
      hasPath: true,
    }).length,
    2,
  );
});
