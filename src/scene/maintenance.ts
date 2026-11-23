import { createAnnotationGroup } from "./annotations.ts";
import * as THREE from "three";
import { maintenanceSettings } from "../maintenance.ts";
import type {
  MaintenanceArea,
  MaintenanceAisle,
  MaintenanceGrille,
} from "../maintenance.ts";

/** 两个中性地面范围，保留深度测试，不参与对象拾取或运行告警。 */
export class MaintenanceGeometry {
  root = createAnnotationGroup("maintenance");
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
  ruler = new THREE.InstancedMesh(
    this.geometry,
    new THREE.MeshBasicMaterial({
      color: "#b7dedb",
      depthWrite: false,
      toneMapped: false,
    }),
    3,
  );
  overlap = new THREE.Mesh(
    this.geometry,
    new THREE.MeshBasicMaterial({
      color: "#ffcd80",
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  transform = new THREE.Object3D();
  constructor() {
    this.root.visible = false;
    this.root.add(this.border, this.fill, this.ruler, this.overlap);
    this.overlap.visible = false;
    this.overlap.raycast = () => {};
    for (const mesh of [this.border, this.fill, this.ruler]) {
      mesh.count = 0;
      mesh.raycast = () => {};
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
  }
  update(
    areas: MaintenanceArea[],
    aisle?: MaintenanceAisle,
    overlap?: MaintenanceGrille,
  ) {
    this.enabled = areas.length > 0;
    this.root.visible = this.enabled;
    this.overlap.visible = !!overlap && !!aisle;
    if (overlap && aisle) {
      this.overlap.scale.set(overlap.overlapWidth, 0.002, overlap.overlapDepth);
      this.overlap.position.set(
        (overlap.minX + overlap.maxX) / 2,
        aisle.front.position[1] + 0.006,
        (overlap.minZ + overlap.maxZ) / 2,
      );
    }
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
    this.ruler.count = 0;
    if (aisle) {
      const bar = (z: number, width: number, depth: number) => {
        this.transform.position.set(
          aisle.x,
          aisle.front.position[1] + 0.008,
          z,
        );
        this.transform.scale.set(width, 0.004, depth);
        this.transform.updateMatrix();
        this.ruler.setMatrixAt(this.ruler.count++, this.transform.matrix);
      };
      bar(aisle.startZ, 0.24, 0.025);
      if (Math.abs(aisle.gap) > 1e-8) {
        bar((aisle.startZ + aisle.endZ) / 2, 0.025, Math.abs(aisle.gap));
        bar(aisle.endZ, 0.24, 0.025);
      }
    }
    this.ruler.instanceMatrix.needsUpdate = true;
    this.fill.count = areas.length;
    this.border.count = index;
    this.fill.instanceMatrix.needsUpdate =
      this.border.instanceMatrix.needsUpdate = true;
  }
  setReady(ready: boolean) {
    this.root.visible = this.enabled && ready;
  }
  dispose() {
    this.overlap.material.dispose();
    this.geometry.dispose();
    for (const mesh of [this.border, this.fill, this.ruler]) {
      mesh.material.dispose();
      mesh.dispose();
    }
    this.root.clear();
    this.root.removeFromParent();
  }
}
