import * as THREE from "three";
import { subparts } from "../domain.ts";

/** 子件只重定父节点，不改变装配变换；展开由原模组统一驱动。 */
export function mapSubparts(
  root: THREE.Group,
  groups: Map<string, THREE.Group>,
) {
  const nodes = subparts
    .filter((part) => !part.procedural)
    .map((part) => {
      const node = root.getObjectByName(part.modelNode);
      const parent = groups.get(part.parent);
      if (!node || !parent) throw Error("模型缺少已登记的子部件节点");
      let ancestor = node.parent;
      while (ancestor && ancestor !== parent) ancestor = ancestor.parent;
      if (!ancestor) throw Error("子部件不属于已登记的父模组");
      return { part, node, parent };
    });
  for (const { part, node, parent } of nodes) {
    const group = new THREE.Group();
    parent.add(group);
    group.updateMatrixWorld(true);
    group.attach(node);
    group.userData.entityId = part.id;
    groups.set(part.id, group);
  }
}
