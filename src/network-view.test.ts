import { test } from "node:test";
import assert from "node:assert/strict";
import { Box3, PerspectiveCamera, Ray, Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { createState } from "./domain.ts";
import { networkLinks } from "./catalog.ts";
import { rackForDevice, racks } from "./installation.ts";
import {
  networkViewPoints,
  networkViewFrame,
  networkViewSource,
} from "./network-view.ts";

const frames = [
  [852, 836],
  [732, 836],
  [744, 704],
  [644, 704],
];
test("136 条配置的两端在桌面可用画幅内，后排视线不穿过其他柜体", () => {
  for (const link of networkLinks) {
    const state = { ...createState(), level: "room" as const };
    const points = networkViewPoints(state, link.source, link.id);
    assert.equal(points.length, 2);
    for (const [width, height] of frames) {
      const rect = {
        left: Math.min(314, width * 0.48),
        right: width - 40,
        top: 100,
        bottom: height - 48,
      };
      const fit = networkViewFrame(points, width, height, rect);
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
          if (rack.id === rackForDevice(link.source).id) continue;
          const [w, h, d] = definition.rack.size;
          const box = new Box3(
            new Vector3(rack.position[0] - w / 2, 0, rack.position[2] - d / 2),
            new Vector3(rack.position[0] + w / 2, h, rack.position[2] + d / 2),
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
test("端点预览和共享时间不改变构图，A/B 身份沿用源设备，未知连接与部件展示台不补对端", () => {
  for (const link of networkLinks) {
    const state = { ...createState(), level: "room" as const };
    const source = networkViewPoints(state, link.source, link.id);
    assert.deepEqual(
      networkViewPoints({ ...state, time: 120 }, link.target, link.id),
      source,
    );
    assert.deepEqual(
      networkViewPoints(
        { ...state, level: "device", deviceId: link.source },
        link.source,
        link.id,
      ),
      [],
    );
    assert.equal(networkViewSource(link.id), link.source);
  }
  assert.equal(networkViewSource("unknown"), null);
  assert.deepEqual(networkViewPoints(createState(), "room-01", null), []);
});
test("机柜内同框使用当前安装位与导轨姿态，外柜预览不生成错误端点", () => {
  for (const link of networkLinks) {
    const state = {
      ...createState(),
      level: "rack" as const,
      deviceId: link.source,
    };
    const closed = networkViewPoints(state, link.source, link.id);
    const extended = networkViewPoints(
      { ...state, trayExtended: true },
      link.source,
      link.id,
    );
    assert.ok(
      Math.abs(
        extended[0].z - closed[0].z - definition.rack.motion.trayTravel,
      ) < 1e-8,
    );
    assert.deepEqual(extended[1], closed[1]);
    assert.deepEqual(
      networkViewPoints(
        {
          ...state,
          deviceId:
            rackForDevice(link.source).id === "rack-a01" ? "srv-59" : "srv-01",
        },
        link.source,
        link.id,
      ),
      [],
    );
    const original = extended.map((p) => p.clone());
    networkViewFrame(extended, 744, 704, {
      left: 260,
      right: 704,
      top: 100,
      bottom: 656,
    });
    assert.deepEqual(extended, original);
  }
});
