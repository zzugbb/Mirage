import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  poseAssemblyLayer,
  layerScopeFor,
  scopeBounds,
} from "./scene/assembly-layer.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";

import { RearModuleSeats } from "./scene/rear-module-seats.ts";
import {
  assemblyChecks,
  assemblyMember,
  switchRear,
} from "./assembly-pairs.ts";
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
    poseAssemblyLayer(chip, separated);
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

test("ASIC 底座四孔贯通，四柱始终留在基板，复位时孔壁与鳍片让开柱头", () => {
  const chip = createEquipmentAssembly("switch-1u").groups.get("net-asic")!;
  const sink = chip.getObjectByName("asic-heatsink")!;
  const base = sink.getObjectByName("asic-sink-base")!;
  const pins = chip.getObjectsByProperty("name", "asic-mount-pin");
  const shoulders = chip.getObjectsByProperty("name", "asic-mount-shoulder");
  const pcb = bounds(chip.getObjectByName("asic-substrate")!);
  const mount = definition.switchAssembly.asicMount;
  const pinBounds = pins.map(bounds);
  const down = new THREE.Vector3(0, -1, 0);
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7);
  assert.equal(pins.length, 4);
  assert.equal(shoulders.length, 4);
  assert.equal(
    new Set(pins.map((p) => [p.position.x, p.position.z].join(","))).size,
    4,
  );
  for (const separated of [false, true, false, true, false]) {
    poseAssemblyLayer(chip, separated);
    chip.updateWorldMatrix(true, true);
    const plate = bounds(base);
    for (const [i, pin] of pins.entries()) {
      const fixed = bounds(pin);
      assert.ok(fixed.equals(pinBounds[i]));
      const center = fixed.getCenter(new THREE.Vector3());
      const shoulder = bounds(shoulders[i]);
      const axis = shoulder.getCenter(new THREE.Vector3());
      near(axis.x, center.x);
      near(axis.z, center.z);
      near(shoulder.min.y, pcb.max.y);
      near(shoulder.max.y, fixed.min.y);
      near(plate.min.y - shoulder.max.y, separated ? mount.lift : 0);
      if (!separated) near(fixed.max.y - plate.max.y, mount.tipExposure);
      for (const angle of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
        // 从上方穿过孔心和柱缘、有余隙；紧邻孔外的射线先命中底座而非鳍片。
        for (const radius of [
          0,
          (mount.pinRadius + mount.boreRadius) / 2,
          mount.shoulderRadius,
        ]) {
          const ray = new THREE.Raycaster(
            new THREE.Vector3(
              center.x + Math.cos(angle) * radius,
              plate.max.y + 0.1,
              center.z + Math.sin(angle) * radius,
            ),
            down,
          );
          const hit = ray.intersectObject(sink)[0];
          if (radius === mount.shoulderRadius) assert.equal(hit?.object, base);
          else assert.equal(hit, undefined);
        }
      }
    }
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

test("N1 两组导光条逐列对准笼口，抬起只移动导光条和横梁，放回时两端重新落座", () => {
  const { groups } = createEquipmentAssembly("switch-1u");
  const ports = groups.get("net-ports")!;
  const moving = ports.getObjectByName("front-light-guides")!;
  const { frontCages, lightGuides } = definition.switchAssembly;
  const roofs = ports.getObjectsByProperty("name", "cage-roof");
  const stands = ports.getObjectsByProperty("name", "guide-stand");
  const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7);
  assert.equal(moving.children.length, frontCages.length);
  assert.equal(stands.length, 2 * frontCages.length);
  const fixed = stands.map(bounds);
  const frame = bounds(ports.getObjectByName("front-cage-base")!);
  for (const lifted of [false, true, true, false]) {
    poseAssemblyLayer(ports, lifted);
    ports.updateWorldMatrix(true, true);
    const lift = lifted ? lightGuides.lift : 0;
    for (const [i, comb] of moving.children.entries()) {
      const bank = frontCages[i];
      const roof = bounds(roofs[i]);
      const rail = bounds(comb.getObjectByName("guide-carrier")!);
      const pipes = comb.getObjectsByProperty("name", "light-guide");
      assert.equal(pipes.length, bank.columns);
      close(rail.getCenter(new THREE.Vector3()).x, bank.centerX);
      for (const j of [i * 2, i * 2 + 1]) {
        const seat = bounds(stands[j]);
        assert.ok(seat.equals(fixed[j]));
        close(seat.min.y, roof.max.y);
        close(rail.min.y - seat.max.y, lift);
        assert.ok(
          rail.min.x <= seat.min.x + 1e-7 && rail.max.x >= seat.max.x - 1e-7,
        );
      }
      for (const [column, pipe] of pipes.entries()) {
        const guide = bounds(pipe);
        const center = guide.getCenter(new THREE.Vector3());
        const left =
          bank.centerX - bank.width / 2 + (column * bank.width) / bank.columns;
        assert.ok(
          guide.min.x > left && guide.max.x < left + bank.width / bank.columns,
        );
        close(guide.max.y, rail.min.y);
        close(guide.max.z, frame.max.z);
        assert.ok(guide.max.z > roof.max.z);
        // 顶板和导光条在侧投影中重叠，折下的前端应当处于顶板前方。
        const belowRoof = new THREE.Raycaster(
          new THREE.Vector3(
            center.x,
            roof.max.y - 0.0004 + lift,
            frame.max.z + 0.01,
          ),
          new THREE.Vector3(0, 0, -1),
        );
        const lip = belowRoof.intersectObject(pipe)[0];
        assert.ok(lip && lip.point.z > roof.max.z);
      }
    }
  }
});

test("N1 分组抬起时只移动本组导光条，逐列落回固定入光窗", () => {
  const ports = createEquipmentAssembly("switch-1u").groups.get("net-ports")!;
  const { frontCages, lightGuides } = definition.switchAssembly;
  const banks = frontCages.map(({ id }) => layerScopeFor(ports, id)!);
  const installed = banks.map((bank) => scopeBounds(new THREE.Box3(), bank));
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7);
  assert.equal(installed[0].intersectsBox(installed[1]), false);
  for (const [i, bank] of banks.entries()) {
    const roof = bounds(bank.members[0].getObjectByName("cage-roof")!);
    const pads = bank.members[0]
      .getObjectsByProperty("name", "guide-inlet-base")
      .map(bounds);
    const windows = bank.members[0].getObjectsByProperty(
      "name",
      "guide-inlet-window",
    );
    const pipes = bank.layerRoot.getObjectsByProperty("name", "light-guide");
    const initial = windows.map(bounds);
    assert.equal(pads.length, frontCages[i].columns);
    assert.equal(pipes.length, pads.length);
    assert.equal(windows.length, pads.length);
    for (const lifted of [true, false, true, false]) {
      poseAssemblyLayer(bank.layerRoot, lifted);
      ports.updateWorldMatrix(true, true);
      const neighbor = 1 - i;
      assert.ok(
        scopeBounds(new THREE.Box3(), banks[neighbor]).equals(
          installed[neighbor],
        ),
      );
      for (const [j, window] of windows.entries()) {
        const face = bounds(window);
        assert.ok(face.equals(initial[j]));
        near(pads[j].min.y, roof.max.y);
        near(face.min.y, pads[j].max.y);
        const center = face.getCenter(new THREE.Vector3());
        near(center.x, bounds(pipes[j]).getCenter(new THREE.Vector3()).x);
        // 从窗口中心向上，直接量到对应导光条下表面。
        center.y = face.max.y - 0.001;
        const hit = new THREE.Raycaster(
          center,
          new THREE.Vector3(0, 1, 0),
        ).intersectObject(pipes[j])[0];
        assert.ok(hit);
        near(hit.point.y - face.max.y, lifted ? lightGuides.lift : 0);
      }
    }
    assert.ok(scopeBounds(new THREE.Box3(), bank).equals(installed[i]));
  }
});

test("N1 机后六槽按观察次序排列，逐件抽出时导轨固定，相邻模块与退出姿态正确", () => {
  const { root, groups, positions } = createEquipmentAssembly("switch-1u");
  const row = new RearModuleSeats();
  const { members } = switchRear;
  assert.deepEqual(
    members.map((m) => m.slot),
    ["PSU-B", "FAN-04", "FAN-03", "FAN-02", "FAN-01", "PSU-A"],
  );
  const installed = members.map((m) => bounds(groups.get(m.id)!));
  const check = assemblyChecks("sw-12").find(
    (item) => item.tool === "switch-power",
  )!;
  for (const [i, m] of members.entries()) {
    assert.equal(assemblyMember(check, m.id)?.id, m.id);
    assert.ok(assemblyChecks("sw-12", m.id).includes(check));
    if (i) assert.ok(installed[i].max.x < installed[i - 1].min.x);
  }
  row.update(groups, positions, members[0].id, "switch-1u", "seated");
  const guides = row.guides.children.map(bounds);
  const close = (x: number, y: number) => assert.ok(Math.abs(x - y) < 1e-7);
  for (const [i, m] of members.entries()) {
    for (const pose of ["withdrawn", "seated", "withdrawn"] as const) {
      row.restoreModule();
      row.update(groups, positions, m.id, "switch-1u", pose);
      root.updateMatrixWorld(true);
      const frame = new THREE.Box3();
      row.includeFrame(frame);
      for (const [j, n] of members.entries()) {
        const module = bounds(groups.get(n.id)!);
        const support = row.guides.getObjectByName(n.slot)!;
        const original = installed[j];
        const depth = original.max.z - original.min.z;
        const offset =
          pose === "withdrawn" && i === j
            ? depth * definition.rearModuleSeats.travelRatio
            : 0;
        close(module.min.x, original.min.x);
        close(module.min.y, original.min.y);
        close(module.max.z, original.max.z - offset);
        assert.ok(frame.clone().expandByScalar(1e-7).containsBox(module));
        assert.ok(bounds(support).equals(guides[j]));
        const rails = support.children.map(bounds);
        const object = groups.get(n.id)!;
        const base = object.getObjectByName("psu-shell-base");
        if (base) close(rails[0].max.y, bounds(base).min.y);
        // 面板与壳底的外廓不同，逐件检查从装入到抽出的整个行程。
        object.traverse((mesh) => {
          if (!(mesh instanceof THREE.Mesh)) return;
          const swept = bounds(mesh);
          swept.max.z += offset;
          assert.ok(
            rails.every((rail) => !overlaps(rail, swept)),
            n.slot + " / " + mesh.name,
          );
        });
      }
    }
  }
  row.dispose();
  root.updateMatrixWorld(true);
  assert.equal(root.getObjectByName("rear-module-seats"), undefined);
  assert.deepEqual(
    members.map((m) => bounds(groups.get(m.id)!)),
    installed,
  );
});

test("N1 四个固定座落在板缘，各槽两片触片避开通风口并对合相应触头", () => {
  const { groups } = createEquipmentAssembly("switch-1u");
  const board = groups.get("net-board")!;
  const edge = bounds(board.getObjectByName("switch-board-rear")!);
  const group = groups.get(switchRear.fanGroup.id)!;
  const receivers = board.getObjectByName("fan-receivers")!;
  assert.equal(receivers.children.length, switchRear.fans.length);
  const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7);
  for (const { id } of switchRear.fans) {
    const fan = groups.get(id)!;
    const socket = receivers.getObjectByName("receiver-" + id)!;
    const fixed = bounds(socket);
    const foot = bounds(socket.getObjectByName("fan-receiver-foot")!);
    close(foot.min.y, edge.max.y);
    assert.ok(
      foot.min.x >= edge.min.x &&
        foot.max.x <= edge.max.x &&
        foot.min.z >= edge.min.z &&
        foot.max.z <= edge.max.z,
    );
    const frame = bounds(fan.getObjectByName("fan-front-frame")!);
    const substrate = bounds(fan.getObjectByName("fan-contact-substrate")!);
    close(substrate.min.z, frame.max.z);
    const openingRadius =
      switchRear.fanGroup.size[1] * definition.fanModule.openingRadiusRatio;
    assert.ok(
      substrate.min.x > frame.getCenter(new THREE.Vector3()).x + openingRadius,
    );
    const contact = layerScopeFor(fan, "fan-contact:" + id)!;
    const bank = layerScopeFor(fan, "fan-bank:" + id)!;
    assert.equal(bank.layerRoot, contact.layerRoot);
    assert.ok(bank.members.includes(group) && bank.members.includes(receivers));
    assert.equal(
      layerScopeFor(board, "fan-contact:" + id)!.selectedBranch,
      socket,
    );
    const pads = fan.getObjectsByProperty("name", "fan-contact-pad");
    const tips = socket.getObjectsByProperty("name", "fan-contact-tip");
    assert.equal(pads.length, 2);
    assert.equal(tips.length, pads.length);
    for (const split of [true, true, false, true, false]) {
      poseAssemblyLayer(contact.layerRoot, split);
      group.updateWorldMatrix(true, true);
      assert.ok(bounds(socket).equals(fixed));
      pads.forEach((pad, i) => {
        const a = bounds(pad),
          b = bounds(tips[i]);
        const ca = a.getCenter(new THREE.Vector3()),
          cb = b.getCenter(new THREE.Vector3());
        close(ca.x, cb.x);
        close(ca.y, cb.y);
        close(
          b.min.z - a.max.z,
          split ? definition.switchAssembly.fanContact.travel : 0,
        );
      });
      for (const other of switchRear.fans.filter((f) => f.id !== id))
        assert.equal(
          groups.get(other.id)!.getObjectByName("fan-module")!.position.z,
          0,
        );
      assert.equal(fan.getObjectByName("fan-rotor")!.position.z, 0);
    }
  }
});

test("N1 两组上下排承片逐列装在对应笼口，固定座均在本列的隔墙之间", () => {
  const ports = createEquipmentAssembly("switch-1u").groups.get("net-ports")!;
  const floor = bounds(ports.getObjectByName("front-cage-base")!);
  for (const bank of definition.switchAssembly.frontCages) {
    const group = layerScopeFor(ports, bank.id)!.members[0];
    const back = bounds(group.getObjectByName("cage-backing")!);
    const dividers = group
      .getObjectsByProperty("name", "cage-divider")
      .map(bounds);
    const shelf = bounds(group.getObjectByName("cage-shelf")!);
    assert.equal(dividers.length, bank.columns + 1);
    for (let column = 1; column <= bank.columns; column++) {
      const left = dividers[column - 1].max.x,
        right = dividers[column].min.x;
      const center = (left + right) / 2;
      for (const row of ["upper", "lower"]) {
        const scope = layerScopeFor(ports, [bank.id, row, column].join("-"))!;
        assert.equal(scope.layerRoot.parent, group);
        const bed = bounds(scope.layerRoot.getObjectByName("insert-bed")!);
        assert.ok(
          Math.abs(bed.getCenter(new THREE.Vector3()).x - center) < 1e-7,
        );
        assert.ok(bed.min.x > left && bed.max.x < right);
        assert.ok(Math.abs(bed.min.z - back.max.z) < 1e-7);
        const shelfY = row === "lower" ? floor.max.y : shelf.max.y;
        assert.ok(Math.abs(bed.min.y - shelfY) < 1e-7);
      }
    }
  }
});

test("N1 承片落在双轨之间，偏心键穿过片尾缺口；两肩贴挡、抽出和再次推回均能由射线核对", () => {
  const ports = createEquipmentAssembly("switch-1u").groups.get("net-ports")!;
  for (const bank of definition.switchAssembly.frontCages) {
    for (const row of ["upper", "lower"]) {
      const scope = layerScopeFor(
        ports,
        bank.id + "-" + row + "-" + bank.columns,
      )!;
      const seat = scope.layerRoot,
        tongue = seat.getObjectByName("insert-tongue")!;
      const key = bounds(seat.getObjectByName("insert-key")!);
      const stop = bounds(seat.getObjectByName("insert-stop")!);
      const rails = seat
        .getObjectsByProperty("name", "insert-rail")
        .map(bounds);
      const bed = bounds(seat.getObjectByName("insert-bed")!);
      const home = bounds(tongue);
      const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7);
      for (const separated of [false, true, true, false]) {
        poseAssemblyLayer(seat, separated);
        seat.updateWorldMatrix(true, true);
        const blade = bounds(tongue);
        const travel = separated
          ? definition.switchAssembly.cageInsert.travel
          : 0;
        near(blade.min.z - stop.max.z, travel);
        near(blade.min.y, bed.max.y);
        assert.ok(blade.min.x > rails[0].max.x && blade.max.x < rails[1].min.x);
        const center = key.getCenter(new THREE.Vector3());
        assert.ok(center.x > blade.getCenter(new THREE.Vector3()).x);
        const probe = (x: number, z: number) =>
          new THREE.Raycaster(
            new THREE.Vector3(x, blade.max.y + 0.01, z),
            new THREE.Vector3(0, -1, 0),
          ).intersectObject(tongue).length > 0;
        const z = center.z + travel;
        assert.equal(probe(center.x, z), false);
        assert.ok(probe((blade.min.x + key.min.x) / 2, z));
        assert.ok(probe((blade.max.x + key.max.x) / 2, z));
        if (separated) assert.ok(blade.min.z > rails[0].max.z);
      }
      assert.ok(bounds(tongue).equals(home));
    }
  }
});

test("笼位视图和承片近看指向同一活动件，上下排共用本列真实框体及导光条", () => {
  const ports = createEquipmentAssembly("switch-1u").groups.get("net-ports")!;
  for (const { id, columns } of definition.switchAssembly.frontCages) {
    for (let column = 1; column <= columns; column++) {
      const upper = layerScopeFor(
        ports,
        [id, "upper", column, "cage"].join("-"),
      )!;
      const lower = layerScopeFor(
        ports,
        [id, "lower", column, "cage"].join("-"),
      )!;
      assert.deepEqual(upper.members, lower.members);
      assert.ok(
        upper.members.includes(upper.layerRoot) &&
          upper.members.includes(lower.layerRoot),
      );
      assert.notEqual(upper.moving, lower.moving);
      const guide = upper.members.find(
        (member) => member.name === "light-guide",
      )!;
      assert.equal(
        upper.members.filter((part) => part.name === "cage-divider").length,
        2,
      );
      for (const [row, scope] of [
        ["upper", upper],
        ["lower", lower],
      ] as const) {
        const detail = layerScopeFor(ports, [id, row, column].join("-"))!;
        assert.equal(detail.layerRoot, scope.layerRoot);
        assert.equal(detail.moving, scope.selectedBranch);
        const center = bounds(guide).getCenter(new THREE.Vector3());
        const seat = bounds(scope.layerRoot);
        assert.ok(
          center.x > seat.min.x &&
            center.x < seat.max.x &&
            center.y > seat.max.y,
        );
      }
    }
  }
});

test("N1 四槽板侧的两只触头对回各自筒孔，细杆穿孔且肩面落在筒口", () => {
  const { groups, root } = createEquipmentAssembly("switch-1u");
  const board = groups.get("net-board")!;
  const config = definition.switchAssembly.fanContact;
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7);
  for (const { id } of switchRear.fans) {
    const scope = layerScopeFor(board, "fan-probes:" + id)!;
    const socket = board.getObjectByName("receiver-" + id)!;
    const module = groups.get(id)!.getObjectByName("fan-module")!;
    assert.equal(scope.extractedLayers?.length, 1);
    assert.ok(scope.extractedLayers[0] === module);
    const sleeves = socket.getObjectsByProperty("name", "fan-contact-sleeve");
    const tips = scope.moving.getObjectsByProperty("name", "fan-contact-tip");
    const stems = scope.moving.getObjectsByProperty("name", "fan-probe-stem");
    const pads = module.getObjectsByProperty("name", "fan-contact-pad");
    assert.deepEqual(
      [sleeves.length, tips.length, stems.length, pads.length],
      [2, 2, 2, 2],
    );
    poseAssemblyLayer(module, true);
    for (const separated of [true, false, true, false]) {
      poseAssemblyLayer(scope.layerRoot, separated);
      root.updateMatrixWorld(true);
      for (const [i, tip] of tips.entries()) {
        const head = bounds(tip),
          stem = bounds(stems[i]),
          sleeve = bounds(sleeves[i]),
          pad = bounds(pads[i]);
        const axis = sleeve.getCenter(new THREE.Vector3());
        near(head.getCenter(new THREE.Vector3()).x, axis.x);
        near(stem.getCenter(new THREE.Vector3()).y, axis.y);
        near(
          head.getCenter(new THREE.Vector3()).y,
          pad.getCenter(new THREE.Vector3()).y,
        );
        near(head.max.z, stem.min.z);
        near(
          sleeve.min.z - head.max.z,
          separated ? config.receiver.probeTravel : 0,
        );
        assert.ok(head.min.z > pad.max.z);
        assert.equal(stem.max.z < sleeve.min.z, separated);
        for (const r of [
          0,
          (config.receiver.stemRadius + config.receiver.sleeveBore) / 2,
          0.00086,
        ]) {
          const ray = new THREE.Raycaster(
            new THREE.Vector3(axis.x + r, axis.y, sleeve.min.z - 0.001),
            new THREE.Vector3(0, 0, 1),
          );
          assert.equal(
            ray.intersectObject(sleeves[i]).length > 0,
            r > config.receiver.sleeveBore,
          );
        }
      }
    }
    poseAssemblyLayer(module, false);
  }
});

test("N1 双套筒连片贴住板侧座面，两孔由实体孔底封闭，抽出、换槽后原位归合", () => {
  const { groups, root } = createEquipmentAssembly("switch-1u");
  const board = groups.get("net-board")!;
  const fit = definition.switchAssembly.fanContact.receiver;
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7);
  for (const { id } of switchRear.fans) {
    const scope = layerScopeFor(board, "fan-sleeves:" + id)!;
    const [carrier, body, backing] = scope.members;
    const bridge = carrier.getObjectByName("fan-sleeve-bridge")!;
    const installed = bounds(carrier),
      fixed = bounds(body),
      bottom = bounds(backing);
    const sleeves = carrier.getObjectsByProperty("name", "fan-contact-sleeve");
    const foot = body.parent!.getObjectByName("fan-receiver-foot")!;
    near(bounds(foot).max.y, bottom.min.y);
    near(fixed.max.z, bottom.min.z);
    poseAssemblyLayer(scope.extractedLayers![0], true);
    for (const separated of [true, true, false]) {
      poseAssemblyLayer(scope.layerRoot, separated);
      root.updateMatrixWorld(true);
      assert.ok(bounds(body).equals(fixed) && bounds(backing).equals(bottom));
      near(
        fixed.min.z - bounds(bridge).max.z,
        separated ? fit.carrierTravel : 0,
      );
      for (const sleeve of sleeves) {
        const span = bounds(sleeve),
          c = span.getCenter(new THREE.Vector3());
        assert.equal(span.max.z < fixed.min.z, separated);
        assert.ok(span.max.z < bottom.min.z);
        for (const r of [
          0,
          (fit.barrelRadius + fit.seatBore) / 2,
          fit.seatBore * 1.1,
        ]) {
          const ray = new THREE.Raycaster(
            new THREE.Vector3(c.x + r, c.y, fixed.min.z - 0.001),
            new THREE.Vector3(0, 0, 1),
          );
          const hit = ray.intersectObjects([body, backing])[0];
          assert.equal(
            hit.object.name,
            r > fit.seatBore ? body.name : backing.name,
          );
          near(hit.point.z, r > fit.seatBore ? fixed.min.z : bottom.min.z);
        }
      }
      for (const other of switchRear.fans.filter((f) => f.id !== id))
        assert.equal(
          layerScopeFor(
            board,
            "fan-sleeves:" + other.id,
          )!.moving.position.length(),
          0,
        );
    }
    poseAssemblyLayer(scope.extractedLayers![0], false);
    assert.ok(bounds(carrier).equals(installed));
  }
});
