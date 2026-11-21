import { test } from "node:test";
import assert from "node:assert/strict";
import { Box3, Vector3 } from "three";
import { networkLinks, partsForDevice, modelForDevice } from "./catalog.ts";
import { createState } from "./domain.ts";
import {
  deviceHeight,
  rackForDevice,
  installedFrontZ,
} from "./installation.ts";
import { initialModelLoads } from "./model-loading.ts";
import { networkEndpoints, networkMarkers } from "./network.ts";
import {
  canShowNetworkPatch,
  networkPatch,
  patchSettings,
} from "./network-patch.ts";
import { NetworkGeometry } from "./scene/network.ts";

const rack = { ...createState(), level: "rack" as const, deviceId: "sw-14" };
const assets = initialModelLoads();
const links = networkLinks.filter((link) => canShowNetworkPatch(rack, link));

test("只开放 B03 的两条存储接入，控制器、端口组与高度跟随当前配置", () => {
  assert.deepEqual(
    links.map((link) => link.target),
    ["sw-13", "sw-14"],
  );
  const paths = links.map((link) => {
    const [source, target] = networkEndpoints(link.id);
    assert.equal(target.port, 9);
    const points = networkPatch(rack, link, assets)!;
    const local = points.map((p) =>
      p.clone().sub(new Vector3(...rackForDevice(source.deviceId).position)),
    );
    assert.ok(local[0].z < 0 && local.at(-1)!.z > 0.55);
    assert.equal(local.at(-1)!.y, deviceHeight(target.deviceId));
    for (const state of [
      { ...rack, level: "device" as const },
      { ...rack, level: "room" as const },
      { ...rack, trayExtended: true },
      { ...rack, deviceId: "srv-01" },
    ])
      assert.equal(networkPatch(state, link, assets), null);
    return local;
  });
  assert.ok(paths[0][0].x < 0 && paths[1][0].x > 0);
  assert.ok(
    Math.abs(paths[1].at(-1)!.y - paths[0].at(-1)!.y - 2 * 0.04445) < 1e-8,
  );
});

test("弯头避开柜柱、PDU 和侧板；切换分支释放旧线，预览复用当前线", () => {
  const geometry = new NetworkGeometry();
  let released = 0;
  for (const link of links) {
    const points = networkPatch(rack, link, assets)!;
    const markers = networkMarkers(rack, link.source, link.id);
    geometry.update(markers, points, link.source);
    const cable = geometry.cable!;
    const positions = cable.geometry.attributes.position;
    const origin = new Vector3(...rackForDevice(link.source).position);
    const frontPost = new Box3(
      new Vector3(0.2525, 0, 0.5025),
      new Vector3(0.2975, 2.25, 0.5475),
    );
    for (let i = 0; i < positions.count; i++) {
      const p = new Vector3().fromBufferAttribute(positions, i).sub(origin);
      assert.ok(!frontPost.containsPoint(p));
      assert.ok(p.x < 0.2875 && p.z > -0.442);
      if (p.y > points[0].y + 0.06 && p.y < deviceHeight(link.target) - 0.03)
        assert.ok(
          p.x > 0.254 &&
            p.x <= patchSettings.sideX + patchSettings.cableRadius + 1e-6,
        );
    }
    for (const object of [cable, geometry.hiddenLine!])
      object.geometry.addEventListener("dispose", () => released++);
    geometry.update(markers, points, link.target);
    assert.equal(geometry.cable, cable);
    assert.equal(geometry.root.children.length, 3);
  }
  assert.equal(released, 2);
  geometry.update([]);
  assert.equal(released, 4);
  assert.equal(geometry.root.children.length, 1);
  geometry.dispose();
});

test("从存储安装位查看时避开后置风扇，已加载外观改用后面板公共接口区", () => {
  const active = { ...rack, deviceId: "sto-01" };
  const origin = new Vector3(...rackForDevice(active.deviceId).position);
  const geometry = new NetworkGeometry();
  for (const link of links) {
    const idle = networkPatch(active, link, assets)!;
    const loaded = networkPatch(active, link, {
      ...assets,
      "storage-4u": "ready",
      "switch-1u": "ready",
    })!;
    assert.ok(idle[0].z > loaded[0].z);
    assert.ok(loaded.at(-1)!.z < idle.at(-1)!.z);
    assert.ok(
      Math.abs(loaded[0].x - origin.x) <=
        patchSettings.exteriorInterfaceWidth / 2 + 1e-8,
    );
    assert.equal(
      loaded[0].y - patchSettings.exteriorInterfaceY,
      deviceHeight(active.deviceId),
    );
    geometry.update(
      networkMarkers(active, link.source, link.id),
      idle,
      link.source,
    );
    const fan = partsForDevice(active.deviceId).find(
      (part) => part.id === "sto-fans",
    )!;
    const center = new Vector3(
      origin.x,
      deviceHeight(active.deviceId),
      origin.z + installedFrontZ - modelForDevice(active.deviceId).depth / 2,
    ).add(new Vector3(...fan.position));
    const fanBounds = new Box3().setFromCenterAndSize(
      center,
      new Vector3(...fan.size),
    );
    const points = geometry.cable!.geometry.attributes.position;
    for (let i = 0; i < points.count; i++)
      assert.ok(
        !fanBounds.containsPoint(new Vector3().fromBufferAttribute(points, i)),
      );
  }
  geometry.dispose();
});
