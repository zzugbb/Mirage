import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  networkSettings,
  networkEndpoints,
  sourcePorts,
  switchPorts,
  switchRole,
  networkLinksFor,
  networkDeviceId,
  networkMarkers,
  networkContextIncludes,
} from "./network.ts";
import { networkLinks, modelForDevice, unitLabel } from "./catalog.ts";
import { devices, racks } from "./installation.ts";
import { createState, presentationKey } from "./domain.ts";
import { NetworkGeometry } from "./scene/network.ts";
import { createReview, reviewTransition } from "./review-model.ts";

test("136 条接入和逻辑端口契约一致，A/B 身份显式登记，不生成 100G 上联", () => {
  assert.equal(networkLinks.length, 136);
  assert.equal(networkSettings.switchRoles.length, 16);
  assert.equal(
    new Set(networkSettings.switchRoles.map((r) => r.deviceId)).size,
    16,
  );
  assert.equal(switchPorts.length, 54);
  assert.equal(switchPorts.filter((p) => p.speedGbps === 25).length, 48);
  assert.equal(switchPorts.filter((p) => p.speedGbps === 100).length, 6);
  const endpoints = new Set<string>();
  for (const link of networkLinks) {
    const source = sourcePorts(link.source).find(
      (p) => p.port === link.sourcePort,
    )!;
    assert.ok(source);
    assert.ok(modelForDevice(link.source).parts.includes(source.partId));
    assert.equal(source.speedGbps, link.speedGbps);
    assert.equal(
      switchPorts.find((p) => p.port === link.targetPort)!.speedGbps,
      link.speedGbps,
    );
    assert.equal(switchRole(link.target), link.sourcePort === 1 ? "A" : "B");
    for (const key of [
      `${link.source}:${link.sourcePort}`,
      `${link.target}:${link.targetPort}`,
    ]) {
      assert.ok(!endpoints.has(key));
      endpoints.add(key);
    }
  }
  for (const rack of racks) {
    const links = networkLinksFor(rack.id, "srv-01");
    assert.ok(
      links.every(
        (l) => devices.find((d) => d.id === l.source)!.rackId === rack.id,
      ),
    );
  }
  assert.deepEqual(
    sourcePorts("sto-01").map((p) => p.partId),
    [
      "sto-controller-a",
      "sto-controller-b",
      "sto-controller-a",
      "sto-controller-b",
    ],
  );
  assert.equal(networkLinksFor("sto-01", "srv-01").length, 2);
  assert.equal(
    networkLinks.some((l) => l.source === "sto-01" && l.sourcePort > 2),
    false,
  );
});

test("端口关系按当前实例与部件归属查找，不将离线推断为断链", () => {
  assert.equal(networkLinksFor("srv-25", "srv-01").length, 2);
  assert.equal(networkDeviceId("nic-01", "srv-05"), "srv-05");
  assert.equal(networkDeviceId("sto-controller-a", "sto-01"), "sto-01");
  assert.equal(networkDeviceId("sto-controller-a", "srv-01"), null);
  assert.equal(networkLinksFor("nic-01", "srv-05").length, 2);
  for (const id of [
    "room-01",
    "power-01",
    "cooling-01",
    "pdu-a01-a",
    "unknown",
  ])
    assert.equal(networkLinksFor(id, "srv-01").length, 0);
  assert.ok(networkContextIncludes("sw-01", "srv-01", "link-srv-01-0"));
  assert.equal(
    networkContextIncludes("sw-02", "srv-01", "link-srv-01-0"),
    false,
  );
});

test("场景只标记所选链路端点，支持抽出位移，内部不残留房间标记", () => {
  const base = createState(),
    link = "link-srv-01-0";
  const room = networkMarkers(base, "srv-01", link);
  assert.equal(room.length, 2);
  assert.ok(room.every((m) => m.point && !m.partId));
  const rack = { ...base, level: "rack" as const };
  const before = networkMarkers(rack, "srv-01", link);
  const extended = networkMarkers(
    { ...rack, trayExtended: true },
    "srv-01",
    link,
  );
  assert.ok(
    Math.abs(extended[0].point![2] - before[0].point![2] - 0.58) < 1e-8,
  );
  assert.deepEqual(extended[1].point, before[1].point);
  assert.equal(
    networkMarkers(
      { ...rack, deviceId: devices.find((d) => d.rackId !== "rack-a01")!.id },
      "srv-01",
      link,
    ).length,
    0,
  );
  const internal = networkMarkers({ ...base, level: "device" }, "srv-01", link);
  assert.equal(internal.length, 1);
  assert.equal(internal[0].partId, "nic-01");
  assert.equal(internal[0].point, undefined);
  assert.equal(
    networkMarkers(
      {
        ...base,
        level: "device",
        deviceId: devices.find((d) => d.rackId !== "rack-a01")!.id,
      },
      "srv-01",
      link,
    ).length,
    0,
  );
  assert.deepEqual(
    networkMarkers({ ...base, time: 120 }, "srv-01", link),
    room,
  );
  assert.equal(networkMarkers(base, "cooling-01", link).length, 0);
  assert.equal(networkMarkers(base, "srv-01", null).length, 0);
});

test("服务器网卡、交换机端口组和存储控制器都有显式部件端点", () => {
  for (const id of ["srv-01", "srv-05", "sw-01", "sto-01"]) {
    const links = networkLinksFor(id, id);
    for (const link of links) {
      const markers = networkMarkers(
        { ...createState(), level: "device", deviceId: id },
        id,
        link.id,
      );
      assert.equal(markers.length, 1);
      assert.ok(modelForDevice(id).parts.includes(markers[0].partId!));
    }
  }
  const storage = networkLinksFor("sto-01", "sto-01");
  assert.deepEqual(
    storage.map(
      (link) =>
        networkMarkers(
          { ...createState(), level: "device", deviceId: "sto-01" },
          "sto-01",
          link.id,
        )[0].partId,
    ),
    ["sto-controller-a", "sto-controller-b"],
  );
});

test("标记复用实例缓冲，跟随部件世界位置，保留深度并完整释放", () => {
  const geometry = new NetworkGeometry();
  const part = new THREE.Group();
  part.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.3)));
  part.position.set(1, 2, 3);
  part.updateMatrixWorld(true);
  const parts = new Map([["nic-01", part]]);
  const state = { ...createState(), level: "device" as const };
  geometry.update(networkMarkers(state, "srv-01", "link-srv-01-0"));
  geometry.frame(true, parts);
  assert.equal(geometry.dots.count, 1);
  assert.equal(geometry.root.visible, true);
  assert.equal(geometry.material.depthTest, true);
  const buffer = geometry.dots.instanceMatrix;
  const matrix = new THREE.Matrix4();
  geometry.dots.getMatrixAt(0, matrix);
  assert.deepEqual(
    new THREE.Vector3().setFromMatrixPosition(matrix).toArray(),
    [1, 2, 3],
  );
  part.position.y += 0.5;
  part.updateMatrixWorld(true);
  geometry.frame(true, parts);
  geometry.dots.getMatrixAt(0, matrix);
  assert.equal(matrix.elements[13], 2.5);
  assert.equal(geometry.dots.instanceMatrix, buffer);
  geometry.frame(false, parts);
  assert.equal(geometry.root.visible, false);
  geometry.update([]);
  geometry.frame(true, parts);
  assert.equal(geometry.dots.count, 0);
  let disposals = 0;
  geometry.geometry.addEventListener("dispose", () => disposals++);
  geometry.material.addEventListener("dispose", () => disposals++);
  geometry.dispose();
  assert.equal(disposals, 2);
  assert.equal(geometry.root.children.length, 0);
});

test("从展开存储定位交换机先安全复原，保留共享时间和原设备身份", () => {
  let review = createReview();
  review = {
    ...review,
    scene: {
      ...review.scene,
      level: "device",
      deviceId: "sto-01",
      selected: "sto-controller-a",
      explosion: 1,
      time: 78,
    },
    selectedId: "sto-controller-a",
  };
  const peer = networkLinksFor("sto-01", "sto-01")[0].target;
  review = reviewTransition(review, { type: "open-resource", id: peer });
  assert.equal(review.pendingId, peer);
  assert.equal(review.scene.explosion, 0);
  assert.equal(review.scene.deviceId, "sto-01");
  review = reviewTransition(review, {
    type: "navigation-ready",
    key: presentationKey(review.scene),
  });
  assert.equal(review.pendingId, null);
  assert.equal(review.scene.level, "rack");
  assert.equal(review.scene.deviceId, peer);
  assert.equal(review.scene.time, 78);
});

test("两端编号与逻辑端口、位置、部件归属一致，反向查看不翻转身份", () => {
  assert.deepEqual(networkEndpoints(null), []);
  assert.deepEqual(networkEndpoints("unknown"), []);
  for (const link of networkLinks) {
    const endpoints = networkEndpoints(link.id);
    assert.deepEqual(
      endpoints.map((e) => e.deviceId),
      [link.source, link.target],
    );
    assert.deepEqual(
      endpoints.map((e) => e.ordinal),
      ["①", "②"],
    );
    assert.deepEqual(
      endpoints.map((e) => e.port),
      [link.sourcePort, link.targetPort],
    );
    for (const endpoint of endpoints) {
      assert.ok(endpoint.location.includes(unitLabel(endpoint.deviceId)));
      assert.ok(
        modelForDevice(endpoint.deviceId).parts.includes(endpoint.partId),
      );
      const state = {
        ...createState(),
        level: "device" as const,
        deviceId: endpoint.deviceId,
      };
      // 选择另一端仅预览，当前模型仍只显示本端所属部件。
      const peer = endpoints.find((e) => e.deviceId !== endpoint.deviceId)!;
      const markers = networkMarkers(state, peer.deviceId, link.id);
      assert.equal(markers.length, 1);
      assert.equal(markers[0].deviceId, endpoint.deviceId);
      assert.equal(markers[0].partId, endpoint.partId);
      assert.equal(markers[0].title, `${endpoint.ordinal} ${endpoint.name}`);
    }
  }
});

test("端点空心标记面向观察镜头，保留遮挡与中心空白，切换关系不残留实例", () => {
  const geometry = new NetworkGeometry();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(2, 3, 5);
  camera.lookAt(0, 0, 0);
  const markers = networkMarkers(createState(), "srv-01", "link-srv-01-0");
  geometry.update(markers);
  geometry.frame(true, new Map(), camera);
  assert.equal(geometry.dots.count, 2);
  const matrix = new THREE.Matrix4(),
    quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3(),
    scale = new THREE.Vector3();
  geometry.dots.getMatrixAt(1, matrix);
  matrix.decompose(position, quaternion, scale);
  assert.ok(quaternion.normalize().angleTo(camera.quaternion) < 1e-6);
  assert.ok(
    position.distanceTo(new THREE.Vector3(...markers[1].point!)) < 1e-6,
  );
  const positions = geometry.geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const radius = Math.hypot(positions.getX(i), positions.getY(i));
    assert.ok(radius >= 0.0199 && radius <= 0.0261);
  }
  assert.equal(geometry.material.depthTest, true);
  geometry.update(markers.slice(1));
  assert.equal(geometry.root.visible, false);
  geometry.frame(true, new Map(), camera);
  assert.equal(geometry.dots.count, 1);
  geometry.update([]);
  geometry.frame(true, new Map(), camera);
  assert.equal(geometry.root.visible, false);
  geometry.dispose();
});

function finishEndpoint(state: ReturnType<typeof createReview>) {
  for (let step = 0; state.pendingEndpoint && step < 6; step++)
    state = reviewTransition(state, {
      type: "navigation-ready",
      key: presentationKey(state.scene),
    });
  assert.equal(state.pendingEndpoint, null, "有限阶段后必须完成定位");
  return state;
}

test("四机型的网络部件可从机房直接查看，先到安装位再进入并展开，时间不重置", () => {
  for (const id of ["srv-01", "srv-05", "sw-01", "sto-01"]) {
    for (const link of networkLinksFor(id, id)) {
      const endpoint = networkEndpoints(link.id).find(
        (e) => e.deviceId === id,
      )!;
      let state = createReview();
      state.scene.time = 78;
      state = reviewTransition(state, {
        type: "inspect-network-endpoint",
        linkId: link.id,
        deviceId: id,
      });
      assert.equal(state.scene.level, "rack");
      assert.equal(state.scene.deviceId, id);
      assert.equal(state.scene.trayExtended, false);
      assert.equal(state.scene.explosion, 0);
      assert.equal(state.selectedId, id);
      const before = state;
      state = reviewTransition(state, { type: "navigation-ready", key: "old" });
      assert.equal(state, before, "旧反馈不得推进结构");
      state = reviewTransition(state, {
        type: "navigation-ready",
        key: presentationKey(state.scene),
      });
      assert.equal(state.scene.level, "device");
      assert.equal(state.scene.explosion, 0, "进入完成前不提前展开");
      state = finishEndpoint(state);
      assert.equal(state.selectedId, endpoint.partId);
      assert.equal(state.scene.selected, endpoint.partId);
      assert.equal(state.scene.explosion, 1);
      assert.equal(state.scene.time, 78);
      assert.equal(
        networkMarkers(state.scene, state.selectedId, link.id).length,
        1,
      );
    }
  }
});

test("跨网络端点与同名部件实例先复原旧设备，安装位操作始终返回机柜", () => {
  const link = networkLinksFor("sto-01", "sto-01")[0];
  let state = finishEndpoint(
    reviewTransition(createReview(), {
      type: "inspect-network-endpoint",
      linkId: link.id,
      deviceId: "sto-01",
    }),
  );
  state = reviewTransition(state, {
    type: "inspect-network-endpoint",
    linkId: link.id,
    deviceId: link.target,
  });
  assert.equal(state.scene.deviceId, "sto-01");
  assert.equal(state.scene.level, "rack");
  assert.equal(state.scene.explosion, 0);
  state = finishEndpoint(state);
  assert.equal(state.scene.deviceId, link.target);
  assert.equal(state.selectedId, "net-ports");
  const peer = networkLinksFor("sto-01", "sto-01")[1];
  state = finishEndpoint(
    reviewTransition(state, {
      type: "inspect-network-endpoint",
      linkId: peer.id,
      deviceId: peer.target,
    }),
  );
  assert.equal(
    state.scene.deviceId,
    peer.target,
    "共用 net-ports ID 不混淆交换机实例",
  );
  assert.equal(state.selectedId, "net-ports");
  state = reviewTransition(state, {
    type: "locate-installation",
    id: "sto-01",
  });
  assert.equal(state.pendingId, "sto-01");
  state = reviewTransition(state, {
    type: "navigation-ready",
    key: presentationKey(state.scene),
  });
  for (let count = 0; count < 2; count++) {
    state = reviewTransition(state, {
      type: "locate-installation",
      id: "sto-01",
    });
    assert.equal(state.scene.level, "rack");
    assert.equal(state.scene.explosion, 0);
    assert.equal(state.scene.trayExtended, false);
  }
});

test("网络部件导航拒绝非端点并可被资源选择或预设取消，回看不丢失目的地", () => {
  const base = createReview();
  assert.equal(
    reviewTransition(base, {
      type: "inspect-network-endpoint",
      linkId: "link-srv-01-0",
      deviceId: "sto-01",
    }),
    base,
  );
  const pending = reviewTransition(base, {
    type: "inspect-network-endpoint",
    linkId: "link-srv-01-0",
    deviceId: "srv-01",
  });
  const sought = reviewTransition(pending, {
    type: "scene",
    action: { type: "seek", time: 35 },
  });
  assert.equal(finishEndpoint(sought).scene.time, 35);
  for (const action of [
    { type: "pick", id: "rack-a05" },
    { type: "shot", shot: "overview" },
    { type: "scene", action: { type: "back" } },
    { type: "tour-restart" },
  ] as const) {
    const canceled = reviewTransition(pending, action);
    assert.equal(canceled.pendingEndpoint, null);
    const after = reviewTransition(canceled, {
      type: "navigation-ready",
      key: presentationKey(canceled.scene),
    });
    assert.notEqual(after.selectedId, "nic-01");
  }
});
