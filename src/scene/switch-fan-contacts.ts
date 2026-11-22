import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { switchRear, type FanContactView } from "../assembly-pairs.ts";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";
import { contactCenters, switchFanReceiver } from "./switch-fan-receiver.ts";
import type { Box } from "./equipment-model.ts";

// 触片贴在模块内端开口旁。固定座从板缘伸向模块，触头与触片端面相接。
export function buildSwitchFanContacts(
  groups: Map<string, THREE.Group>,
  box: Box,
) {
  const board = groups.get("net-board")!;
  const edge = board.getObjectByName("switch-board-rear")!;
  edge.updateWorldMatrix(true, false);
  const pcb = new THREE.Box3().setFromObject(edge);
  const bank = new THREE.Group();
  bank.name = "fan-receivers";
  board.add(bank);
  const layout = definition.switchAssembly.fanContact;
  const brass = new THREE.MeshStandardMaterial({
    color: "#ceb078",
    metalness: 0.48,
    roughness: 0.48,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: "#84949a",
    metalness: 0.48,
    roughness: 0.48,
  });
  const rivet = new THREE.CylinderGeometry(0.0006, 0.0006, 0.0004, 20);
  for (const fan of switchRear.fans) {
    const owner = groups.get(fan.id)!;
    const module = owner.getObjectByName("fan-module")!;
    module.updateWorldMatrix(true, true);
    const frame = new THREE.Box3().setFromObject(
      module.getObjectByName("fan-front-frame")!,
    );
    const center = frame.getCenter(new THREE.Vector3());
    center.x = frame.max.x - 0.0049;
    center.y = frame.min.y + 0.01;
    center.z = frame.max.z;
    const plug = new THREE.Group();
    plug.name = "fan-contact-plate";
    plug.position.copy(module.worldToLocal(center.clone()));
    module.add(plug);
    box(plug, [0.008, 0.009, 0.0015], [0, 0, 0.00075], "#426656").name =
      "fan-contact-substrate";
    const socket = new THREE.Group();
    socket.name = "receiver-" + fan.id;
    socket.userData.fanSlot = fan.id;
    socket.position.copy(board.worldToLocal(center.clone()));
    bank.add(socket);
    const back = pcb.min.z - center.z + 0.004;
    const height = center.y - 0.003 - pcb.max.y;
    // 座脚落在板面，横梁从座脚伸到两只触头的套筒。
    box(
      socket,
      [0.01, height, 0.003],
      [0, -0.003 - height / 2, back - 0.0015],
      "#456554",
    ).name = "fan-receiver-foot";
    switchFanReceiver(board, module, socket, fan.id, back, box, brass, metal);
    for (const [x, y] of contactCenters)
      box(plug, [0.003, 0.0036, 0.0006], [x, y, 0.0018], "#d2aa70", 0.48).name =
        "fan-contact-pad";
    // 触片基板铆在框板实面上，固定座的两侧焊脚落在板缘。
    for (const side of [-1, 1]) {
      const fastener = new THREE.Mesh(rivet, metal);
      fastener.name = "fan-plate-rivet";
      fastener.rotation.x = Math.PI / 2;
      fastener.position.set(side * 0.0028, -0.0032, 0.0017);
      plug.add(fastener);
      box(
        socket,
        [0.0014, 0.0006, 0.002],
        [side * 0.0057, pcb.max.y - center.y + 0.0003, back - 0.0015],
        "#a69976",
        0.5,
      ).name = "fan-receiver-tab";
    }
    const [x, y, z] = layout.focusDirection;
    registerLayer(module, {
      node: module.name,
      offset: [0, 0, -layout.travel],
      direction: [x, y, z],
    });
    for (const view of ["fan-contact", "fan-bank"] satisfies FanContactView[]) {
      const close = view === "fan-contact";
      const scope = {
        layerRoot: module,
        moving: close ? plug : module,
        members: close
          ? [plug, socket]
          : [groups.get(switchRear.fanGroup.id)!, edge, bank],
      };
      registerLayerScope(owner, view + ":" + fan.id, {
        ...scope,
        selectedBranch: close ? plug : module,
      });
      registerLayerScope(board, view + ":" + fan.id, {
        ...scope,
        selectedBranch: close ? socket : edge,
      });
    }
  }
}
