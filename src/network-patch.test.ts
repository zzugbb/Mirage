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
  patchSectionOffsetMm,
  patchSettings,
  patchGuideCenter,
  patchGuideKeys,
  guidesOnPatch,
  sideGuides,
} from "./network-patch.ts";
import { NetworkGeometry } from "./scene/network.ts";

import { createPatchGuides } from "./scene/rack-enclosure.ts";

const rack = { ...createState(), level: "rack" as const, deviceId: "sw-14" };
const assets = initialModelLoads();
const storageLinks = networkLinks.filter(
  (link) => modelForDevice(link.source).category === "storage",
);
const links = storageLinks.filter((link) => canShowNetworkPatch(rack, link));

test("两柜全部样板跳线按同一弧长顺序分段，实线与遮挡虚线共用分界", () => {
  const geometry = new NetworkGeometry();
  for (const link of networkLinks.filter((link) =>
    patchSettings.sourceIds.includes(link.source),
  )) {
    const state = { ...rack, deviceId: link.target };
    for (const load of ["ready", "failed"] as const) {
      const points = networkPatch(state, link, {
        ...assets,
        [modelForDevice(link.source).id]: load,
        "switch-1u": load,
      })!;
      const markers = networkMarkers(state, link.source, link.id);
      geometry.update(markers, points);
      const tube = geometry.cable!.geometry;
      const hidden = geometry.hiddenLine!.geometry;
      const full = tube.index!.count;
      let cursor = 0;
      for (const section of ["rear", "side", "front"] as const) {
        geometry.update(markers, points, link.source, section);
        assert.equal(geometry.cable!.geometry, tube);
        const { start, count } = tube.drawRange;
        assert.equal(start, cursor);
        assert.ok(count > 0 && count < full);
        const stride = tube.parameters.radialSegments * 6;
        assert.equal(hidden.drawRange.start * stride, start);
        assert.equal((hidden.drawRange.count - 1) * stride, count);
        cursor += count;
      }
      assert.equal(cursor, full);
      geometry.update(markers, points);
      assert.deepEqual(tube.drawRange, { start: 0, count: full });
      const shifted = points.map((p) => p.clone().add(new Vector3(6, 0, 0)));
      assert.equal(
        patchSectionOffsetMm(shifted, "rear"),
        patchSectionOffsetMm(points, "rear"),
      );
      const projections = [
        ["side", points.at(-7)!.y - points.at(-8)!.y],
        ["rear", points[2].x - points[0].x],
        ["front", points.at(-6)!.x - points.at(-1)!.x],
      ] as const;
      for (const [section, meters] of projections)
        assert.ok(
          Math.abs(patchSectionOffsetMm(points, section) - meters * 1000) <
            0.001,
        );
    }
  }
  geometry.dispose();
});

test("B03 柜内四条存储分支，控制器、端口组与高度跟随配置", () => {
  assert.deepEqual(
    links.map((link) => link.target),
    ["sw-13", "sw-14", "sw-13", "sw-14"],
  );
  const paths = links.map((link) => {
    const [source, target] = networkEndpoints(link.id);
    assert.equal(target.port, source.deviceId === "sto-01" ? 9 : 10);
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
  assert.equal(released, (links.length - 1) * 2);
  geometry.update([]);
  assert.equal(released, links.length * 2);
  assert.equal(geometry.root.children.length, 1);
  geometry.dispose();
});

test("从存储安装位查看时避开后置风扇，已加载外观改用后面板公共接口区", () => {
  const geometry = new NetworkGeometry();
  for (const link of links) {
    const active = { ...rack, deviceId: link.source };
    const origin = new Vector3(...rackForDevice(active.deviceId).position);
    const idle = networkPatch(active, link, assets)!;
    const loaded = networkPatch(active, link, {
      ...assets,
      "storage-4u": "ready",
      "switch-1u": "ready",
    })!;
    const [source] = networkEndpoints(link.id);
    const controller = partsForDevice(source.deviceId).find(
      (p) => p.id === source.partId,
    )!;
    for (const path of [idle, networkPatch(rack, link, assets)!]) {
      assert.ok(
        Math.abs(
          path[0].y -
            origin.y -
            deviceHeight(source.deviceId) -
            controller.position[1],
        ) < 1e-7,
      );
      assert.equal(path[0].y, path[1].y);
      assert.ok(path[1].z < path[0].z);
    }
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

test("B04 两台存储启用四条同柜接入，复用 B03 在各装配状态下的局部走线", () => {
  const b04 = { ...rack, deviceId: "sw-16" };
  const branches = storageLinks.filter((link) =>
    canShowNetworkPatch(b04, link),
  );
  assert.deepEqual(
    branches.map((link) => [link.source, link.target, link.targetPort]),
    [
      ["sto-03", "sw-15", 9],
      ["sto-03", "sw-16", 9],
      ["sto-04", "sw-15", 10],
      ["sto-04", "sw-16", 10],
    ],
  );
  const allowed = networkLinks.filter((link) =>
    canShowNetworkPatch({ ...rack, deviceId: link.source }, link),
  );
  assert.equal(allowed.length, 40);
  for (const [index, link] of branches.entries()) {
    const original = links[index];
    assert.equal(networkPatch(rack, link, assets), null);
    const ends = networkEndpoints(link.id);
    assert.equal(
      ends[0].location,
      link.source === "sto-03" ? "B04 机柜 / U25–28" : "B04 机柜 / U35–38",
    );
    assert.equal(
      ends[0].partName,
      link.sourcePort === 1 ? "控制器 A" : "控制器 B",
    );
    assert.equal(
      ends[1].location,
      link.sourcePort === 1 ? "B04 机柜 / U39" : "B04 机柜 / U41",
    );
    for (const activeEnd of ["source", "target"] as const) {
      for (const loads of [
        assets,
        { ...assets, "storage-4u": "ready", "switch-1u": "ready" },
      ] as const) {
        const previous = networkPatch(
          { ...rack, deviceId: original[activeEnd] },
          original,
          loads,
        )!;
        const next = networkPatch(
          { ...b04, deviceId: link[activeEnd] },
          link,
          loads,
        )!;
        const translation = new Vector3(
          ...rackForDevice(link.source).position,
        ).sub(new Vector3(...rackForDevice(original.source).position));
        assert.equal(previous.length, next.length);
        next.forEach((p, i) =>
          assert.ok(p.distanceTo(previous[i].clone().add(translation)) < 1e-8),
        );
      }
    }
  }
});

test("两柜八条分支按实际路径提供环位，精简两种外观的跳线均穿过对应环口", () => {
  const group = createPatchGuides();
  const branches = storageLinks.filter((link) =>
    patchSettings.sourceIds.includes(link.source),
  );
  assert.deepEqual(
    new Set(branches.map((link) => rackForDevice(link.source).id)),
    new Set(sideGuides.rackIds),
  );
  for (const link of branches) {
    const origin = new Vector3(...rackForDevice(link.source).position);
    for (const load of ["ready", "failed"] as const) {
      const points = networkPatch({ ...rack, deviceId: link.source }, link, {
        ...assets,
        [modelForDevice(link.source).id]: load,
        "switch-1u": load,
      })!;
      const [from, to] = points.slice(2, 4).map((p) => p.clone().sub(origin));
      assert.equal(from.x, to.x);
      assert.equal(from.z, to.z);
      const keys = guidesOnPatch(points, link.source);
      assert.deepEqual(
        keys,
        link.targetPort === 9 ? ["lower", "upper", "outlet"] : ["outlet"],
      );
      for (const key of keys) {
        const ring = group.getObjectByName(`patch-guide-${key}`)!;
        const center = patchGuideCenter(key);
        assert.deepEqual(ring.position.toArray(), center.toArray());
        assert.ok(
          from.y + patchSettings.bendRadius < center.y &&
            center.y < to.y - patchSettings.bendRadius,
        );
        const cable = new Vector3(from.x, center.y, from.z);
        const bounds = new Box3().setFromObject(ring);
        assert.ok(bounds.containsPoint(cable));
        assert.ok(Math.abs(bounds.max.x - sideGuides.wallX) < 1e-8);
        for (const metal of ring.children)
          assert.ok(
            new Box3().setFromObject(metal).distanceToPoint(cable) >
              patchSettings.cableRadius,
          );
      }
    }
  }
  assert.ok(patchGuideCenter("upper").y > patchGuideCenter("lower").y);
});

test("端口 10 的高位出线避开低环，弯头和管面在两种外观下均避开三个环的金属件", () => {
  const rack = rackForDevice("sto-02");
  const guides = createPatchGuides();
  guides.position.fromArray(rack.position);
  const metal = patchGuideKeys.flatMap((key) =>
    guides
      .getObjectByName(`patch-guide-${key}`)!
      .children.map((piece) => new Box3().setFromObject(piece)),
  );
  const geometry = new NetworkGeometry();
  for (const link of links.filter((link) => link.targetPort === 10)) {
    for (const load of ["ready", "failed"] as const) {
      const state = {
        ...createState(),
        level: "rack" as const,
        deviceId: link.source,
      };
      const points = networkPatch(state, link, {
        ...assets,
        [modelForDevice(link.source).id]: load,
        "switch-1u": load,
      })!;
      geometry.update(networkMarkers(state, link.source, link.id), points);
      const vertices = geometry.cable!.geometry.attributes.position;
      const vertex = new Vector3();
      for (let i = 0; i < vertices.count; i++) {
        vertex.fromBufferAttribute(vertices, i);
        assert.ok(metal.every((piece) => !piece.containsPoint(vertex)));
      }
    }
  }
  geometry.dispose();
});

test("两样板柜的 32 条服务器分支从各机型网卡区引出，再从侧壁转入对应理线环", () => {
  const branches = networkLinks.filter(
    (link) =>
      modelForDevice(link.source).category === "server" &&
      patchSettings.sourceIds.includes(link.source),
  );
  assert.equal(branches.length, 32);
  for (const link of branches) {
    const model = modelForDevice(link.source);
    const panel = model.rearPanels.find(
      (p) => "partId" in p && p.partId === "nic-01",
    )!;
    const origin = new Vector3(...rackForDevice(link.source).position);
    const ends = networkEndpoints(link.id);
    assert.equal(ends[0].partId, "nic-01");
    assert.ok(link.targetPort >= 1 && link.targetPort <= 8);
    for (const load of ["ready", "failed"] as const) {
      const state = { ...rack, deviceId: link.target };
      const points = networkPatch(state, link, {
        ...assets,
        [model.id]: load,
      })!;
      const local = points.map((p) => p.clone().sub(origin));
      assert.ok(Math.abs(local[0].x - panel.center[0]) < 1e-8);
      assert.ok(
        Math.abs(local[0].y - deviceHeight(link.source) - panel.center[1]) <
          1e-8,
      );
      assert.ok(local[0].z <= installedFrontZ - model.depth + 1e-8);
      assert.ok(local[1].z < local[0].z && local[2].z === local[1].z);
      assert.ok(Math.abs(local[2].x - patchSettings.sideX) < 1e-8);
      assert.ok(Math.abs(local[3].z - sideGuides.centerZ) < 1e-8);
      assert.ok(local[3].x === local[2].x && local[3].y === local[2].y);
      assert.deepEqual(
        guidesOnPatch(points, link.source),
        link.targetPort === 8
          ? ["upper", "outlet"]
          : ["lower", "upper", "outlet"],
      );
      assert.equal(local.at(-1)!.y, deviceHeight(link.target));
    }
  }
});

test("机柜代理沿用背板面，定位到服务器自身时改用网卡装配后缘并保留引出余量", () => {
  for (const id of ["srv-54", "srv-62"]) {
    const link = networkLinks.find((link) => link.source === id)!;
    const model = modelForDevice(id);
    const origin = new Vector3(...rackForDevice(id).position);
    for (const status of ["ready", "failed"] as const) {
      const loads = { ...assets, [model.id]: status };
      const active = networkPatch({ ...rack, deviceId: id }, link, loads)!;
      const proxy = networkPatch(
        { ...rack, deviceId: link.target },
        link,
        loads,
      )!;
      const rearFace =
        id === "srv-54" ? -0.448 : status === "ready" ? -0.406285 : -0.36;
      assert.ok(
        Math.abs(
          active[0].z - origin.z - installedFrontZ + model.depth / 2 - rearFace,
        ) < 1e-7,
      );
      assert.ok(
        active[0].z - active[1].z >= patchSettings.rearClearance - 1e-8,
      );
      assert.ok(
        Math.abs(
          proxy[0].z - origin.z - installedFrontZ + model.depth + 0.008,
        ) < 1e-7,
      );
      assert.deepEqual(guidesOnPatch(proxy, id), guidesOnPatch(active, id));
    }
  }
});
