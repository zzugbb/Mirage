import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { rackBlankingUnits } from "../rack-blanking.ts";

const settings = definition.rack.blanking;
/** 两个实例批次表达实体封板和固定点；不生成设备身份或状态灯。 */
export function createRackBlanking(rackId: string) {
  const group = new THREE.Group();
  group.name = "rack-blanking";
  const body = new THREE.InstancedMesh(
    new THREE.BoxGeometry(
      settings.width,
      definition.rack.unitPitch - settings.gap,
      settings.depth,
    ),
    new THREE.MeshStandardMaterial({
      color: settings.color,
      metalness: 0.55,
      roughness: 0.6,
    }),
    definition.rack.units,
  );
  body.name = "blanking-panels";
  const fasteners = new THREE.InstancedMesh(
    new THREE.BoxGeometry(
      ...(settings.fastenerSize as [number, number, number]),
    ),
    new THREE.MeshStandardMaterial({
      color: settings.fastenerColor,
      metalness: 0.7,
      roughness: 0.5,
    }),
    definition.rack.units * 2,
  );
  fasteners.name = "blanking-fasteners";
  for (const mesh of [body, fasteners]) {
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
  }
  updateRackBlanking(group, rackId);
  return group;
}
/** 克隆机柜各自持有实例矩阵；切换活动机柜只更新矩阵，不重建共享几何。 */
export function updateRackBlanking(root: THREE.Object3D, rackId: string) {
  const group =
    root.name === "rack-blanking"
      ? root
      : root.getObjectByName("rack-blanking")!;
  const units = rackBlankingUnits(rackId);
  const body = group.getObjectByName("blanking-panels") as THREE.InstancedMesh;
  const fasteners = group.getObjectByName(
    "blanking-fasteners",
  ) as THREE.InstancedMesh;
  const matrix = new THREE.Matrix4();
  units.forEach((unit, i) => {
    const y = definition.rack.unitOrigin + unit * definition.rack.unitPitch;
    body.setMatrixAt(i, matrix.makeTranslation(0, y, settings.frontZ));
    for (const [j, side] of [-1, 1].entries())
      fasteners.setMatrixAt(
        i * 2 + j,
        matrix.makeTranslation(
          side * settings.fastenerX,
          y,
          settings.frontZ + settings.depth / 2 + settings.fastenerSize[2] / 2,
        ),
      );
  });
  body.count = units.length;
  fasteners.count = units.length * 2;
  for (const mesh of [body, fasteners]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }
  group.userData.units = units;
  return units;
}
