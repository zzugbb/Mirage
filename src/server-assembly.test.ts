import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Box3, Mesh, Raycaster, Texture, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { assemblyChecks, assemblyMember } from "./assembly-pairs.ts";
import { assemblyPartPosition } from "./assembly-motion.ts";
import {
  modelForDevice,
  partsForDevice,
  subpartsForDevice,
} from "./catalog.ts";
import { createState, transition } from "./domain.ts";
import { deviceHeight, devices, rackForDevice } from "./installation.ts";
import { inletPart } from "./power-config.ts";
import { sourcePorts } from "./network.ts";
import { powerScene } from "./power-paths.ts";
import { layerScopeFor, poseAssemblyLayer } from "./scene/assembly-layer.ts";
import { replaceRtcProxy } from "./scene/rtc-mount.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";

async function loadServerModel() {
  const bytes = readFileSync(
    new URL("../assets/public/models/server-2u.glb", import.meta.url),
  );
  const { scene } = await new GLTFLoader()
    .register(() => ({
      name: "test-textures",
      loadTexture: async () => new Texture(),
    }))
    .parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
  const bounds = new Box3().setFromObject(scene);
  const scale = definition.server.size[0] / bounds.getSize(new Vector3()).x;
  scene.scale.setScalar(scale);
  scene.position.copy(bounds.getCenter(new Vector3())).multiplyScalar(-scale);
  scene.updateMatrixWorld(true);
  return scene;
}

test("M2 四个风扇模组按精模定位，导风罩在风扇后方避让散热器、内存与上盖", async () => {
  const id = "srv-54",
    model = modelForDevice(id);
  const scene = await loadServerModel();
  const { groups } = createEquipmentAssembly(model.id);
  const duct = groups.get(model.fanDuctLayout!.ductId)!;
  const bounds = new Box3().setFromObject(duct);
  const fans = subpartsForDevice(id).filter(
    (part) => part.parent === "fans-01",
  );
  assert.deepEqual(
    model.fanDuctLayout!.modules.map((slot) => slot.id),
    fans.map((part) => part.id),
  );
  let previousRight = -Infinity;
  for (const fan of fans) {
    const detailed = new Box3().setFromObject(
      scene.getObjectByName(fan.modelNode)!,
    );
    const proxy = new Box3().setFromObject(groups.get(fan.id)!);
    assert.ok(
      detailed
        .getCenter(new Vector3())
        .distanceTo(proxy.getCenter(new Vector3())) < 0.0001,
      fan.slot,
    );
    assert.ok(
      detailed.getSize(new Vector3()).distanceTo(proxy.getSize(new Vector3())) <
        0.003,
      fan.slot,
    );
    assert.ok(proxy.min.x > previousRight);
    assert.ok(Math.min(proxy.min.z, detailed.min.z) > bounds.max.z);
    previousRight = proxy.max.x;
  }
  const ray = new Raycaster();
  for (const name of ["part_cpu_01", "part_cpu_02", "part_memory_01"]) {
    const hardware = new Box3().setFromObject(scene.getObjectByName(name)!);
    assert.ok(hardware.min.x > bounds.min.x && hardware.max.x < bounds.max.x);
    assert.ok(hardware.min.z > bounds.min.z && hardware.max.z < bounds.max.z);
    for (const x of [hardware.min.x, hardware.max.x]) {
      for (const z of [hardware.min.z, hardware.max.z]) {
        ray.set(new Vector3(x, hardware.max.y, z), new Vector3(0, 1, 0));
        const roof = ray.intersectObject(duct)[0];
        assert.ok(roof && roof.distance > 0.001, name + " 上方留出净空");
        ray.set(new Vector3(x, bounds.max.y, z), new Vector3(0, 1, 0));
        const lid = ray.intersectObject(
          scene.getObjectByName("part_lid_01")!,
        )[0];
        assert.ok(lid && lid.distance > 0.001, "罩顶低于机盖");
      }
    }
  }
  const fanGroup = groups.get("fans-01")!;
  const startFan = fanGroup.position.toArray(),
    startDuct = duct.position.toArray();
  const configured = partsForDevice(id);
  const fanPart = configured.find((p) => p.id === "fans-01")!,
    ductPart = configured.find((p) => p.id === model.fanDuctLayout!.ductId)!;
  for (const amount of [0, 0.3, 1, 0]) {
    fanGroup.position.fromArray(
      assemblyPartPosition({ ...fanPart, position: startFan }, amount, 1),
    );
    duct.position.fromArray(
      assemblyPartPosition({ ...ductPart, position: startDuct }, amount, 1),
    );
    const fanBox = new Box3().setFromObject(fanGroup);
    const coverBox = new Box3().setFromObject(duct);
    const gap = fanBox.min.z - coverBox.max.z;
    assert.ok(gap > 0 && gap < 0.005, "罩口展开后仍对准风扇排后侧");
    assert.ok(coverBox.min.x < fanBox.min.x && coverBox.max.x > fanBox.max.x);
  }
});

test("M2 内存组的十六个编号逐一对应精模节点和简模板位", async () => {
  const id = "srv-54";
  const model = modelForDevice(id);
  const dimms = subpartsForDevice(id).filter(
    (part) => part.parent === "memory-01",
  );
  const scene = await loadServerModel();
  const { groups } = createEquipmentAssembly(model.id);
  assert.equal(dimms.length, 16);
  assert.deepEqual(
    model.memoryLayout!.slots.map((slot) => slot.id),
    dimms.map((part) => part.id),
  );
  let previousX = -Infinity;
  for (const part of dimms) {
    const mesh = scene.getObjectByName(part.modelNode);
    const simple = groups.get(part.id);
    assert.ok(mesh && simple, part.slot);
    assert.equal(simple.parent, groups.get(part.parent));
    const center = new Box3().setFromObject(mesh).getCenter(new Vector3());
    const pcb = new Box3()
      .setFromObject(simple.children[0])
      .getCenter(new Vector3());
    assert.ok(center.distanceTo(pcb) < 0.0001, part.slot);
    assert.ok(center.x > previousX, part.slot);
    previousX = center.x;
  }
});

test("M2 两路输入在精模、简模和柜内供电路径上对应同一后部槽位", async () => {
  const scene = await loadServerModel();

  const id = "srv-54",
    model = "server-2u";
  const state = transition(createState(), {
    type: "navigate",
    level: "rack",
    id,
  });
  const paths = powerScene(state, id)!.paths;
  const { groups } = createEquipmentAssembly(model);
  const check = assemblyChecks(id).find((c) => c.tool === "server-power")!;
  const { primary, companion } = check.pairs[0];
  const slots = (
    [
      ["A", primary],
      ["B", companion],
    ] as const
  ).map(([feed, member]) => {
    assert.equal(member.id, inletPart(model, feed));
    assert.deepEqual(assemblyChecks(id, member.id), [check]);
    const part = partsForDevice(id).find((p) => p.id === member.id)!;
    const detailed = new Box3().setFromObject(
      scene.getObjectByName(part.modelNodes[0])!,
    );
    const proxy = new Box3().setFromObject(groups.get(part.id)!);
    assert.ok(
      proxy.min.distanceTo(detailed.min) < 0.001 &&
        proxy.max.distanceTo(detailed.max) < 0.001,
      part.slot,
    );
    const center = detailed.getCenter(new Vector3());
    const [x, y] = paths.find((p) => p.feed === feed)!.points.at(-1)!;
    assert.ok(Math.abs(x - rackForDevice(id).position[0] - center.x) < 0.001);
    assert.ok(Math.abs(y - deviceHeight(id) - center.y) < 0.001);
    for (const [otherId, other] of groups) {
      if (part.id === otherId) continue;
      other.traverse((mesh) => {
        if (mesh instanceof Mesh)
          assert.ok(
            !proxy.intersectsBox(new Box3().setFromObject(mesh, true)),
            otherId,
          );
      });
    }
    return part;
  });
  for (const amount of [0, check.startExplosion, 1, 0]) {
    const [a, b] = slots.map((p) => {
      const group = groups.get(p.id)!;
      group.position.fromArray(assemblyPartPosition(p, amount, 1));
      return new Box3().setFromObject(group);
    });
    assert.ok(b.max.x < a.min.x, "机后观察，输入 B 始终在 A 的右侧");
  }
});

test("M2 扩展区的网卡对准机后接口与 01 架的承接面，02 架独立选择", () => {
  const id = "srv-54";
  const model = modelForDevice(id);
  const { adapter, carrier, adjacent } = model.expansionBay!;
  const panel = model.rearPanels.find(
    (item) => "partId" in item && item.partId === adapter,
  )!;
  const { groups } = createEquipmentAssembly(model.id);
  const box = (part: string, mesh?: string) => {
    const group = groups.get(part)!;
    return new Box3().setFromObject(
      mesh ? group.getObjectByName(mesh)! : group,
    );
  };
  const card = box(adapter, "adapter-pcb");
  const contact = box(adapter, "adapter-contact");
  const seat = box(carrier, "carrier-seat");
  assert.equal(
    groups.get(carrier)!.children.filter((m) => m.name === "adapter-support")
      .length,
    4,
  );
  const support = box(carrier, "adapter-support");
  assert.ok(Math.abs(card.min.y - support.max.y) < 1e-7);
  assert.ok(Math.abs(contact.min.y - seat.max.y) < 1e-7);
  assert.ok(contact.min.x >= seat.min.x && contact.max.x <= seat.max.x);
  assert.ok(contact.min.z >= seat.min.z && contact.max.z <= seat.max.z);
  assert.ok(Math.abs(card.getCenter(new Vector3()).x - panel.center[0]) < 1e-7);
  assert.ok(box(adapter).min.z >= -model.depth / 2);
  assert.ok(!box(adapter).intersectsBox(box("io-01")));
  assert.deepEqual(
    sourcePorts(id).map((p) => p.partId),
    [adapter, adapter],
  );
  const check = assemblyChecks(id).find((c) => c.tool === "expansion-bay")!;
  for (const member of [
    adapter,
    carrier,
    adjacent,
    model.expansionBay!.management,
  ]) {
    assert.deepEqual(assemblyChecks(id, member), [check]);
    assert.equal(assemblyMember(check, member)?.id, member);
  }
  for (const device of devices)
    assert.equal(
      assemblyChecks(device.id).some((c) => c.tool === check.tool),
      device.modelId === model.id,
    );
  const parts = partsForDevice(id).filter((p) =>
    [adapter, carrier, adjacent].includes(p.id),
  );
  for (const amount of [0, check.startExplosion, 1, 0]) {
    for (const part of parts)
      groups
        .get(part.id)!
        .position.fromArray(assemblyPartPosition(part, amount, 1));
    assert.ok(box(adjacent).min.x > box(carrier).max.x);
    assert.ok(
      box(adapter).min.x > box(carrier).min.x &&
        box(adapter).max.x < box(carrier).max.x,
    );
    if (amount) assert.ok(box(adapter).min.y > box(carrier).max.y);
  }
});

test("M2 管理接口的面板按机后分区定位，板孔与支柱逐个对齐，抬起接口板后露出通孔", () => {
  const model = modelForDevice("srv-54");
  const bay = model.expansionBay!;
  const { groups } = createEquipmentAssembly(model.id);
  const root = groups.get(bay.management)!;
  const group = root.getObjectByName("management-module")!;
  const board = root.getObjectByName("management-pcb")!,
    face = root.getObjectByName("management-face")!;
  const bounds = (object: typeof face) => new Box3().setFromObject(object);
  const panel = model.rearPanels.find(
    (p) => "partId" in p && p.partId === bay.management,
  )!;
  const frame = bounds(face),
    center = frame.getCenter(new Vector3());
  const near = (value: number, expected: number) =>
    assert.ok(Math.abs(value - expected) < 1e-7);
  near(center.x, panel.center[0]);
  near(center.y, panel.center[1]);
  near(frame.min.z, -model.depth / 2);
  for (const id of [
    bay.adapter,
    bay.carrier,
    bay.adjacent,
    "psu-01",
    "psu-02",
  ]) {
    assert.ok(!bounds(root).intersectsBox(bounds(groups.get(id)!)), id);
  }
  const posts = root.getObjectsByProperty("name", "management-post");
  const rings = group.getObjectsByProperty("name", "management-fastener-ring");
  assert.equal(posts.length, 4);
  assert.equal(rings.length, posts.length);
  const fixed = posts.map((post) => bounds(post));
  const sight = new Raycaster(
    new Vector3(center.x, center.y, frame.min.z - 0.01),
    new Vector3(0, 0, 1),
  );
  for (const separated of [false, true, true, false]) {
    poseAssemblyLayer(root, separated);
    root.updateWorldMatrix(true, true);
    const offset = separated ? bay.managementLift : 0;
    assert.equal(group.position.y, offset);
    assert.ok(bounds(face).equals(frame));
    const hits = sight.intersectObject(root);
    if (separated) assert.equal(hits.length, 0);
    else assert.equal(hits[0].object.name, "management-port-backing");
    for (const [index, ring] of rings.entries()) {
      const seat = fixed[index],
        hole = ring.getWorldPosition(new Vector3());
      assert.ok(seat.equals(bounds(posts[index])));
      near(hole.x, seat.getCenter(new Vector3()).x);
      near(hole.z, seat.getCenter(new Vector3()).z);
      near(bounds(board).min.y - seat.max.y, offset);
      const ray = new Raycaster(
        hole.clone().add(new Vector3(0, 0.01, 0)),
        new Vector3(0, -1, 0),
      );
      assert.equal(ray.intersectObject(root)[0].object.name, "management-tray");
    }
  }
});

test("M2 原主板电池外形只替换一次，简模与详细板面均承托 RTC，抬起后座底触片原位", async () => {
  const device = "srv-54";
  const mount = modelForDevice(device).rtcMount!;
  const check = assemblyChecks(device, mount.batteryId)[0];
  assert.equal(check.tool, "rtc-mount");
  assert.deepEqual(assemblyChecks(device, mount.boardId), [check]);
  const { primary: battery, companion: board } = check.pairs[0];
  assert.deepEqual([battery.id, board.id], [mount.batteryId, mount.boardId]);
  assert.deepEqual(battery.explode, board.explode);
  assert.ok(!assemblyChecks("srv-53", battery.id).includes(check));

  const scene = await loadServerModel();
  const detailed = scene.getObjectByName(mount.boardNode) as Mesh;
  const before = detailed.geometry.index!.count;
  const [x, y, z] = mount.boardPoint;
  const down = new Vector3(0, -1, 0);
  const surface = (mesh: typeof scene | Mesh, dx = 0, dz = 0) =>
    new Raycaster(new Vector3(x + dx, 0.1, z + dz), down).intersectObject(
      mesh,
      true,
    )[0].point.y;
  assert.ok(surface(detailed) > y + 0.005);
  replaceRtcProxy(scene);
  replaceRtcProxy(scene); // 同一几何可由多台安装实例复用。
  assert.equal(
    before - detailed.geometry.index!.count,
    mount.proxyTriangles!.count * 3,
  );
  for (const dx of [-0.01, 0, 0.01])
    for (const dz of [-0.01, 0, 0.01])
      assert.ok(Math.abs(surface(detailed, dx, dz) - y) < 1e-6);
  const { groups, positions } = createEquipmentAssembly("server-2u");
  const root = groups.get(battery.id)!;
  const bounds = (name: string) =>
    new Box3().setFromObject(root.getObjectByName(name)!);
  const holder = bounds("rtc-holder-base");
  assert.ok(Math.abs(holder.min.y - surface(groups.get(board.id)!)) < 1e-6);
  assert.deepEqual(root.position, positions.get(battery.id));
  const pad = bounds("rtc-floor-contact"),
    cell = bounds("rtc-cell-can");
  assert.ok(Math.abs(cell.min.y - pad.max.y) < 1e-7);
  for (const part of ["memory-01", "cpu-01", "cpu-02", "fans-01"])
    assert.equal(
      holder.intersectsBox(new Box3().setFromObject(groups.get(part)!)),
      false,
    );
  for (const lifted of [true, true, false, true, false]) {
    poseAssemblyLayer(root, lifted);
    root.updateMatrixWorld(true);
    assert.ok(
      Math.abs(
        bounds("rtc-cell-can").min.y - cell.min.y - (lifted ? mount.lift : 0),
      ) < 1e-7,
    );
    assert.ok(
      bounds("rtc-holder-base").equals(holder) &&
        bounds("rtc-floor-contact").equals(pad),
    );
  }
});

test("服务器机后安装位只有一套活动件，M1 两圈孔缘与 M2 原架分别留在安装面", () => {
  for (const model of ["server-1u", "server-2u"]) {
    const { root, groups } = createEquipmentAssembly(model);
    for (const id of ["nic-01", "riser-01"]) {
      const part = groups.get(id)!,
        scope = layerScopeFor(part, "rear-seat")!;
      const body = scope.moving,
        fixed = scope.members[1];
      assert.equal(
        body.getObjectsByProperty("name", "rear-moving-body").length,
        1,
      );
      if (model === "server-1u")
        assert.deepEqual(
          root.getObjectsByProperty("name", "rear-aperture-" + id),
          [fixed],
        );
      const bb = (o: typeof body) => new Box3().setFromObject(o, true);
      const home = bb(body),
        seat = bb(fixed);
      for (const open of [true, false]) {
        poseAssemblyLayer(scope.layerRoot, open);
        root.updateWorldMatrix(true, true);
        assert.ok(bb(fixed).equals(seat));
        if (open) assert.ok(bb(body).min.distanceTo(home.min) > 0.03);
        else assert.ok(bb(body).equals(home));
      }
    }
  }
});
test("M2 屏蔽罩的四只脚通过接口板长孔，抬罩后孔缘和绝缘座留在原板", () => {
  const { root, groups } = createEquipmentAssembly("server-2u"),
    part = groups.get("io-01")!;
  const scope = layerScopeFor(part, "management-feet")!;
  const feet = scope.moving.getObjectsByProperty(
    "name",
    "management-cage-foot",
  );
  const rims = part.getObjectsByProperty("name", "management-slot-rim");
  assert.equal(feet.length, 4);
  assert.equal(rims.length, 4);
  poseAssemblyLayer(part, true);
  root.updateWorldMatrix(true, true);
  const pcb = part.getObjectByName("management-pcb")!,
    fixed = new Box3().setFromObject(pcb);
  for (const open of [true, false]) {
    poseAssemblyLayer(scope.layerRoot, open);
    root.updateWorldMatrix(true, true);
    assert.ok(new Box3().setFromObject(pcb).equals(fixed));
    for (const [i, foot] of feet.entries()) {
      const a = new Box3().setFromObject(foot),
        c = a.getCenter(new Vector3()),
        d = rims[i].getWorldPosition(new Vector3());
      assert.ok(Math.abs(c.x - d.x) + Math.abs(c.z - d.z) < 1e-7);
      assert.equal(a.min.y > fixed.max.y, open);
      for (const x of [a.min.x, a.max.x])
        for (const z of [a.min.z, a.max.z])
          assert.equal(
            new Raycaster(
              new Vector3(x, fixed.min.y - 0.01, z),
              new Vector3(0, 1, 0),
            ).intersectObject(pcb).length,
            0,
          );
    }
  }
});
