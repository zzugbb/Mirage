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
import { devices } from "./installation.ts";

test("M2 整机提供处理器、盘位、背板线束、双电源与扩展区核对，部件只提供所属工具", () => {
  const id = "srv-54";
  const tools = (selected: string) =>
    assemblyChecks(id, selected).map((check) => check.tool);
  assert.deepEqual(tools(id), [
    "processor-pair",
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
  assert.ok("additionalPart" in check);
  const { primary: board, companion: cable } = check.pairs[0],
    card = check.additionalPart;
  const parts = [board, cable, card];
  for (const part of parts)
    assert.deepEqual(assemblyChecks("srv-54", part.id), [check]);
  assert.deepEqual(assemblyChecks("srv-53", cable.id), []);
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
