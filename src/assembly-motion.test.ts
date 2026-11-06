import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceAssembly, assemblyPartPosition } from "./assembly-motion.ts";
import { createState, transition, parts, presentationKey } from "./domain.ts";
import { createReview, reviewTransition } from "./review-model.ts";
import { StructurePresentation } from "./scene/presentation.ts";
import { createRackRearDoors } from "./scene/rack-enclosure.ts";
import type { SceneModel } from "./scene/models.ts";
import * as THREE from "three";

test("独立开盖不移动其他部件；切换图层、回看和重播保留开盖姿态", () => {
  assert.equal(
    transition(createState(), { type: "cover", open: true }).coverOpen,
    false,
  );
  let scene = transition(createState(), { type: "navigate", level: "device" });
  const key = presentationKey(scene);
  scene = transition(scene, { type: "cover", open: true });
  assert.notEqual(presentationKey(scene), key);
  assert.equal(scene.explosion, 0);
  const lid = parts.find((p) => p.id === "lid-01")!,
    board = parts.find((p) => p.id === "board-01")!;
  assert.deepEqual(assemblyPartPosition(board, 0, 1), board.position);
  assert.deepEqual(assemblyPartPosition(lid, 0, 0), lid.position);
  const lifted = assemblyPartPosition(lid, 0, 0.22);
  assert.equal(lifted[0], lid.position[0]);
  assert.ok(lifted[1] > lid.position[1]);
  assert.ok(assemblyPartPosition(lid, 0, 1)[0] < lid.position[0] - 0.45);
  let review = { ...createReview(), scene };
  for (const layer of ["environment", "power", "alarms", "overview"] as const) {
    review = reviewTransition(review, { type: "layer", layer });
    assert.equal(review.scene, scene);
  }
  for (const action of [
    { type: "seek", time: 96 },
    { type: "replay" },
  ] as const) {
    scene = transition(scene, action);
    assert.equal(scene.coverOpen, true);
    assert.equal(scene.explosion, 0);
  }
  assert.equal(transition(scene, { type: "back" }).coverOpen, false);
  assert.equal(
    transition(scene, { type: "select", id: "srv-08" }).coverOpen,
    false,
  );
  assert.equal(
    transition(scene, { type: "navigate", level: "device", id: "srv-08" })
      .coverOpen,
    false,
  );
  const network = transition(scene, {
    type: "navigate",
    level: "device",
    id: "sw-01",
  });
  assert.equal(transition(network, { type: "cover", open: true }), network);
});

test("自动取盖在先、展开在后；部件复原后再合盖，连续反向操作保持归位", () => {
  let pose = { cover: 0, explosion: 0 };
  const closed = { hasCover: true, coverOpen: false, explosion: 0 };
  const expanded = { hasCover: true, coverOpen: false, explosion: 1 };
  for (let cycle = 0; cycle < 8; cycle++) {
    for (let i = 0; i < 240; i++) {
      pose = advanceAssembly(pose, expanded, 1 / 60);
      if (pose.explosion > 0) assert.equal(pose.cover, 1);
    }
    assert.deepEqual(pose, { cover: 1, explosion: 1 });
    for (let i = 0; i < 240; i++) {
      pose = advanceAssembly(pose, closed, 1 / 60);
      if (pose.explosion > 0) assert.equal(pose.cover, 1);
    }
    assert.deepEqual(pose, { cover: 0, explosion: 0 });
    for (let i = 0; i < 15; i++) pose = advanceAssembly(pose, expanded, 1 / 60);
    for (let i = 0; i < 240; i++) pose = advanceAssembly(pose, closed, 1 / 60);
    assert.deepEqual(pose, { cover: 0, explosion: 0 });
  }
  let open = { cover: 1, explosion: 1 };
  for (let i = 0; i < 240; i++)
    open = advanceAssembly(open, { ...closed, coverOpen: true }, 1 / 60);
  assert.deepEqual(
    open,
    { cover: 1, explosion: 0 },
    "手动开盖后复原部件应保留开盖",
  );
  assert.deepEqual(advanceAssembly(pose, expanded, 0, true), {
    cover: 1,
    explosion: 1,
  });
  assert.deepEqual(
    advanceAssembly({ cover: 1, explosion: 1 }, closed, 0, true),
    { cover: 0, explosion: 0 },
  );
  assert.equal(
    advanceAssembly(pose, { ...expanded, hasCover: false }, 1 / 60).cover,
    0,
  );
  assert.equal(
    advanceAssembly(
      { cover: 1, explosion: 1 },
      { ...expanded, hasCover: false },
      1 / 60,
    ).cover,
    0,
  );
});

test("返回机柜和切换实例须等待上盖合拢，再离开结构工作台", () => {
  const models = {
    rack: new THREE.Group().add(createRackRearDoors()),
    server: new THREE.Group(),
    rackDoor: new THREE.Group(),
    rackSlide: new THREE.Group(),
    railMount: new THREE.Group(),
  } as unknown as SceneModel;
  const presentation = new StructurePresentation(models);
  presentation.pose = { door: 1, tray: 1, inspection: 1 };
  const rack = transition(
    transition(createState(), { type: "navigate", level: "device" }),
    { type: "back" },
  );
  for (let i = 0; i < 90; i++) {
    const frame = presentation.step(rack, 1 / 60, false, 0, 1);
    assert.equal(presentation.pose.inspection, 1);
    assert.equal(frame.phase, "closing-cover");
  }
  presentation.step(rack, 1 / 60, false, 0, 0);
  assert.ok(presentation.pose.inspection < 1);
});
