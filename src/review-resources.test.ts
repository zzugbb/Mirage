import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createReview,
  reviewTransition,
  reviewPresentation,
} from "./review-model.ts";
import {
  findResources,
  resourceCatalog,
  componentGroups,
} from "./review-resources.ts";
import { presentationKey } from "./domain.ts";

test("资源可按中文类型、编号、组合位置和 U 位查找，结果明确标出机型与位置", () => {
  const state = createReview().scene;
  const servers = findResources(state, "服务器", "all");
  assert.equal(servers.length, 64);
  assert.equal(findResources(state, "", "switch").length, 16);
  assert.equal(findResources(state, "", "storage").length, 4);
  assert.equal(findResources(state, "A01 U23", "all")[0].id, "srv-01");
  const compact = findResources(state, "srv59", "all");
  assert.equal(compact.length, 1);
  assert.match(compact[0].name, /1U 服务器.*SRV-59/);
  assert.match(compact[0].location, /B04.*U/);
  assert.equal(findResources(state, "不存在的资源", "all").length, 0);
});

test("单击只改变选择，跨设备预览保持镜头、模型实例和结构姿态", () => {
  let review = createReview();
  const before = review.scene;
  review = reviewTransition(review, { type: "pick", id: "srv-59" });
  assert.deepEqual(review.scene, { ...before, selected: "srv-59" });
  assert.equal(review.scene.deviceId, "srv-01");
  review = reviewTransition(review, { type: "open-resource", id: "srv-01" });
  assert.equal(findResources(review.scene, "srv01", "all").length, 1);
  review = reviewTransition(review, { type: "open-resource", id: "srv-01" });
  review = reviewTransition(review, { type: "pick", id: "memory-01" });
  assert.equal(review.scene.explosion, 0, "预览内存不自动展开");
  const device = review.scene;
  review = reviewTransition(review, { type: "pick", id: "srv-59" });
  assert.equal(review.scene, device);
  assert.equal(review.selectedId, "srv-59");
});

test("查看设备先到所在机柜，只有第二次明确查看才进入内部", () => {
  let review = reviewTransition(createReview(), {
    type: "open-resource",
    id: "srv-59",
  });
  assert.equal(review.scene.level, "rack");
  assert.equal(review.scene.deviceId, "srv-59");
  assert.equal(review.scene.doorOpen, false);
  assert.equal(review.scene.trayExtended, false);
  assert.equal(review.scene.time, 60);
  review = reviewTransition(review, { type: "open-resource", id: "srv-59" });
  assert.equal(review.scene.level, "device");
  assert.equal(review.scene.doorOpen, true);
  assert.equal(review.scene.trayExtended, true);
});

test("抽出操作作用于明确选择的设备，已伸出的设备必须先归位才能换对象", () => {
  let review = reviewTransition(createReview(), {
    type: "open-resource",
    id: "rack-a01",
  });
  review = reviewTransition(review, { type: "pick", id: "srv-02" });
  assert.equal(review.scene.deviceId, "srv-01");
  review = reviewTransition(review, { type: "extract-resource", id: "srv-02" });
  assert.equal(review.scene.deviceId, "srv-02");
  assert.equal(review.scene.trayExtended, true);
  assert.equal(review.scene.level, "rack");
  assert.equal(
    reviewTransition(review, { type: "extract-resource", id: "srv-01" }),
    review,
  );
  review = reviewTransition(review, { type: "extract-resource", id: "srv-02" });
  assert.equal(review.scene.trayExtended, false);
});

test("跨位置进入先归位旧设备，等待对应就绪信号后切换，旧反馈不能提前换模", () => {
  let review = reviewTransition(createReview(), {
    type: "shot",
    shot: "assembly",
  });
  review = reviewTransition(review, { type: "open-resource", id: "srv-59" });
  assert.equal(review.pendingId, "srv-59");
  assert.equal(review.scene.deviceId, "srv-01");
  assert.equal(review.scene.level, "rack");
  const returning = review;
  const cancelled = reviewTransition(returning, { type: "pick", id: "srv-58" });
  assert.equal(cancelled.pendingId, null);
  assert.equal(
    reviewTransition(cancelled, {
      type: "navigation-ready",
      key: presentationKey(cancelled.scene),
    }),
    cancelled,
    "新预览取消尚未完成的后续跳转",
  );
  assert.equal(
    reviewTransition(review, { type: "navigation-ready", key: "旧反馈" }),
    returning,
  );
  review = reviewTransition(review, {
    type: "navigation-ready",
    key: presentationKey(review.scene),
  });
  assert.equal(review.pendingId, null);
  assert.equal(review.scene.deviceId, "srv-59");
  assert.equal(review.scene.level, "rack");
  assert.equal(review.scene.explosion, 0);
  assert.equal(review.scene.trayExtended, false);
  assert.equal(review.scene.time, 60);
});

test("部件按当前配置分组，机柜列表按 U 位排列；告警与其他视图共享对象和时间", () => {
  let review = reviewTransition(createReview(), {
    type: "open-resource",
    id: "rack-a01",
  });
  const inRack = findResources(review.scene, "", "all");
  assert.equal(inRack.length, 12);
  assert.equal(
    inRack.filter((resource) => resource.kind === "facility").length,
    2,
  );
  assert.match(inRack[0].name, /交换机/);
  assert.match(inRack[0].location, /U41/);
  review = reviewTransition(review, { type: "open-resource", id: "srv-01" });
  const parts = resourceCatalog(review.scene.deviceId).filter(
    (r) => r.kind === "part",
  );
  assert.equal(parts.length, 57);
  for (const part of parts) assert.ok(componentGroups.includes(part.group!));
  assert.equal(findResources(review.scene, "DIMM 07", "all")[0].id, "dimm-07");
  const scene = review.scene,
    selected = review.selectedId;
  review = reviewTransition(review, { type: "layer", layer: "alarms" });
  assert.equal(review.scene, scene);
  assert.equal(review.selectedId, selected);
  assert.equal(reviewPresentation("alarms", "room").mode, "alarms");
});
