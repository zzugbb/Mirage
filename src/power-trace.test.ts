import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  entityById,
  presentationKey,
  transition,
} from "./domain.ts";
import { createReview, reviewTransition } from "./review-model.ts";
import { devices, deviceById, rackForDevice } from "./installation.ts";
import { unitLabel } from "./catalog.ts";
import { roomFixtures } from "./fixtures.ts";
import {
  powerLinks,
  powerSettings,
  inletPart,
  pduById,
} from "./power-config.ts";
import {
  powerContextIncludes,
  powerLinksForContext,
  powerTraceStops,
} from "./power-trace.ts";
import { powerScene, pduOutletPosition } from "./power-paths.ts";
import { PowerGeometry } from "./scene/power.ts";

test("支路导航按配置列出出线、插座和设备安装位，未追踪时没有导航目标", () => {
  for (const id of [null, "unknown"]) assert.deepEqual(powerTraceStops(id), []);
  for (const link of powerLinks) {
    const [source, pdu, device] = powerTraceStops(link.id);
    assert.deepEqual(
      [source.id, pdu.id, device.id],
      [powerSettings.sourceId, link.pduId, link.deviceId],
    );
    assert.equal(
      source.location,
      `逻辑出线 ${pduById(link.pduId)!.sourcePort}`,
    );
    assert.equal(
      pdu.location,
      `后置 0U · 插座 ${String(link.outlet).padStart(2, "0")}`,
    );
    assert.equal(
      device.location,
      `${rackForDevice(link.deviceId).name} / ${unitLabel(link.deviceId)}`,
    );
    const part = inletPart(deviceById(link.deviceId)!.modelId, link.inlet);
    assert.equal(
      device.input,
      `输入 ${link.inlet} · ${entityById(part)!.name}`,
    );
  }
});

test("展开设备预览同支路不动姿态，定位经归位后可沿同一支路回到出线", () => {
  const link = powerLinks.find(
    (link) => link.deviceId === "srv-01" && link.inlet === "B",
  )!;
  let state = reviewTransition(createReview(), {
    type: "shot",
    shot: "assembly",
  });
  state = reviewTransition(state, {
    type: "scene",
    action: { type: "seek", time: 49 },
  });
  const preview = reviewTransition(state, { type: "pick", id: link.pduId });
  assert.deepEqual(preview.scene, state.scene);
  state = reviewTransition(preview, { type: "focus-resource", id: link.pduId });
  assert.equal(state.pendingId, link.pduId);
  state = reviewTransition(state, {
    type: "navigation-ready",
    key: presentationKey(state.scene),
  });
  assert.equal(state.scene.selected, link.pduId);
  state = reviewTransition(state, {
    type: "locate-installation",
    id: link.deviceId,
  });
  assert.equal(state.scene.level, "rack");
  assert.equal(
    powerScene(state.scene, state.scene.selected, link.id)?.traceId,
    link.id,
  );
  state = reviewTransition(state, {
    type: "focus-resource",
    id: powerSettings.sourceId,
  });
  assert.equal(state.scene.level, "room");
  assert.equal(state.scene.time, 49);
  const supply = powerScene(state.scene, state.scene.selected, link.id)!;
  assert.equal(supply.traceId, link.id);
  assert.equal(
    supply.labels.find((label) => label.id === "power-source")?.title,
    "逻辑出线 QF-02",
  );
});

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

test("168 路已配置输入均能进入所属电源部件，保留共享时间", () => {
  for (const link of powerLinks) {
    let review = createReview();
    review.scene.time = 49;
    review = reviewTransition(review, {
      type: "inspect-power-input",
      linkId: link.id,
    });
    assert.equal(review.scene.level, "rack");
    assert.equal(review.scene.explosion, 0);
    for (let step = 0; review.pendingEndpoint && step < 6; step++)
      review = reviewTransition(review, {
        type: "navigation-ready",
        key: presentationKey(review.scene),
      });
    assert.equal(review.pendingEndpoint, null);
    assert.equal(review.scene.level, "device");
    assert.equal(review.scene.deviceId, link.deviceId);
    assert.equal(
      review.selectedId,
      inletPart(deviceById(link.deviceId)!.modelId, link.inlet),
    );
    assert.equal(review.scene.explosion, 1);
    assert.equal(review.scene.time, 49);
    assert.equal(
      powerContextIncludes(review.selectedId, review.scene.deviceId, link.id),
      true,
    );
  }
});

test("供电部件跨实例先归位，旧反馈与未配置输入不能推进，PDU 返回保留时间", () => {
  const initial = createReview();
  assert.equal(
    reviewTransition(initial, {
      type: "inspect-power-input",
      linkId: "unknown",
    }),
    initial,
  );
  let review: ReturnType<typeof createReview> = {
    ...initial,
    scene: {
      ...initial.scene,
      level: "device" as const,
      deviceId: "sto-01",
      selected: "sto-psu-a",
      explosion: 1,
      time: 78,
    },
  };
  const link = powerLinks.find(
    (link) => link.deviceId === "srv-01" && link.inlet === "B",
  )!;
  review = reviewTransition(review, {
    type: "inspect-power-input",
    linkId: link.id,
  });
  assert.equal(review.scene.deviceId, "sto-01");
  assert.equal(review.scene.explosion, 0);
  assert.equal(
    reviewTransition(review, { type: "navigation-ready", key: "stale" }),
    review,
  );
  for (let step = 0; review.pendingEndpoint && step < 6; step++)
    review = reviewTransition(review, {
      type: "navigation-ready",
      key: presentationKey(review.scene),
    });
  assert.equal(review.scene.deviceId, "srv-01");
  review = reviewTransition(review, { type: "focus-resource", id: link.pduId });
  assert.equal(review.pendingId, link.pduId);
  assert.equal(review.pendingEndpoint, null);
  review = reviewTransition(review, {
    type: "navigation-ready",
    key: presentationKey(review.scene),
  });
  assert.equal(review.scene.level, "rack");
  assert.equal(review.selectedId, link.pduId);
  assert.equal(review.scene.time, 78);
});
