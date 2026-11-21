import { test } from "node:test";
import assert from "node:assert/strict";
import { Box3, Vector3 } from "three";
import {
  assemblyChecks,
  assemblyMember,
  drivePairs,
} from "./assembly-pairs.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import { devices } from "./installation.ts";

test("M2 整机同时提供处理器和盘位核对，部件只提供所属工具", () => {
  const id = "srv-54";
  const tools = (selected: string) =>
    assemblyChecks(id, selected).map((check) => check.tool);
  assert.deepEqual(tools(id), ["processor-pair", "drive-tray"]);
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
