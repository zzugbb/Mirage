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
    const points: THREE.Vector3[] = [];
    if (pair.kind === "smoke-tray") {
      const foot = top.clone().setY(bottom.y);
      points.push(top, foot, foot, bottom);
    } else {
      const brackets =
        pair.kind === "lighting-round"
          ? [pair.points, pair.source.points]
          : [pair.points];
      for (const [upper, lower] of brackets) {
        const offset = new THREE.Vector3(-0.22, 0, 0);
        const a = upper.clone().add(offset);
        const b = lower.clone().add(offset);
        points.push(upper, a, a, b, b, lower);
      }
    }
    // 每种观察的线段数量不同，释放旧顶点缓冲后按当前标记重建。
    this.geometry.dispose();
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        points.flatMap((p) => p.toArray()),
        3,
      ),
    );
    this.geometry.setDrawRange(0, points.length);
    this.geometry.computeBoundingSphere();
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.root.removeFromParent();
  }
}
