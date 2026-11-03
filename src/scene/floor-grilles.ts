import * as THREE from "three";
import { floorGrilles, floorGrilleSettings as s } from "../floor-grilles.ts";

/** 齐平面框、横条与浅凹背衬；只表现格栅外观，不模拟地下风腔。 */
export function createFloorGrilles() {
  const root = new THREE.Group();
  root.name = "floor-grilles";
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const batch = (
    name: string,
    color: string,
    count: number,
    metalness: number,
  ) => {
    const mesh = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.72 }),
      count,
    );
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const frames = batch(
    "grille-frames",
    s.frameColor,
    floorGrilles.length * 4,
    0.45,
  );
  const slats = batch(
    "grille-slats",
    s.slatColor,
    floorGrilles.length * s.slatCount,
    0.55,
  );
  const backs = batch(
    "grille-backs",
    s.backingColor,
    floorGrilles.length,
    0.05,
  );
  const transform = new THREE.Object3D();
  const place = (
    mesh: THREE.InstancedMesh,
    index: number,
    size: number[],
    position: number[],
  ) => {
    transform.position.fromArray(position);
    transform.scale.fromArray(size);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  };
  floorGrilles.forEach(({ position: [x, y, z] }, index) => {
    for (const [i, side] of [-1, 1].entries()) {
      place(
        frames,
        index * 4 + i,
        [s.frameWidth, s.frameHeight, s.depth],
        [x + (side * (s.width - s.frameWidth)) / 2, y - s.frameHeight / 2, z],
      );
      place(
        frames,
        index * 4 + i + 2,
        [s.width - 2 * s.frameWidth, s.frameHeight, s.frameWidth],
        [x, y - s.frameHeight / 2, z + (side * (s.depth - s.frameWidth)) / 2],
      );
    }
    for (let i = 0; i < s.slatCount; i++)
      place(
        slats,
        index * s.slatCount + i,
        [s.width - 2 * s.frameWidth, s.slatHeight, s.slatWidth],
        [
          x,
          y - s.slatHeight / 2,
          z + (i - (s.slatCount - 1) / 2) * s.slatPitch,
        ],
      );
    place(
      backs,
      index,
      [s.width, s.backingThickness, s.depth],
      [x, y - s.recessDepth + s.backingThickness / 2, z],
    );
  });
  for (const mesh of [frames, slats, backs]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }
  return root;
}
