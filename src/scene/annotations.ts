import * as THREE from "three";

/** 数据图形仍正常绘制和遮挡，但不是参与接触阴影计算的实体。 */
export function createAnnotationGroup(name: string) {
  const group = new THREE.Group();
  group.name = `annotation-${name}`;
  group.userData.excludeFromContactShadows = true;
  return group;
}
