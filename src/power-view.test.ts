import { test } from "node:test";
import assert from "node:assert/strict";
import { Box3, PerspectiveCamera, Ray, Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { createState } from "./domain.ts";
import { powerLinks } from "./power-config.ts";
import { powerScene, pduOutletPosition } from "./power-paths.ts";
import { rackForDevice, racks } from "./installation.ts";
import {
  powerViewPoints,
  powerViewFrame,
  powerViewSource,
  focusedPowerScene,
} from "./power-view.ts";

const frames = [
  [852, 836],
  [732, 836],
  [744, 704],
  [644, 704],
];
test("168 条配置的两端在桌面可用画幅内，柜后视线避开柜顶及其他柜体", () => {
  for (const link of powerLinks) {
    const state = { ...createState(), level: "room" as const };
    const points = powerViewPoints(state, link.deviceId, link.id);
    assert.equal(points.length, 2);
    for (const [width, height] of frames) {
      const rect = {
        left: Math.min(314, width * 0.48),
        right: width - 40,
        top: 100,
        bottom: height - 48,
      };
      const fit = powerViewFrame(points, width, height, rect);
      const camera = new PerspectiveCamera(40, width / height, 0.01, 100);
      camera.position.copy(fit.position);
      camera.lookAt(fit.target);
      camera.updateMatrixWorld(true);
      for (const point of points) {
        const p = point.clone().project(camera),
          x = ((p.x + 1) * width) / 2,
          y = ((1 - p.y) * height) / 2;
        assert.ok(
          x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
          `${link.id}/${width}: ${x},${y}`,
        );
        for (const rack of racks) {
          const targetRack = rack.id === rackForDevice(link.deviceId).id;
          const [w, h, d] = definition.rack.size;
          const box = new Box3(
            new Vector3(
              rack.position[0] - w / 2,
              targetRack ? h - definition.rack.enclosure.roof.thickness / 2 : 0,
              rack.position[2] - d / 2,
            ),
            new Vector3(
              rack.position[0] + w / 2,
              h +
                (targetRack ? definition.rack.enclosure.roof.thickness / 2 : 0),
              rack.position[2] + d / 2,
            ),
          );
          const hit = new Ray(
            fit.position,
            point.clone().sub(fit.position).normalize(),
          ).intersectBox(box, new Vector3());
          assert.ok(
            !hit ||
              hit.distanceTo(fit.position) > point.distanceTo(fit.position),
            `${link.id}/${width} 被 ${rack.id} 遮挡`,
          );
        }
      }
    }
  }
});
test("插座预览和共享时间不改变构图，A/B 身份沿用源设备，未知连接与部件展示台不补对端", () => {
  for (const link of powerLinks) {
    const state = { ...createState(), level: "room" as const };
    const source = powerViewPoints(state, link.deviceId, link.id);
    assert.deepEqual(
      powerViewPoints({ ...state, time: 120 }, link.pduId, link.id),
      source,
    );
    assert.deepEqual(
      powerViewPoints(
        { ...state, level: "device", deviceId: link.deviceId },
        link.deviceId,
        link.id,
      ),
      [],
    );
    assert.equal(powerViewSource(link.id), link.deviceId);
  }
  assert.equal(powerViewSource("unknown"), null);
  assert.deepEqual(powerViewPoints(createState(), "room-01", null), []);
});
test("机柜内同框使用当前安装位与导轨姿态，外柜预览不生成错误端点", () => {
  for (const link of powerLinks) {
    const state = {
      ...createState(),
      level: "rack" as const,
      deviceId: link.deviceId,
    };
    const closed = powerViewPoints(state, link.deviceId, link.id);
    const extended = powerViewPoints(
      { ...state, trayExtended: true },
      link.deviceId,
      link.id,
    );
    assert.ok(
      Math.abs(
        extended[1].z - closed[1].z - definition.rack.motion.trayTravel,
      ) < 1e-8,
    );
    assert.deepEqual(extended[0], closed[0]);
    assert.deepEqual(
      closed[0].toArray(),
      pduOutletPosition(link.pduId, link.outlet),
    );
    assert.deepEqual(
      powerViewPoints(
        {
          ...state,
          deviceId:
            rackForDevice(link.deviceId).id === "rack-a01"
              ? "srv-59"
              : "srv-01",
        },
        link.deviceId,
        link.id,
      ),
      [],
    );
    const original = extended.map((p) => p.clone());
    powerViewFrame(extended, 744, 704, {
      left: 260,
      right: 704,
      top: 100,
      bottom: 656,
    });
    assert.deepEqual(extended, original);
  }
});

test("近景只强调显式追踪的柜内支路，未配置插座与失配范围不生成两端", () => {
  const state = { ...createState(), level: "room" as const };
  for (const link of powerLinks) {
    const scene = powerScene(state, link.deviceId, link.id)!;
    const original = structuredClone(scene);
    const focused = focusedPowerScene(scene, true)!;
    assert.equal(focused.paths.length, 1);
    assert.equal(focused.closeUp, true);
    assert.deepEqual(focused.paths[0], scene.paths.at(-1));
    assert.equal(focused.labels.length, 2);
    assert.ok(
      focused.labels.every(
        (l) => l.point && l.id !== "power-source" && l.detail === "",
      ),
    );
    assert.deepEqual(scene, original);
    assert.equal(focusedPowerScene(scene, false), scene);
    assert.deepEqual(powerViewPoints(state, "cooling-01", link.id), []);
  }
  assert.equal(focusedPowerScene(null, true), null);
  const automatic = powerScene(state, "srv-01")!;
  assert.equal(focusedPowerScene(automatic, true), automatic);
  assert.deepEqual(powerViewPoints(state, "pdu-a01-a", null), []);
  assert.deepEqual(powerViewPoints(state, "srv-01", "unknown"), []);
});

test("同框近景用细线与两端空心框，退出恢复全支路，空插座不保留旧输入标记", async () => {
  const { PowerGeometry } = await import("./scene/power.ts");
  const geometry = new PowerGeometry();
  const state = { ...createState(), level: "room" as const };
  const link = powerLinks[0];
  const scene = powerScene(state, link.deviceId, link.id)!;
  const focused = focusedPowerScene(scene, true)!;
  geometry.update(focused);
  assert.equal(geometry.input.visible, true);
  assert.equal(geometry.outlet.visible, true);
  assert.equal(geometry.dots.count, 0);
  assert.deepEqual(
    geometry.input.position.toArray().slice(0, 2),
    focused.paths[0].points.at(-1)!.slice(0, 2),
  );
  const nearBands = geometry.bands.count;
  geometry.update(scene);
  assert.equal(geometry.input.visible, false);
  assert.equal(geometry.dots.count, 2);
  assert.ok(geometry.bands.count > nearBands);
  geometry.update({
    ...scene,
    traceId: null,
    paths: [],
    labels: scene.labels.filter((l) => l.kind === "outlet"),
  });
  assert.equal(geometry.input.visible, false);
  assert.equal(geometry.outlet.visible, true);
  assert.equal(geometry.bands.count, 0);
  assert.equal(geometry.dots.count, 0);
  geometry.update(null);
  assert.equal(geometry.root.visible, false);
  assert.equal(geometry.outlet.visible, false);
  geometry.dispose();
});
