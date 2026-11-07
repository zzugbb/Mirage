import type { Object3D } from "three";

/** 只暂隐目标分支之外的节点；保留子件、变换、材质和原本隐藏的表示。 */
export class PartIsolation {
  private hidden: Object3D[] = [];

  restore() {
    for (const object of this.hidden) object.visible = true;
    this.hidden = [];
  }

  apply(root: Object3D, target: Object3D | undefined) {
    this.restore();
    if (!target || target === root) return false;
    const path: Object3D[] = [];
    let current: Object3D | null = target;
    while (current && current !== root) {
      if (!current.visible) return false;
      path.push(current);
      current = current.parent;
    }
    if (current !== root) return false;
    let parent = root;
    for (const child of path.reverse()) {
      for (const sibling of parent.children) {
        if (sibling !== child && sibling.visible) {
          sibling.visible = false;
          this.hidden.push(sibling);
        }
      }
      parent = child;
    }
    return true;
  }
}
