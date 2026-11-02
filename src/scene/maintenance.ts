import * as THREE from "three";
import { maintenanceSettings } from "../maintenance.ts";
import type { MaintenanceArea } from "../maintenance.ts";

/** 两个中性地面范围，保留深度测试，不参与对象拾取或运行告警。 */
export class MaintenanceGeometry {
  root = new THREE.Group();
  enabled = false;
  geometry = new THREE.BoxGeometry(1, 1, 1);
  border = new THREE.InstancedMesh(
    this.geometry,
    new THREE.MeshBasicMaterial({
      color: maintenanceSettings.color,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      toneMapped: false,
    }),
    8,
  );
  fill = new THREE.InstancedMesh(
    this.geometry,
    new THREE.MeshBasicMaterial({
      color: maintenanceSettings.color,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      toneMapped: false,
    }),
    2,
  );
  transform = new THREE.Object3D();
  constructor() {
    this.root.visible = false;
    this.root.add(this.border, this.fill);
    for (const mesh of [this.border, this.fill]) {
      mesh.count = 0;
      mesh.raycast = () => {};
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
  }
  update(areas: MaintenanceArea[]) {
    this.enabled = areas.length > 0;
    this.root.visible = this.enabled;
    let index = 0;
    for (const [i, area] of areas.entries()) {
      const [x, y, z] = area.position;
      this.transform.position.set(x, y, z);
      this.transform.scale.set(area.width, 0.002, area.depth);
      this.transform.updateMatrix();
      this.fill.setMatrixAt(i, this.transform.matrix);
      for (const [dx, dz, width, depth] of [
        [0, -area.depth / 2, area.width, 0.03],
        [0, area.depth / 2, area.width, 0.03],
        [-area.width / 2, 0, 0.03, area.depth],
        [area.width / 2, 0, 0.03, area.depth],
      ]) {
        this.transform.position.set(x + dx, y + 0.002, z + dz);
        this.transform.scale.set(width, 0.003, depth);
        this.transform.updateMatrix();
        this.border.setMatrixAt(index++, this.transform.matrix);
      }
    }
    this.fill.count = areas.length;
    this.border.count = index;
    this.fill.instanceMatrix.needsUpdate =
      this.border.instanceMatrix.needsUpdate = true;
  }
  setReady(ready: boolean) {
    this.root.visible = this.enabled && ready;
  }
  dispose() {
    this.geometry.dispose();
    for (const mesh of [this.border, this.fill]) {
      mesh.material.dispose();
      mesh.dispose();
    }
    this.root.clear();
    this.root.removeFromParent();
  }
}
