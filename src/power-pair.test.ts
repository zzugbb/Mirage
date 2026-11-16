import { test } from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera } from "three";
import { createState } from "./domain.ts";
import { devices, rackForDevice } from "./installation.ts";
import { powerLinks } from "./power-config.ts";
import { powerScene, pduOutletPosition } from "./power-paths.ts";
import {
  focusedPowerScene,
  pairedPowerScene,
  powerPairLinks,
  powerViewPoints,
  powerViewFrame,
} from "./power-view.ts";
import { PowerGeometry } from "./scene/power.ts";

test("84台设备双输入只复用各自两条登记连接，A/B切换与时间质量不改变四端对应", () => {
  const state = { ...createState(), level: "room" as const };
  for (const device of devices) {
    const links = powerLinks.filter((link) => link.deviceId === device.id);
    assert.equal(links.length, 2);
    const first = pairedPowerScene(state, device.id, links[0].id)!;
    assert.equal(first.paths.length, 2);
    assert.equal(first.labels.length, 4);
    assert.deepEqual(
      first.paths.map((path) => path.feed),
      ["A", "B"],
    );
    assert.equal(new Set(first.labels.map((label) => label.id)).size, 4);
    assert.ok(
      first.labels.every((label) => label.point && label.id !== "power-source"),
    );
    for (const link of links) {
      assert.deepEqual(
        powerPairLinks(link.id).map((link) => link.inlet),
        ["A", "B"],
      );
      const single = focusedPowerScene(
        powerScene(state, device.id, link.id),
        true,
      )!;
      assert.deepEqual(
        first.paths.find((path) => path.feed === link.inlet),
        single.paths[0],
      );
      assert.deepEqual(
        single.paths[0].points[0],
        pduOutletPosition(link.pduId, link.outlet),
      );
      for (const time of [0, 52, 60, 82, 100, 120]) {
        const pair = pairedPowerScene({ ...state, time }, link.pduId, link.id)!;
        assert.deepEqual(pair.paths, first.paths);
        assert.deepEqual(pair.labels, first.labels);
      }
    }
  }
});

test("双输入仅在有效当前追踪范围开放；部件展示台、外柜和无配置端点不补关系", () => {
  for (const link of powerLinks) {
    const state = {
      ...createState(),
      deviceId: link.deviceId,
      level: "rack" as const,
    };
    assert.equal(
      powerViewPoints(state, link.deviceId, link.id, true).length,
      4,
    );
    assert.equal(
      pairedPowerScene({ ...state, level: "device" }, link.deviceId, link.id),
      null,
    );
    const other = devices.find(
      (device) => device.rackId !== rackForDevice(link.deviceId).id,
    )!;
    assert.equal(
      pairedPowerScene(
        { ...state, deviceId: other.id },
        link.deviceId,
        link.id,
      ),
      null,
    );
    assert.equal(pairedPowerScene(state, "cooling-01", link.id), null);
    assert.equal(pairedPowerScene(state, other.id, link.id), null);
  }
  for (const id of [null, "unknown"]) {
    assert.deepEqual(powerPairLinks(id), []);
    assert.equal(pairedPowerScene(createState(), "room-01", id), null);
  }
});

test("双输入四个端点在两种桌面侧栏组合中完整入镜，机柜抽出只改变所属设备两输入", () => {
  for (const device of devices) {
    const link = powerLinks.find((link) => link.deviceId === device.id)!;
    const state = {
      ...createState(),
      deviceId: device.id,
      level: "rack" as const,
    };
    const points = powerViewPoints(state, device.id, link.id, true);
    const extended = powerViewPoints(
      { ...state, trayExtended: true },
      device.id,
      link.id,
      true,
    );
    assert.deepEqual(extended[0], points[0]);
    assert.deepEqual(extended[2], points[2]);
    assert.ok(extended[1].z > points[1].z);
    assert.ok(extended[3].z > points[3].z);
    for (const [width, height] of [
      [852, 836],
      [732, 836],
      [744, 704],
      [644, 704],
    ]) {
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
          `${device.id}/${width}: ${x},${y}`,
        );
      }
    }
  }
});

test("双输入绘制四个独立端点，切回单路或未连接插座后不残留另一条路径与框标", () => {
  const geometry = new PowerGeometry(),
    state = { ...createState(), level: "room" as const };
  for (const device of devices) {
    const link = powerLinks.find((link) => link.deviceId === device.id)!;
    const pair = pairedPowerScene(state, device.id, link.id)!;
    geometry.update(pair);
    assert.equal(
      geometry.outlets.filter((endpoint) => endpoint.visible).length,
      2,
    );
    assert.equal(
      geometry.inputs.filter((endpoint) => endpoint.visible).length,
      2,
    );
    assert.equal(geometry.dots.count, 0);
    assert.ok(geometry.bands.count < 1024);
    for (const [i, path] of pair.paths.entries()) {
      assert.deepEqual(
        geometry.outlets[i].position.toArray().slice(0, 2),
        path.points[0].slice(0, 2),
      );
      assert.deepEqual(
        geometry.inputs[i].position.toArray().slice(0, 2),
        path.points.at(-1)!.slice(0, 2),
      );
    }
    geometry.update(
      focusedPowerScene(powerScene(state, device.id, link.id), true),
    );
    assert.equal(geometry.outlets[1].visible, false);
    assert.equal(geometry.inputs[1].visible, false);
    geometry.update({
      ...pair,
      traceId: null,
      paths: [],
      labels: pair.labels
        .filter((label) => label.kind === "outlet")
        .slice(0, 1),
      closeUp: false,
    });
    assert.equal(geometry.bands.count, 0);
    assert.ok(geometry.inputs.every((endpoint) => !endpoint.visible));
    assert.equal(geometry.outlets[1].visible, false);
  }
  geometry.update(null);
  assert.equal(geometry.root.visible, false);
  geometry.dispose();
});
