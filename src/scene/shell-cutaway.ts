import * as THREE from "three";

/** 仅剖切已登记的背景结构，不修改材质、灯光、业务状态或设备的深度遮挡。 */
export class ShellCutaway {
  enabled = true;
  entries: { group: THREE.Group; bounds: THREE.Box3[]; cut: boolean }[];
  ray = new THREE.Ray();
  direction = new THREE.Vector3();
  hit = new THREE.Vector3();
  padded = new THREE.Box3();
  constructor(groups: THREE.Group[]) {
    this.entries = groups.map((group) => {
      // 墙体与凸出墙面的门扇、读卡器分别取界，避免一处突出扩大整面墙的厚度。
      group.updateWorldMatrix(true, true);
      const body = new THREE.Box3();
      const bounds: THREE.Box3[] = [];
      for (const child of group.children) {
        const box = new THREE.Box3().setFromObject(child);
        if (box.isEmpty()) continue;
        if (child instanceof THREE.Group) bounds.push(box);
        else body.union(box);
      }
      if (!body.isEmpty()) bounds.push(body);
      return { group, bounds, cut: false };
    });
  }
  update(
    camera: THREE.Vector3,
    targets: THREE.Vector3[],
    roomVisible: boolean,
    protectedObject?: THREE.Object3D,
  ) {
    let count = 0;
    for (const entry of this.entries) {
      // 已剖切的结构保留少量退出余量，避免相机贴着边界移动时反复闪现。
      let containsSelection = false;
      for (
        let parent = protectedObject;
        parent;
        parent = parent.parent ?? undefined
      )
        if (parent === entry.group) containsSelection = true;
      const cut =
        !containsSelection &&
        this.enabled &&
        roomVisible &&
        entry.bounds.some((part) => {
          const bounds = this.padded
            .copy(part)
            .expandByScalar(entry.cut ? 0.12 : 0);
          return targets.some((target) => {
            const distance = this.direction.subVectors(target, camera).length();
            if (distance < 1e-6) return false;
            this.ray.set(camera, this.direction.normalize());
            return (
              !!this.ray.intersectBox(bounds, this.hit) &&
              this.hit.distanceTo(camera) < distance - 0.02
            );
          });
        });
      entry.cut = cut;
      entry.group.visible = !cut;
      if (cut) count++;
    }
    return count;
  }
}
