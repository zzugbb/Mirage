import * as THREE from "three";
import { createEquipmentAssembly } from "./equipment-model.ts";
import type { Assembly } from "./equipment-model.ts";
import { internalStructureThreshold } from "../part-inspection.ts";

/** 外观保留原始比例、贴图与材质；没有内部节点的资产不伪装成可拆 CAD。 */
export function createExteriorAssembly(
  modelId: string,
  source: THREE.Group,
): Assembly {
  const schematic = createEquipmentAssembly(modelId);
  const root = new THREE.Group(),
    exterior = new THREE.Group();
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.x) || size.x <= 0) throw Error("外观模型尺寸无效");
  const scale = 0.45 / size.x;
  exterior.scale.setScalar(scale);
  exterior.position
    .copy(bounds.getCenter(new THREE.Vector3()))
    .multiplyScalar(-scale);
  exterior.add(source);
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = object.receiveShadow = true;
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material])
      if (material instanceof THREE.MeshStandardMaterial && material.map)
        material.map.anisotropy = 8;
  });
  root.add(exterior, schematic.root);
  const assembly = {
    root,
    groups: schematic.groups,
    positions: schematic.positions,
    representations: { exterior, schematic: schematic.root },
  };
  poseExterior(assembly, 0);
  root.updateMatrixWorld(true);
  return assembly;
}

/** “展开示意”是明确的表达方式切换，复原后重新呈现原始外观。 */
export function poseExterior(assembly: Assembly, explosion: number) {
  if (!assembly.representations) return;
  assembly.representations.exterior.visible =
    explosion <= internalStructureThreshold;
  assembly.representations.schematic.visible =
    explosion > internalStructureThreshold;
}
