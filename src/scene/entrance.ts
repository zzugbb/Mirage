import * as THREE from "three";
import {
  entranceSettings as s,
  entranceLeaf as leaf,
  entranceHinges,
} from "../entrance.ts";

/** 静态入口布置：门框与门扇共用洞口配置，不提供门状态或开锁控制。 */
export function buildEntrance(root: THREE.Group) {
  const frame = new THREE.MeshStandardMaterial({
    color: s.frameColor,
    metalness: 0.55,
    roughness: 0.62,
  });
  const panel = new THREE.MeshStandardMaterial({
    color: s.leafColor,
    metalness: 0.35,
    roughness: 0.7,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: s.hardwareColor,
    metalness: 0.75,
    roughness: 0.38,
  });
  const box = (
    parent: THREE.Object3D,
    name: string,
    size: number[],
    position: number[],
    material: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...(size as [number, number, number])),
      material,
    );
    mesh.name = name;
    mesh.position.fromArray(position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  for (const side of [-1, 1])
    box(
      root,
      `entrance-jamb-${side}`,
      [s.frameWidth, s.openingHeight, s.frameDepth],
      [(side * (s.openingWidth - s.frameWidth)) / 2, 0, 0],
      frame,
    );
  box(
    root,
    "entrance-head",
    [s.openingWidth - 2 * s.frameWidth, s.frameWidth, s.frameDepth],
    [0, (s.openingHeight - s.frameWidth) / 2, 0],
    frame,
  );
  const pivot = new THREE.Group();
  pivot.name = "entrance-leaf-pivot";
  pivot.position.set(leaf.pivotX, 0, leaf.pivotZ);
  pivot.rotation.y = s.displayAngle;
  root.add(pivot);
  box(
    pivot,
    "entrance-leaf",
    [leaf.width, leaf.height, s.leafThickness],
    [leaf.width / 2, leaf.bottom + leaf.height / 2, -s.leafThickness / 2],
    panel,
  );
  const hingeGeometry = new THREE.CylinderGeometry(
    s.hingeRadius,
    s.hingeRadius,
    s.hingeLength,
    12,
  );
  for (const { name, offset } of entranceHinges) {
    const hinge = new THREE.Mesh(hingeGeometry, metal);
    hinge.name = name;
    hinge.position.fromArray(offset);
    hinge.castShadow = true;
    root.add(hinge);
  }
  for (const side of [-1, 1]) {
    const handleX = leaf.width - s.handleInset;
    const handleY = s.handleHeight - s.openingHeight / 2;
    const faceZ = ((side - 1) * s.leafThickness) / 2;
    box(
      pivot,
      `entrance-handle-plate-${side}`,
      s.handlePlateSize,
      [handleX, handleY, faceZ + (side * s.handlePlateSize[2]) / 2],
      metal,
    );
    box(
      pivot,
      `entrance-handle-stem-${side}`,
      [s.handleSize[1], s.handleSize[1], s.handleStandOff],
      [handleX, handleY, faceZ + (side * s.handleStandOff) / 2],
      metal,
    );
    box(
      pivot,
      `entrance-handle-${side}`,
      s.handleSize,
      [handleX - s.handleSize[0] / 2, handleY, faceZ + side * s.handleStandOff],
      metal,
    );
    box(
      pivot,
      `entrance-kick-${side}`,
      [leaf.width - 2 * s.kickInset, s.kickHeight, 0.004],
      [
        leaf.width / 2,
        leaf.bottom + s.kickInset + s.kickHeight / 2,
        faceZ + side * 0.002,
      ],
      frame,
    );
  }
  return pivot;
}
