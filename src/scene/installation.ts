import * as THREE from "three";
import { racks, devices, rackForDevice, deviceHeight } from "../installation";
import type { AppState } from "../domain";
import { text } from "./models";
import type { SceneModel } from "./models";

/** 复用几何与贴图，实例材质由观察着色层独立绑定；静态实例不维护第二套结构动画。 */
export class InstallationScene {
  root = new THREE.Group();
  racks = new Map<string, THREE.Group>();
  devices = new Map<string, THREE.Group>();
  constructor(models: SceneModel) {
    const clone = (source: THREE.Group, id: string) => {
      const result = source.clone(true);
      result.traverse((object) => {
        object.userData = {};
      });
      result.userData.entityId = id;
      this.root.add(result);
      return result;
    };
    for (const rack of racks) {
      const group = clone(models.rack, rack.id);
      group.position.fromArray(rack.position);
      this.racks.set(rack.id, group);
      for (const child of [...group.children])
        if (child instanceof THREE.Sprite) group.remove(child);
      text(group, rack.name.slice(0, 3), [0, 2.36, 0], 0.1);
      // 克隆时柜门一律保留闭合装配姿态。
      for (const child of group.children)
        if (child.name === "rack-door") child.rotation.y = 0;
    }
    for (const device of devices) {
      const group = clone(models.server, device.id);
      group.position.set(
        rackForDevice(device.id).position[0],
        deviceHeight(device.id),
        0.105,
      );
      this.devices.set(device.id, group);
    }
  }
  update(state: AppState, inspection: number) {
    this.root.visible = state.level !== "device" && inspection === 0;
    const activeRack = rackForDevice(state.deviceId).id;
    for (const [id, group] of this.racks)
      group.visible = state.level === "room" && id !== activeRack;
    for (const [id, group] of this.devices)
      group.visible =
        id !== state.deviceId &&
        (state.level === "room" || rackForDevice(id).id === activeRack);
  }
  detach() {
    this.root.traverse((object) => {
      if (object instanceof THREE.Sprite) {
        object.material.map?.dispose();
        object.material.dispose();
      }
    });
    this.root.removeFromParent();
  }
}
