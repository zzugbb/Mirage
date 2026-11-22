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
  for (const member of [adapter, carrier, adjacent]) {
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
