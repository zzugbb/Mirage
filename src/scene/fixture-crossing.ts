import * as THREE from "three";
import type { FixtureCrossing } from "../fixture-crossing.ts";
import { createAnnotationGroup } from "./annotations.ts";

export class CrossingGeometry {
  root = createAnnotationGroup("fixture-crossing");
  material = new THREE.LineBasicMaterial({
    color: "#b9d5cb",
    toneMapped: false,
    depthWrite: false,
  });
  geometry = new THREE.BufferGeometry();
  lines = new THREE.LineSegments(this.geometry, this.material);
  constructor() {
    this.root.add(this.lines);
    this.root.visible = false;
    this.lines.raycast = () => {};
  }
  update(pair: FixtureCrossing | null) {
    this.root.visible = !!pair;
    if (!pair) return;
    const [top, bottom] = pair.points;
    if (pair.kind === "smoke-tray") {
      const foot = top.clone().setY(bottom.y);
      this.geometry.setFromPoints([top, foot, foot, bottom]);
      this.geometry.computeBoundingSphere();
      return;
    }
    const a = top.clone().add(new THREE.Vector3(-0.22, 0, 0));
    const b = bottom.clone().add(new THREE.Vector3(-0.22, 0, 0));
    this.geometry.setFromPoints([top, a, a, b, b, bottom]);
    this.geometry.computeBoundingSphere();
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.root.removeFromParent();
  }
}
