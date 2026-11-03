import * as THREE from "three";
import type { NetworkMarker } from "../network.ts";
/** 只标记代表端点，不绘制未校核的物理线缆或模拟数据流。 */
export class NetworkGeometry {
  root = new THREE.Group();
  geometry = new THREE.RingGeometry(0.02, 0.026, 24);
  material = new THREE.MeshBasicMaterial({
    color: "#b9d5cb",
    toneMapped: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  dots = new THREE.InstancedMesh(this.geometry, this.material, 2);
  transform = new THREE.Object3D();
  bounds = new THREE.Box3();
  markers: NetworkMarker[] = [];
  constructor() {
    this.root.add(this.dots);
    this.root.visible = false;
    this.dots.count = 0;
    this.dots.frustumCulled = false;
    this.dots.raycast = () => {};
    this.dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  update(markers: NetworkMarker[]) {
    this.markers = markers;
    this.root.visible = false;
  }
  frame(
    ready: boolean,
    parts: Map<string, THREE.Group>,
    camera?: THREE.Camera,
  ) {
    if (camera) this.transform.quaternion.copy(camera.quaternion);
    let index = 0;
    for (const marker of this.markers) {
      if (marker.point) this.transform.position.fromArray(marker.point);
      else {
        const part = marker.partId ? parts.get(marker.partId) : null;
        if (!part) continue;
        this.bounds.setFromObject(part).getCenter(this.transform.position);
      }
      this.transform.updateMatrix();
      this.dots.setMatrixAt(index++, this.transform.matrix);
    }
    this.dots.count = index;
    this.root.visible = ready && index > 0;
    this.dots.instanceMatrix.needsUpdate = true;
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.dots.dispose();
    this.root.clear();
    this.root.removeFromParent();
  }
}
