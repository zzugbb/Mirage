import assert from "node:assert/strict";
import { test } from "node:test";
import { Box3, Mesh, Vector3 } from "three";
import { serverPowerStages, serverSuppliesFor } from "./assembly-pairs.ts";
import { createEquipmentAssembly } from "./scene/equipment-model.ts";
import { layerScopeFor, poseAssemblyLayer } from "./scene/assembly-layer.ts";
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
