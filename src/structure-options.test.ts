import { test } from "node:test";
import assert from "node:assert/strict";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import {
  layerForSelection,
  rearLayoutFor,
  rearMemberLayer,
} from "./assembly-pairs.ts";
import { devices } from "./installation.ts";
import { structureOptions } from "./structure-options.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import { Box3 } from "three";

test("逐台安装实例的每个登记部件与子件均有本机型的结构核对入口", () => {
  for (const device of devices) {
    const parts = [
      ...partsForDevice(device.id),
      ...subpartsForDevice(device.id),
    ];
    for (const part of parts) {
      const options = structureOptions(device.id, part.id)!;
      assert.ok(
        options.assemblies.length ||
          options.cover ||
          options.memory ||
          options.fans ||
          options.slots,
        device.id + "/" + part.id,
      );
      if ("node" in part && part.node === "lid")
        assert.equal(options.cover?.id, part.id);
    }
    const empty = structureOptions(device.id, "uninstalled")!;
    assert.ok(
      !empty.assemblies.length &&
        !empty.cover &&
        !empty.memory &&
        !empty.fans &&
        !empty.slots,
    );
  }
});

test("四种配置示意的盖底贴合左右机箱承边", () => {
  for (const modelId of new Set(devices.map((d) => d.modelId))) {
    const device = devices.find((d) => d.modelId === modelId)!;
    const { root, groups } = createEquipmentAssembly(modelId);
    const id = structureOptions(device.id, device.id)!.cover!.id;
    const lid = new Box3().setFromObject(groups.get(id)!, true);
    const ledges = root.getObjectsByProperty("name", "cover-support-ledge");
    assert.equal(ledges.length, 2);
    for (const support of ledges) {
      const b = new Box3().setFromObject(support);
      assert.ok(Math.abs(b.max.y - lid.min.y) < 1e-7);
      assert.ok(
        lid.min.x < b.max.x &&
          lid.max.x > b.min.x &&
          lid.min.z <= b.min.z &&
          lid.max.z >= b.max.z,
      );
    }
  }
});

test("机后分层换同类槽位保留核查位置，换类或离开时清除原件姿态", () => {
  for (const model of ["switch-1u", "storage-4u"]) {
    const layout = rearLayoutFor(model)!;
    for (const origin of layout.members) {
      const definition = rearMemberLayer(layout, origin.id)!;
      const visit = {
        definition,
        pose: "separated" as const,
        scopeId: "detail",
      };
      for (const target of layout.members) {
        const next = rearMemberLayer(layout, target.id)!;
        const sameKind = [
          layout.controllers,
          layout.supplies,
          layout.fans,
        ].some(
          (parts) =>
            parts.some((p) => p.id === origin.id) &&
            parts.some((p) => p.id === target.id),
        );
        const result = layerForSelection(visit, next);
        if (sameKind) assert.equal(result, visit);
        else assert.deepEqual(result, { definition: next, pose: "seated" });
      }
      assert.equal(layerForSelection(visit, undefined), undefined);
      assert.equal(layerForSelection(undefined, definition), undefined);
    }
  }
});
