import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createReview,
  reviewTransition,
  reviewPresentation,
} from "./review-model.ts";
import {
  findResources,
  rackUnitQuery,
  resourceCatalog,
  resourceOpenLabel,
  componentGroups,
} from "./review-resources.ts";
import { devices, rackForDevice } from "./installation.ts";
import { modelForDevice } from "./catalog.ts";
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

test("抽出后预览其他设备时，入口写明归位后的实际目的地", () => {
  let review = reviewTransition(createReview(), {
    type: "open-resource",
    id: "srv-01",
  });
  review = reviewTransition(review, { type: "extract-resource", id: "srv-01" });
  assert.equal(resourceOpenLabel(review.scene, "srv-01"), "查看设备内部");
  assert.equal(resourceOpenLabel(review.scene, "srv-03"), "查看所在机柜");
  review = reviewTransition(review, { type: "pick", id: "srv-02" });
  assert.equal(resourceOpenLabel(review.scene, "srv-02"), "切换安装位");
  const retracted = reviewTransition(review, {
    type: "scene",
    action: { type: "tray", extended: false },
  });
  assert.equal(retracted.selectedId, "srv-02");
  assert.equal(retracted.scene.deviceId, "srv-01");
  assert.equal(resourceOpenLabel(retracted.scene, "srv-02"), "查看设备内部");
  review = reviewTransition(review, { type: "open-resource", id: "srv-02" });
  assert.equal(review.scene.deviceId, "srv-01");
  review = reviewTransition(review, {
    type: "navigation-ready",
    key: presentationKey(review.scene),
  });
  assert.equal(review.scene.level, "rack");
  assert.equal(review.scene.deviceId, "srv-02");
  assert.equal(resourceOpenLabel(review.scene, "srv-02"), "查看设备内部");
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

test("安装位置按实际占用跨度逐 U 精确匹配，携带柜号的区间查询区分设备和封板", () => {
  const room = createReview().scene;
  for (const d of devices) {
    const rack = rackForDevice(d.id);
    for (
      let u = d.startUnit;
      u < d.startUnit + modelForDevice(d.id).units;
      u++
    ) {
      assert.deepEqual(
        findResources(room, `${rack.name} / U${u}`, "all").map((r) => r.id),
        [d.id],
      );
    }
  }
  assert.equal(findResources(room, "U39", "switch").length, 8);
  for (const input of [
    "B03 U27–33",
    "rack-a07 / u27 - U33",
    "B03机柜 U27至33",
    "Ｂ０３ Ｕ２７～３３",
  ]) {
    assert.deepEqual(
      findResources(room, input, "all").map((r) => r.id),
      ["srv-55", "sto-01"],
    );
    assert.deepEqual(rackUnitQuery(room, input)?.blanking, [31, 32, 33]);
  }
  assert.deepEqual(rackUnitQuery(room, "A01 U40")?.blanking, [40]);
  assert.deepEqual(findResources(room, "A01 U40", "all"), []);
  assert.equal(findResources(room, "B03 U27", "server").length, 0);
  for (const input of ["A01 U43", "U0", "B03 U33–27", "U2 U4"]) {
    assert.ok(rackUnitQuery(room, input)?.error);
    assert.deepEqual(findResources(room, input, "all"), []);
  }
  assert.equal(rackUnitQuery(room, "2U 服务器"), null);
  assert.equal(findResources(room, "0U", "facility").length, 16);
});
test("柜内按 U 位查本柜，显式指定另一机柜仍能从设备内部跨柜查找", () => {
  let review = reviewTransition(createReview(), {
    type: "open-resource",
    id: "srv-01",
  });
  for (const level of ["rack", "device"]) {
    assert.equal(review.scene.level, level);
    assert.deepEqual(
      findResources(review.scene, "U24", "all").map((r) => r.id),
      ["srv-01"],
    );
    assert.deepEqual(
      findResources(review.scene, "B03 U26", "all").map((r) => r.id),
      ["sto-01"],
    );
    review = reviewTransition(review, { type: "open-resource", id: "srv-01" });
  }
});
test("安装位置定位从展开设备先归位，自身与跨柜结果都停在安装机柜并保留回看时间", () => {
  const expanded = reviewTransition(createReview(), {
    type: "shot",
    shot: "assembly",
  });
  const start = reviewTransition(expanded, {
    type: "scene",
    action: { type: "seek", time: 49 },
  });
  for (const id of [start.scene.deviceId, "sto-01"]) {
    const preview = reviewTransition(start, { type: "pick", id });
    assert.deepEqual(preview.scene, start.scene);
    const returning = reviewTransition(preview, {
      type: "locate-installation",
      id,
    });
    assert.equal(returning.pendingId, id);
    assert.equal(returning.scene.explosion, 0);
    assert.equal(returning.scene.deviceId, start.scene.deviceId);
    assert.equal(
      reviewTransition(returning, {
        type: "navigation-ready",
        key: presentationKey(start.scene),
      }),
      returning,
    );
    const located = reviewTransition(returning, {
      type: "navigation-ready",
      key: presentationKey(returning.scene),
    });
    assert.equal(located.scene.level, "rack");
    assert.equal(located.scene.deviceId, id);
    assert.equal(located.scene.selected, id);
    assert.equal(located.scene.time, 49);
    assert.equal(located.scene.coverOpen, false);
    assert.equal(located.pendingId, null);
  }
});

test("机房总览定位设备保留机房层级与活动机型，查看安装位才进入所属机柜", () => {
  const room = createReview();
  for (const id of ["srv-01", "srv-59", "sw-01", "sto-01"]) {
    const preview = reviewTransition(room, { type: "pick", id });
    const focused = reviewTransition(preview, { type: "focus-resource", id });
    assert.deepEqual(focused.scene, {
      ...preview.scene,
      focusRevision: preview.scene.focusRevision + 1,
    });
    assert.equal(focused.selectedId, id);
    for (const type of ["locate-installation", "open-resource"] as const) {
      const rack = reviewTransition(focused, { type, id });
      assert.equal(rack.scene.level, "rack");
      assert.equal(rack.scene.deviceId, id);
      assert.equal(rack.scene.trayExtended, false);
    }
  }
});
