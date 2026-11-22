import assert from "node:assert/strict";
import { test } from "node:test";
import { Box3, Mesh, Vector3 } from "three";
import {
  rearLayoutFor,
  serverPowerStages,
  serverSuppliesFor,
} from "./assembly-pairs.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import { layerScopeFor, poseAssemblyLayer } from "./scene/assembly-layer.ts";
import { RearModuleSeats } from "./scene/rear-module-seats.ts";
import { PartIsolation } from "./scene/part-isolation.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

for (const model of ["server-1u", "server-2u"]) {
  test(
    model + " 双电源尾端触面各自对回原槽，分层切换恢复外壳和相邻电源",
    () => {
      const { root, groups } = createEquipmentAssembly(model);
      const isolation = new PartIsolation();
      for (const { id } of serverSuppliesFor(model)) {
        const module = groups.get(id)!;
        const contact = layerScopeFor(module, "bay-contact")!;
        const [plug, receiver] = contact.members;
        assert.equal(receiver.parent, module.parent);
        assert.equal(receiver.userData.entityId, id);
        const shell = module.getObjectByName("psu-moving-module")!;
        const study = module.getObjectByName("psu-interior-cutaway")!;
        const stop = new Box3().setFromObject(
          receiver.getObjectByName("bay-receiver-back")!,
        );
        const pads = plug.getObjectsByProperty("name", "bay-blade-pad");
        const fingers = receiver.getObjectsByProperty(
          "name",
          "bay-contact-finger",
        );
        assert.equal(pads.length, 3);
        assert.equal(fingers.length, 3);
        for (const open of [true, false, true, false]) {
          poseAssemblyLayer(contact.layerRoot, open);
          root.updateMatrixWorld(true);
          const blade = new Box3().setFromObject(
            plug.getObjectByName("psu-inner-blade")!,
            true,
          );
          assert.ok(
            Math.abs(
              stop.min.z -
                blade.max.z -
                (open ? definition.serverPowerContact.travel : 0),
            ) < 1e-7,
          );
          for (const [i, pad] of pads.entries()) {
            const a = new Box3().setFromObject(pad),
              b = new Box3().setFromObject(fingers[i]);
            assert.ok(Math.abs(a.max.y - b.min.y) < 1e-7);
            assert.ok(a.min.x < b.min.x && a.max.x > b.max.x);
            assert.equal(a.min.z < b.max.z && a.max.z > b.min.z, !open);
          }
        }
        for (const stage of serverPowerStages) {
          const scope = layerScopeFor(module, stage.id)!;
          const inside = stage.id !== "bay-contact";
          assert.equal(
            isolation.applyMany(root, scope.members, scope.cutaway),
            true,
          );
          assert.equal(study.visible, inside);
          assert.equal(shell.visible, !inside);
          const home = scope.moving.getWorldPosition(new Vector3());
          poseAssemblyLayer(scope.layerRoot, true);
          assert.ok(
            scope.moving.getWorldPosition(new Vector3()).distanceTo(home) >
              0.01,
          );
          poseAssemblyLayer(scope.layerRoot, false);
          assert.ok(
            scope.moving.getWorldPosition(new Vector3()).distanceTo(home) <
              1e-8,
          );
          isolation.restore();
          assert.equal(study.visible, false);
          assert.ok(shell.visible && receiver.visible);
          assert.ok(plug.getObjectByName("psu-inner-blade") instanceof Mesh);
        }
      }
    },
  );
}

test("四种机型的八只电源各自对回原槽，接合面归位后固定座由双托脚承托", () => {
  for (const model of ["server-1u", "server-2u", "switch-1u", "storage-4u"]) {
    const { groups, positions, root } = createEquipmentAssembly(model);
    const supplies = rearLayoutFor(model)?.supplies ?? serverSuppliesFor(model);
    const seats = new RearModuleSeats();
    for (const { id } of supplies) {
      const module = groups.get(id)!,
        scope = layerScopeFor(module, "bay-contact")!;
      const [plug, socket] = scope.members;
      for (const open of [true, false]) {
        poseAssemblyLayer(scope.layerRoot, open);
        root.updateWorldMatrix(true, true);
        const pads = plug.getObjectsByProperty("name", "bay-blade-pad"),
          fingers = socket.getObjectsByProperty("name", "bay-contact-finger");
        assert.equal(pads.length, 3);
        assert.equal(fingers.length, 3);
        for (const [i, pad] of pads.entries()) {
          const a = new Box3().setFromObject(pad, true),
            b = new Box3().setFromObject(fingers[i], true);
          assert.ok(Math.abs(a.max.y - b.min.y) < 1e-7);
          assert.equal(a.min.z < b.max.z && a.max.z > b.min.z, !open);
        }
      }
      seats.update(groups, positions, id, model, "withdrawn");
      const mount = socket.getObjectByName("bay-receiver-mount")!;
      assert.equal(mount.children.length, 4);
      const floor = new Box3().setFromObject(
        socket.getObjectByName("bay-receiver-floor")!,
        true,
      );
      for (const leg of [mount.children[1], mount.children[3]]) {
        const b = new Box3().setFromObject(leg, true);
        assert.ok(
          Math.abs(floor.min.y - b.max.y) < 1e-7 &&
            floor.min.z < b.max.z &&
            floor.max.z > b.min.z,
        );
      }
      seats.clear();
      assert.equal(socket.getObjectByName("bay-receiver-mount"), undefined);
    }
    seats.dispose();
  }
});
