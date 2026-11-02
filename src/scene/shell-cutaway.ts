import * as THREE from "three";

/** 仅剖切已登记的背景结构，不修改材质、灯光、业务状态或设备的深度遮挡。 */
export class ShellCutaway {
  enabled = true;
  entries: { group: THREE.Group; bounds: THREE.Box3; cut: boolean }[];
  ray = new THREE.Ray();
  direction = new THREE.Vector3();
  hit = new THREE.Vector3();
  padded = new THREE.Box3();
  constructor(groups: THREE.Group[]) {
    this.entries = groups.map((group) => ({
      group,
      bounds: new THREE.Box3().setFromObject(group),
      cut: false,
    }));
  }
  update(
    camera: THREE.Vector3,
    targets: THREE.Vector3[],
    roomVisible: boolean,
  ) {
    let count = 0;
    for (const entry of this.entries) {
      // 已剖切的结构保留少量退出余量，避免相机贴着边界移动时反复闪现。
      const bounds = this.padded
        .copy(entry.bounds)
        .expandByScalar(entry.cut ? 0.12 : 0);
      const cut =
        this.enabled &&
        roomVisible &&
        targets.some((target) => {
          const distance = this.direction.subVectors(target, camera).length();
          if (distance < 1e-6) return false;
          this.ray.set(camera, this.direction.normalize());
          return (
            !!this.ray.intersectBox(bounds, this.hit) &&
            this.hit.distanceTo(camera) < distance - 0.02
          );
        });
      entry.cut = cut;
      entry.group.visible = !cut;
      if (cut) count++;
    }
    return count;
  }
}
