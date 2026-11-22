import { test } from "node:test";
import assert from "node:assert/strict";
import { Box3, Mesh, Vector3 } from "three";
import {
  assemblyChecks,
  assemblyMember,
  drivePairs,
} from "./assembly-pairs.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import { partsForModel } from "./catalog.ts";
import { assemblyPartPosition } from "./assembly-motion.ts";
import { layerScopeFor, poseAssemblyLayer } from "./scene/assembly-layer.ts";
import { devices } from "./installation.ts";

test("M2 整机提供处理器、电池座、盘位、背板线束、双电源与扩展区核对，部件只提供所属工具", () => {
  const id = "srv-54";
  const tools = (selected: string) =>
    assemblyChecks(id, selected).map((check) => check.tool);
  assert.deepEqual(tools(id), [
    "processor-pair",
    "rtc-mount",
    "drive-tray",
    "storage-harness",
    "server-power",
    "expansion-bay",
  ]);
  for (const device of devices)
    assert.equal(
      assemblyChecks(device.id).some((check) => check.tool === "drive-tray"),
      device.modelId === "server-2u",
    );
  for (const selected of ["storage-01", "drives-01", "disk-08", "bay-02"])
    assert.deepEqual(tools(selected), ["drive-tray"]);
  const check = assemblyChecks(id, "drives-01")[0];
  assert.equal(assemblyMember(check, "drives-01")?.id, "disk-01");
  assert.equal(assemblyMember(check, "bay-08")?.id, "bay-08");
  assert.deepEqual(tools("cpu-02"), ["processor-pair"]);
  assert.deepEqual(tools("fans-01"), []);
});

test("八个前置槽位从柜前由左向右排列，装配态硬盘位于同号托架内", () => {
  const { groups } = createEquipmentAssembly("server-2u");
  assert.equal(drivePairs.length, 8);
  let previousRight = -Infinity;
  for (const [i, { primary, companion }] of drivePairs.entries()) {
    const n = String(i + 1).padStart(2, "0");
    assert.deepEqual([primary.slot, companion.slot], ["BAY-" + n, "SSD-" + n]);
    const tray = groups.get(primary.id)!,
      disk = groups.get(companion.id)!;
    assert.equal(tray.parent, groups.get(primary.parent));
    assert.equal(disk.parent, groups.get(companion.parent));
    const frame = new Box3().setFromObject(tray),
      body = new Box3().setFromObject(disk);
    assert.ok(frame.containsBox(body), primary.slot);
    assert.ok(frame.min.x > previousRight);
    const size = body.getSize(new Vector3());
    assert.ok(size.x < size.y && size.y < size.z);
    previousRight = frame.max.x;
  }
});

test("M2 的八个背板接点逐盘对齐，线束绕过风扇、内存和导风罩，两端随板件一起展开", () => {
  const check = assemblyChecks("srv-54").find(
    (item) => item.tool === "storage-harness",
  )!;
  assert.ok("additionalParts" in check);
  const { primary: board, companion: cable } = check.pairs[0],
    card = check.additionalParts[0];
  const parts = [board, cable, card];
  for (const part of parts)
    assert.deepEqual(assemblyChecks("srv-54", part.id), [check]);
  assert.ok(!assemblyChecks("srv-53", cable.id).includes(check));
  const { root, groups, positions } = createEquipmentAssembly("server-2u");
  const bounds = (id: string, child?: string) => {
    const group = groups.get(id)!;
    return new Box3().setFromObject(
      child ? group.getObjectByName(child)! : group,
    );
  };
  const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6);
  for (const { companion: disk } of drivePairs) {
    const edge = bounds(disk.id, "ssd-edge-contact"),
      socket = bounds(board.id, disk.slot);
    const a = edge.getCenter(new Vector3()),
      b = socket.getCenter(new Vector3());
    close(a.x, b.x);
    close(a.y, b.y);
    close(edge.min.z, socket.max.z);
  }
  const obstacles = ["fans-01", "duct-01", "memory-01", "psu-01", "psu-02"].map(
    (id) => bounds(id),
  );
  const wires = groups
    .get(cable.id)!
    .children.filter(
      (o) => o instanceof Mesh && o.geometry.type === "TubeGeometry",
    );
  assert.ok(wires.length > 0);
  for (const mesh of wires) {
    if (!(mesh instanceof Mesh)) continue;
    const pos = mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = new Vector3()
        .fromBufferAttribute(pos, i)
        .applyMatrix4(mesh.matrixWorld);
      assert.ok(obstacles.every((obstacle) => !obstacle.containsPoint(v)));
    }
  }
  for (const amount of [0, check.startExplosion, 1, 0]) {
    for (const p of partsForModel("server-2u").filter((p) =>
      parts.some((member) => member.id === p.id),
    ))
      groups
        .get(p.id)!
        .position.fromArray(
          assemblyPartPosition(
            { ...p, position: positions.get(p.id)!.toArray() },
            amount,
            1,
          ),
        );
    root.updateMatrixWorld(true);
    for (const [id, plug] of [
      [board.id, "backplane-plug"],
      [card.id, "controller-plug"],
    ]) {
      const socket = bounds(id, "harness-socket"),
        end = bounds(cable.id, plug),
        a = socket.getCenter(new Vector3()),
        b = end.getCenter(new Vector3());
      close(a.x, b.x);
      close(a.y, b.y);
      if (id === board.id) close(socket.min.z, end.max.z);
      else close(socket.max.z, end.min.z);
    }
  }
});

test("M2 八盘以盘面法向移开侧盖和板件，贴回时四片导热垫和柱肩逐一接触", () => {
  const { root, groups } = createEquipmentAssembly("server-2u");
  for (const { companion } of drivePairs) {
    const disk = groups.get(companion.id)!;
    const pcb = disk.getObjectByName("ssd-pcb")!;
    for (const [key, fixed, top] of [
      ["ssd-pads", "ssd-package", "ssd-thermal-pad"],
      ["ssd-board", "ssd-board-post", "ssd-pcb"],
    ] as const) {
      const scope = layerScopeFor(disk, key)!;
      for (const pre of scope.extractedLayers ?? [])
        poseAssemblyLayer(pre, true);
      for (const open of [true, false]) {
        poseAssemblyLayer(scope.layerRoot, open);
        root.updateWorldMatrix(true, true);
        const bases = disk.getObjectsByProperty("name", fixed),
          surfaces = disk.getObjectsByProperty("name", top);
        assert.equal(bases.length, 4);
        for (const [i, base] of bases.entries()) {
          const b = new Box3().setFromObject(base),
            t = new Box3().setFromObject(top === "ssd-pcb" ? pcb : surfaces[i]);
          if (open)
            assert.ok(
              t.min.x - b.max.x > 0.02,
              JSON.stringify([companion.id, key, i, t.min.x - b.max.x]),
            );
          else assert.ok(Math.abs(t.min.x - b.max.x) < 1e-7);
        }
      }
      for (const pre of scope.extractedLayers ?? [])
        poseAssemblyLayer(pre, false);
    }
  }
});

test("M2 八盘触片和两端反向的 SAS 接合件各自对回原座", () => {
  const { root, groups } = createEquipmentAssembly("server-2u");
  const board = groups.get("backplane-01")!,
    cable = groups.get("cables-01")!,
    card = groups.get("raid-01")!;
  const bounds = (o: import("three").Object3D) =>
    new Box3().setFromObject(o, true);
  for (const [id, owner, fixed, sign] of [
    ...drivePairs.map(
      ({ companion }) =>
        [companion.id, groups.get(companion.id)!, board, 1] as const,
    ),
    ["backplane-plug", cable, board, -1],
    ["controller-plug", cable, card, 1],
  ] as const) {
    const scope = layerScopeFor(owner, id)!;
    assert.equal(scope.layerRoot, layerScopeFor(fixed, id)!.layerRoot);
    const disk = id.startsWith("disk");
    for (const separated of [true, false]) {
      poseAssemblyLayer(scope.layerRoot, separated);
      root.updateWorldMatrix(true, true);
      const pads = scope.moving.getObjectsByProperty(
        "name",
        disk ? "ssd-tail-pad" : "sas-pad",
      );
      const fingers = scope.members[1].getObjectsByProperty(
        "name",
        disk ? "disk-socket-finger" : "sas-finger",
      );
      assert.equal(pads.length, disk ? 10 : 2);
      for (const [i, pad] of pads.entries()) {
        const a = bounds(pad),
          b = bounds(fingers[i]);
        if (disk) assert.ok(Math.abs(a.max.x - b.min.x) < 1e-7);
        else assert.ok(Math.abs(a.max.y - b.min.y) < 1e-7);
        assert.equal(
          sign > 0 ? a.min.z < b.max.z : a.max.z > b.min.z,
          !separated,
        );
      }
    }
  }
});
