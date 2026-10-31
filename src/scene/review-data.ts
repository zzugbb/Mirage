import * as THREE from "three";
import type { SpatialMark } from "../review-spatial.ts";
import { observationColor } from "./metric-color.ts";

type Glyph = {
  id: string;
  color: THREE.ColorRepresentation;
  size: number[];
  position: number[];
  angle?: number;
};
/** 空间读数采用两批实例网格；时间变化更新实例属性，不逐秒重建材质。 */
export class ReviewDataGeometry {
  root = new THREE.Group();
  geometry = new THREE.BoxGeometry(1, 1, 1);
  solid = new THREE.InstancedMesh(
    this.geometry,
    new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
    256,
  );
  ghost = new THREE.InstancedMesh(
    this.geometry,
    new THREE.MeshBasicMaterial({
      color: "#ffffff",
      toneMapped: false,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
    256,
  );
  transform = new THREE.Object3D();
  color = new THREE.Color();
  constructor() {
    this.root.add(this.solid, this.ghost);
    for (const mesh of [this.solid, this.ghost]) {
      mesh.count = 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
  }
  update(marks: SpatialMark[]) {
    const solid: Glyph[] = [],
      ghost: Glyph[] = [];
    let entityId = "";
    const box = (
      color: THREE.ColorRepresentation,
      size: number[],
      position: number[],
      faint = false,
      angle = 0,
    ) =>
      (faint ? ghost : solid).push({
        id: entityId,
        color,
        size,
        position,
        angle,
      });
    for (const mark of marks) {
      entityId = mark.id;
      const [x, y, z] = mark.position,
        color = observationColor(mark.reading, mark.kind);
      if (mark.kind === "temperature") {
        box("#25424c", [0.09, mark.height, 0.018], [x, y, z], true);
        box(color, [0.065, mark.height * 0.76, 0.022], [x, y, z + 0.006]);
        if (mark.fraction === null)
          box("#d2dadd", [0.065, 0.004, 0.024], [x, y, z + 0.02], false, 0.5);
      } else {
        box(
          "#88b3bd",
          [0.008, mark.height, 0.012],
          [x, y + mark.height / 2, z],
          true,
        );
        for (let i = 0; i <= 4; i++)
          box(
            "#abc8cc",
            [i % 2 === 0 ? 0.1 : 0.065, 0.006, 0.014],
            [x, y + (mark.height * i) / 4, z],
            true,
          );
        if (mark.fraction !== null) {
          const height = Math.max(0.008, mark.height * mark.fraction);
          box(
            color,
            [0.045, height, 0.024],
            [x + 0.033, y + height / 2, z + 0.004],
          );
          box(color, [0.14, 0.016, 0.025], [x + 0.025, y + height, z + 0.008]);
        } else box("#a0abb2", [0.12, 0.012, 0.022], [x + 0.02, y + 0.03, z]);
      }
    }
    for (const [mesh, glyphs] of [
      [this.solid, solid],
      [this.ghost, ghost],
    ] as const) {
      mesh.count = glyphs.length;
      mesh.userData.instanceEntityIds = glyphs.map((g) => g.id);
      mesh.userData.instanceVisible = glyphs.map(() => true);
      glyphs.forEach((glyph, i) => {
        this.transform.position.fromArray(glyph.position);
        this.transform.scale.fromArray(glyph.size);
        this.transform.rotation.z = glyph.angle ?? 0;
        this.transform.updateMatrix();
        mesh.setMatrixAt(i, this.transform.matrix);
        mesh.setColorAt(i, this.color.set(glyph.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    this.root.visible = marks.length > 0;
  }
  dispose() {
    this.geometry.dispose();
    for (const mesh of [this.solid, this.ghost]) {
      mesh.material.dispose();
      mesh.dispose();
    }
    this.root.clear();
    this.root.removeFromParent();
  }
}
