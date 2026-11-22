import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { modelById } from "../catalog.ts";
import { createFanModule } from "./fan-module.ts";
import {
  layerScopeFor,
  registerLayer,
  registerLayerScope,
} from "./assembly-layer.ts";
import { registerStorageFanMount } from "./storage-fan-mount.ts";

// 各维护子件的转子中心来自当前机型。只在核查轴系时显示原创剖视件。
export function buildServerFanMounts(
  groups: Map<string, THREE.Group>,
  modelId: string,
) {
  const layout = modelById(modelId).fanDuctLayout!;
  const template = createFanModule(layout.rotorSize, "guard");
  const guard = definition.storageAssembly.fanGuard;
  for (const { id, rotorX } of layout.modules) {
    const fan = groups.get(id)!;
    for (const [index, x] of rotorX.entries()) {
      const cutaway = new THREE.Group();
      cutaway.name = "fan-cutaway-" + (index + 1);
      cutaway.visible = false;
      cutaway.position.copy(
        fan.worldToLocal(new THREE.Vector3(x, layout.rotorY, layout.rotorZ)),
      );
      fan.add(cutaway);
      const mechanism = template.clone();
      cutaway.add(mechanism);
      // 内层视图将护网、叶轮依次移开。机构根与可动件各自保留零位。
      registerStorageFanMount(cutaway);
      const [dx, dy, dz] = guard.focusDirection;
      registerLayer(cutaway, {
        node: "fan-guard",
        offset: [0, 0, -guard.travel],
        direction: [dx, dy, dz],
      });
      const screen = mechanism.getObjectByName("fan-guard")!;
      registerLayerScope(fan, "guard:" + index, {
        layerRoot: cutaway,
        moving: screen,
        selectedBranch: screen,
        members: [mechanism],
        cutaway,
      });
      for (const key of ["rotor", "hub", "spindle"]) {
        const scope = layerScopeFor(cutaway, "storage-" + key)!;
        registerLayerScope(fan, key + ":" + index, { ...scope, cutaway });
      }
    }
  }
}
