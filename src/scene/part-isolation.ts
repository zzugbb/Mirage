import type { Object3D } from "three";

/** 只暂隐目标分支之外的节点；保留子件、变换、材质和原本隐藏的表示。 */
export class PartIsolation {
  private hidden: Object3D[] = [];

  restore() {
    for (const object of this.hidden) object.visible = true;
    this.hidden = [];
  }

  apply(root: Object3D, target: Object3D | undefined) {
    return this.applyMany(root, target ? [target] : []);
  }

  /** 保留多个明确分支的并集；先校验全部路径，避免半途隐藏。 */
  applyMany(root: Object3D, targets: Object3D[]) {
    this.restore();
    if (!targets.length || targets.includes(root)) return false;
    const paths = new Set<Object3D>();
    for (const target of targets) {
      let current: Object3D | null = target;
      while (current && current !== root) {
        if (!current.visible) return false;
        paths.add(current);
        current = current.parent;
      }
      if (current !== root) return false;
    }
    const visit = (parent: Object3D) => {
      if (targets.includes(parent)) return;
      for (const sibling of parent.children) {
        if (paths.has(sibling)) visit(sibling);
        else if (sibling.visible) {
          sibling.visible = false;
          this.hidden.push(sibling);
        }
      }
    };
    visit(root);
    return true;
  }
}
