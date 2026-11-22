import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { poseSwitchHeatsink } from "./scene/switch-model.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import { assemblyChecks, assemblyMember } from "./assembly-pairs.ts";
import { devices } from "./installation.ts";
import { inletPart, powerLinks } from "./power-config.ts";
import { modelById } from "./catalog.ts";

const bounds = (object: THREE.Object3D) =>
  new THREE.Box3().setFromObject(object);
function overlaps(a: THREE.Box3, b: THREE.Box3) {
  const size = a.clone().intersect(b).getSize(new THREE.Vector3());
  return size.x > 1e-7 && size.y > 1e-7 && size.z > 1e-7;
}

test("交换机控制板及板上细节避让四个风扇与两路电源，后部模块互不穿插", () => {
  const assembly = createEquipmentAssembly("switch-1u");
  const modules = [
    "net-fan-01",
    "net-fan-02",
    "net-fan-03",
    "net-fan-04",
    "net-psu-a",
    "net-psu-b",
  ].map((id) => assembly.groups.get(id)!);
  assembly.groups.get("net-board")!.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const module of modules)
      assert.equal(
        overlaps(bounds(object), bounds(module)),
        false,
        `控制板穿入 ${module.userData.entityId}`,
      );
  });
  for (const [i, module] of modules.entries())
    for (const other of modules.slice(i + 1))
      assert.equal(
        overlaps(bounds(module), bounds(other)),
        false,
        `${module.userData.entityId} 与 ${other.userData.entityId} 穿插`,
      );
});

test("芯片封装与散热底座逐层贴合控制板，板面标识对准组件中心", () => {
  const assembly = createEquipmentAssembly("switch-1u");
  const board = assembly.groups.get("net-board")!;
  const substrate = bounds(board.children[0]);
  const sink = bounds(assembly.groups.get("net-asic")!);
  const asic = assembly.groups.get("net-asic")!;
  const layers = ["asic-substrate", "asic-package", "asic-sink-base"].map(
    (name) => bounds(asic.getObjectByName(name)!),
  );
  let top = substrate.max.y;
  for (const layer of layers) {
    assert.ok(Math.abs(layer.min.y - top) < 1e-7);
    top = layer.max.y;
  }
  const footprint = bounds(board.getObjectByName("switch-asic-footprint")!);
  assert.ok(footprint.min.x < sink.min.x && footprint.max.x > sink.max.x);
  assert.ok(footprint.min.z < sink.min.z && footprint.max.z > sink.max.z);
  const offset = footprint
    .getCenter(new THREE.Vector3())
    .sub(sink.getCenter(new THREE.Vector3()));
  assert.ok(Math.hypot(offset.x, offset.z) < 1e-7);
  assert.ok(substrate.min.x < sink.min.x && substrate.max.x > sink.max.x);
  assert.ok(substrate.min.z < sink.min.z && substrate.max.z > sink.max.z);
  board.traverse((object) => {
    if (object instanceof THREE.Mesh)
      assert.equal(
        overlaps(bounds(object), sink),
        false,
        "控制板元件穿入散热器",
      );
  });
});

test("分层观察只抬起散热底座和鳍片，多次切换后仍能原位贴合封装", () => {
  const chip = createEquipmentAssembly("switch-1u").groups.get("net-asic")!;
  const sink = chip.getObjectByName("asic-heatsink")!;
  const cap = chip.getObjectByName("asic-package")!;
  const substrate = chip.getObjectByName("asic-substrate")!;
  const seated = bounds(sink),
    capBounds = bounds(cap),
    substrateBounds = bounds(substrate);
  const original = sink.children.map((mesh) => bounds(mesh));
  assert.ok(sink.children.length > 1);
  for (const separated of [true, true, false, true, false]) {
    poseSwitchHeatsink(chip, separated);
    chip.updateMatrixWorld(true);
    const delta = new THREE.Vector3(0, sink.position.y, 0);
    assert.equal(sink.position.y > 0, separated);
    assert.ok(bounds(cap).equals(capBounds));
    assert.ok(bounds(substrate).equals(substrateBounds));
    assert.ok(Math.abs(bounds(sink).min.y - capBounds.max.y - delta.y) < 1e-7);
    sink.children.forEach((mesh, index) => {
      const placed = bounds(mesh),
        expected = original[index].clone().translate(delta);
      assert.ok(
        placed.min.distanceTo(expected.min) < 1e-7 &&
          placed.max.distanceTo(expected.max) < 1e-7,
      );
    });
    if (!separated) assert.ok(bounds(sink).equals(seated));
  }
});

test("交换机后部模块处于 1U 机箱范围，四个风扇仍可从后侧独立拾取", () => {
  const model = modelById("switch-1u");
  const assembly = createEquipmentAssembly(model.id);
  for (const id of [
    "net-board",
    "net-asic",
    "net-fans",
    "net-psu-a",
    "net-psu-b",
  ]) {
    const b = bounds(assembly.groups.get(id)!);
    assert.ok(b.min.z > -model.depth / 2 && b.max.z < model.depth / 2, id);
    assert.ok(b.min.y > -(model.units * 0.04445 - 0.003) / 2, id);
    assert.ok(b.max.y < (model.units * 0.04445 - 0.003) / 2, id);
  }
  for (let i = 1; i <= 4; i++) {
    const id = `net-fan-0${i}`,
      fan = assembly.groups.get(id)!;
    const origin = bounds(fan).getCenter(new THREE.Vector3());
    origin.z = -model.depth;
    const hit = new THREE.Raycaster(
      origin,
      new THREE.Vector3(0, 0, 1),
    ).intersectObject(assembly.root)[0];
    assert.ok(hit);
    let object: THREE.Object3D | null = hit.object;
    while (object && !object.userData.entityId) object = object.parent;
    assert.equal(object?.userData.entityId, id);
  }
});

test("只有 N1 安装实例提供主板装配核查，两个选择沿用其部件槽位", () => {
  for (const device of devices) {
    const check = assemblyChecks(device.id).find(
      (check) => check.tool === "switch-board",
    );
    const pair = check?.pairs[0];
    if (device.modelId === "switch-1u") {
      assert.deepEqual(
        [pair?.primary.slot, pair?.companion.slot],
        ["CTRL", "ASIC"],
      );
    } else assert.equal(pair, undefined);
  }
});

test("N1 双电源核查沿用两路输入配置，机后左右槽位与安装面板、拾取身份一致", () => {
  const model = modelById("switch-1u");
  for (const device of devices) {
    const check = assemblyChecks(device.id).find(
      (tool) => tool.tool === "switch-power",
    );
    assert.equal(Boolean(check), device.modelId === model.id);
    if (!check) continue;
    const pair = check.pairs[0];
    for (const [feed, part] of [
      ["A", pair.primary],
      ["B", pair.companion],
    ] as const) {
      assert.equal(inletPart(model.id, feed), part.id);
      assert.equal(part.slot, "PSU-" + feed);
      assert.ok(
        powerLinks.some(
          (link) => link.deviceId === device.id && link.inlet === feed,
        ),
      );
      assert.deepEqual(assemblyChecks(device.id, part.id), [check]);
      assert.equal(assemblyMember(check, part.id)?.id, part.id);
    }
  }
  const { groups, root } = createEquipmentAssembly(model.id);
  const psus = (["A", "B"] as const).map((feed) =>
    groups.get(inletPart(model.id, feed))!,
  );
  assert.ok(bounds(psus[0]).max.x < bounds(psus[1]).min.x);
  for (const psu of psus) {
    const face = psu.getObjectByName("psu-rear-panel")!;
    const panel = model.rearPanels.find(
      (p) => p.kind === "power" && p.center[0] === psu.position.x,
    )!;
    const size = bounds(face).getSize(new THREE.Vector3());
    assert.ok(
      Math.abs(size.x - panel.size[0]) < 1e-6 &&
        Math.abs(size.y - panel.size[1]) < 1e-6,
    );
    const origin = face.getWorldPosition(new THREE.Vector3());
    origin.z = -model.depth;
    let hit: THREE.Object3D | null = new THREE.Raycaster(
      origin,
      new THREE.Vector3(0, 0, 1),
    ).intersectObject(root)[0].object;
    while (hit && !hit.userData.entityId) hit = hit.parent;
    assert.equal(hit, psu);
  }
});

test("N1 端口笼底座贴合主板前沿，两排笼口均可从机前拾取为同一组件", () => {
  const { root, groups } = createEquipmentAssembly("switch-1u");
  const ports = groups.get("net-ports")!;
  const base = bounds(ports.getObjectByName("front-cage-base")!);
  const board = bounds(
    groups.get("net-board")!.getObjectByName("switch-main-board")!,
  );
  assert.ok(Math.abs(base.min.z - board.max.z) < 1e-7);
  assert.ok(base.min.y < board.max.y && base.max.y > board.min.y);
  assert.ok(Math.abs(base.max.x - board.max.x) < 1e-7);
  const front = bounds(ports).max.z;
  for (const bank of definition.switchAssembly.frontCages) {
    for (let column = 0; column < bank.columns; column++) {
      const x =
        bank.centerX + bank.width * ((column + 0.5) / bank.columns - 0.5);
      for (const y of [-0.006, 0.006]) {
        const hit = new THREE.Raycaster(
          new THREE.Vector3(x, y, front + 0.02),
          new THREE.Vector3(0, 0, -1),
        ).intersectObject(root)[0];
        assert.equal(hit?.object.name, "cage-backing");
        assert.ok(front - hit.point.z > 0.01);
        let owner: THREE.Object3D | null = hit.object;
        while (owner && !owner.userData.entityId) owner = owner.parent;
        assert.equal(owner, ports);
      }
    }
  }
  for (const device of devices) {
    const check = assemblyChecks(device.id).find(
      (item) => item.tool === "switch-front",
    );
    assert.equal(Boolean(check), device.modelId === "switch-1u");
    if (!check) continue;
    assert.deepEqual(
      [check.pairs[0].primary.slot, check.pairs[0].companion.slot],
      ["PORT", "CTRL"],
    );
    assert.deepEqual(assemblyChecks(device.id, "net-ports"), [check]);
    assert.ok(assemblyChecks(device.id, "net-board").includes(check));
    assert.ok(!assemblyChecks(device.id, "net-asic").includes(check));
  }
});
