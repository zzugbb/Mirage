import { test } from "node:test";
import assert from "node:assert/strict";
import { createState, transition } from "./domain.ts";
import { devices } from "./installation.ts";
import { roomFixtures } from "./fixtures.ts";
import { powerLinks, inletPart } from "./power-config.ts";
import { powerContextIncludes, powerLinksForContext } from "./power-trace.ts";
import { powerScene, pduOutletPosition } from "./power-paths.ts";
import { PowerGeometry } from "./scene/power.ts";

test("无供电关系的设施不继承活动设备支路，错误追踪不能跨PDU或机柜泄漏", () => {
  const state = createState();
  for (const id of [
    "unknown",
    "cooling-01",
    ...roomFixtures.map((f) => f.id),
  ]) {
    assert.deepEqual(powerLinksForContext(id, state.deviceId), []);
    assert.equal(powerScene(state, id, powerLinks[0].id), null);
  }
  const link = powerLinks[0];
  assert.equal(powerContextIncludes(link.pduId, state.deviceId, link.id), true);
  const other = powerLinks.find((entry) => entry.pduId !== link.pduId)!;
  assert.equal(
    powerContextIncludes(other.pduId, state.deviceId, link.id),
    false,
  );
  assert.equal(powerScene(state, other.pduId, link.id)!.traceId, null);
});

test("全部168条配置接入均可单独追踪，路径起点和框标精确绑定对应PDU插座", () => {
  for (const link of powerLinks) {
    const state = transition(createState(), {
      type: "navigate",
      level: "rack",
      id: link.deviceId,
    });
    const trace = powerScene(state, link.pduId, link.id)!;
    assert.equal(trace.traceId, link.id);
    assert.equal(trace.deviceId, link.deviceId);
    assert.equal(trace.paths.length, 1);
    assert.equal(trace.paths[0].feed, link.inlet);
    const outlet = pduOutletPosition(link.pduId, link.outlet);
    assert.deepEqual(trace.paths[0].points[0], outlet);
    assert.deepEqual(
      trace.labels.find((label) => label.kind === "outlet")!.point,
      outlet,
    );
    assert.equal(trace.labels.length, 2);
    assert.match(
      trace.caption,
      new RegExp(`插座 ${String(link.outlet).padStart(2, "0")}`),
    );
    assert.deepEqual(
      powerScene({ ...state, time: 120 }, link.pduId, link.id),
      trace,
    );
  }
});

test("四种机型追踪到本端电源，抽出随位移、结构展示不残留机房插座", () => {
  for (const modelId of new Set(devices.map((d) => d.modelId))) {
    const device = devices.find((d) => d.modelId === modelId)!;
    const link = powerLinks.find(
      (entry) => entry.deviceId === device.id && entry.inlet === "B",
    )!;
    const rack = transition(createState(), {
      type: "navigate",
      level: "rack",
      id: device.id,
    });
    const mounted = powerScene(rack, device.id, link.id)!;
    const extended = powerScene(
      { ...rack, trayExtended: true },
      device.id,
      link.id,
    )!;
    assert.ok(
      Math.abs(
        extended.paths[0].points.at(-1)![2] -
          mounted.paths[0].points.at(-1)![2] -
          0.58,
      ) < 1e-6,
    );
    const state = { ...rack, level: "device" as const };
    const detail = powerScene(state, device.id, link.id)!;
    assert.equal(detail.paths.length, 0);
    assert.equal(detail.labels.length, 1);
    assert.equal(detail.labels[0].partId, inletPart(modelId, "B"));
    assert.equal(detail.labels[0].point, undefined);
    assert.equal(
      powerContextIncludes(inletPart(modelId, "A"), device.id, link.id),
      false,
    );
  }
});

test("插座框标与代表圆点互斥，取消或转场收起且资源可释放", () => {
  const link = powerLinks[4];
  const state = transition(createState(), {
    type: "navigate",
    level: "rack",
    id: link.deviceId,
  });
  const geometry = new PowerGeometry();
  geometry.update(powerScene(state, link.pduId, link.id));
  assert.equal(geometry.outlet.visible, true);
  assert.equal(geometry.dots.count, 1);
  const point = pduOutletPosition(link.pduId, link.outlet);
  assert.deepEqual(geometry.outlet.position.toArray(), [
    point[0],
    point[1],
    point[2] - 0.002,
  ]);
  assert.equal(geometry.outlet.material.depthTest, true);
  geometry.frame(false, new Map());
  assert.equal(geometry.root.visible, false);
  geometry.update(powerScene(state, link.pduId));
  assert.equal(geometry.outlet.visible, false);
  geometry.update(null);
  assert.equal(geometry.bands.count, 0);
  assert.equal(geometry.dots.count, 0);
  let disposed = 0;
  geometry.outlet.geometry.addEventListener("dispose", () => disposed++);
  geometry.outlet.material.addEventListener("dispose", () => disposed++);
  geometry.dispose();
  assert.equal(disposed, 2);
});
