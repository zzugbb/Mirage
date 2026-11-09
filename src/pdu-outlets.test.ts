import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pduOutlets,
  pduOutlet,
  pduInspectionIncludes,
  pduInspectionScene,
} from "./pdu-outlets.ts";
import { pdus, powerLinks, inletPart } from "./power-config.ts";
import { deviceById, rackForDevice } from "./installation.ts";
import { createState } from "./domain.ts";
import { pduOutletPosition } from "./power-paths.ts";
import { PowerGeometry } from "./scene/power.ts";

test("16 个 PDU 的逐位核对按配置高度从上到下覆盖 384 插座和 168 接入", () => {
  const links = new Set<string>();
  for (const pdu of pdus) {
    const rows = pduOutlets(pdu.id);
    assert.equal(rows.length, 24);
    assert.deepEqual(
      rows.map((row) => row.outlet),
      Array.from({ length: 24 }, (_, i) => 24 - i),
    );
    rows.forEach((row, i) => {
      if (i)
        assert.ok(
          pduOutletPosition(pdu.id, rows[i - 1].outlet)[1] >
            pduOutletPosition(pdu.id, row.outlet)[1],
        );
      if (row.link) {
        assert.equal(row.link.pduId, pdu.id);
        assert.equal(row.link.outlet, row.outlet);
        links.add(row.link.id);
      }
    });
  }
  assert.equal(links.size, 168);
});

test("插座查找保留全部配置位置，支持编号与对端，未连接不虚构设备", () => {
  const rows = pduOutlets("pdu-a01-a", "SRV-01");
  assert.equal(rows.length, 24);
  assert.deepEqual(
    rows.filter((row) => row.matches).map((row) => row.outlet),
    [1],
  );
  assert.deepEqual(
    pduOutlets("pdu-a01-a", "24")
      .filter((row) => row.matches)
      .map((row) => row.outlet),
    [24],
  );
  assert.ok(pduOutlets("pdu-a01-a", "不存在").every((row) => !row.matches));
  assert.equal(pduOutlet("pdu-a01-a", 24)!.link, null);
  for (const outlet of [0, 25, 1.5, NaN])
    assert.equal(pduOutlet("pdu-a01-a", outlet), null);
  assert.deepEqual(pduOutlets("unknown"), []);
});

test("未连接插座仅标记配置位置，不沿用上一次支路或整机代表连接", () => {
  const state = createState(),
    visit = { pduId: "pdu-a01-a", outlet: 24, query: "", scroll: 0 };
  const scene = pduInspectionScene(state, visit.pduId, visit)!;
  assert.equal(scene.traceId, null);
  assert.deepEqual(scene.paths, []);
  assert.equal(scene.labels.length, 1);
  assert.equal(scene.labels[0].kind, "outlet");
  assert.deepEqual(scene.labels[0].point, pduOutletPosition(visit.pduId, 24));
  const geometry = new PowerGeometry();
  geometry.update(scene);
  assert.equal(geometry.bands.count, 0);
  assert.equal(geometry.dots.count, 0);
  assert.equal(geometry.outlet.visible, true);
  geometry.dispose();
  assert.equal(
    pduInspectionScene({ ...state, level: "device" }, visit.pduId, visit),
    null,
  );
  assert.equal(
    pduInspectionScene(
      { ...state, level: "rack", deviceId: "sto-01" },
      visit.pduId,
      visit,
    ),
    null,
  );
});

test("已连接插座沿用同一配置支路，回看不改变端点；查询状态可跨电源检视保留", () => {
  for (const link of powerLinks) {
    const visit = {
      pduId: link.pduId,
      outlet: link.outlet,
      query: "device",
      scroll: 120,
    };
    const state = createState(),
      scene = pduInspectionScene(state, link.pduId, visit)!;
    assert.equal(scene.traceId, link.id);
    assert.equal(scene.deviceId, link.deviceId);
    assert.deepEqual(
      pduInspectionScene({ ...state, time: 120 }, link.pduId, visit),
      scene,
    );
    const part = inletPart(deviceById(link.deviceId)!.modelId, link.inlet);
    assert.ok(pduInspectionIncludes(visit, part, link.deviceId));
    assert.ok(
      pduInspectionIncludes(
        visit,
        rackForDevice(link.deviceId).id,
        link.deviceId,
      ),
    );
    assert.ok(pduInspectionIncludes(visit, "power-01", link.deviceId));
    assert.equal(pduInspectionIncludes(visit, "room-01", link.deviceId), false);
    assert.equal(
      pduInspectionIncludes(visit, "environment-01", link.deviceId),
      false,
    );
  }
});
