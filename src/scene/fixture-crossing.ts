import * as THREE from "three";
import type { FixtureCrossing } from "../fixture-crossing.ts";
import { createAnnotationGroup } from "./annotations.ts";

export class CrossingGeometry {
  root = createAnnotationGroup("fixture-crossing");
  material = new THREE.LineBasicMaterial({
    color: "#b9d5cb",
    toneMapped: false,
    transparent: true,
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
    if (pair.kind === "grille-seat") {
      pair.outline.forEach((p, i) => points.push(p, pair.outline[(i + 1) % 4]));
    } else if (pair.kind === "light-rod") {
      const offset = new THREE.Vector3(0, 0.14, pair.toward * 0.035);
      const a = top.clone().add(offset);
      const b = bottom.clone().add(offset);
      points.push(top, a, a, b, b, bottom);
    } else if (pair.kind === "tray-bay") {
      const offset = new THREE.Vector3(0, -0.1, pair.toward * 0.1);
      const a = top.clone().add(offset);
      const b = bottom.clone().add(offset);
      points.push(top, a, a, b, b, bottom);
    } else if (pair.kind === "tray-support") {
      const z = Math.max(top.z, bottom.z) + 0.07;
      const a = new THREE.Vector3(top.x, bottom.y, z);
      const b = new THREE.Vector3(bottom.x, bottom.y, z);
      points.push(top, a, a, b, b, bottom);
    } else if (pair.kind === "roof-entry") {
      // 尺线移到板面稍上方以避开孔边压条；量取的 X/Z 坐标仍来自配置。
      const edge = bottom.clone();
      edge.y += 0.009;
      const foot = top.clone().setY(edge.y);
      points.push(top, foot, foot, edge);
      const outline = pair.outline.map((p) => p.clone().setY(edge.y));
      outline.forEach((p, i) =>
        points.push(p, outline[(i + 1) % outline.length]),
      );
    } else if (
      pair.kind === "smoke-tray" ||
      (pair.kind === "smoke-light" && pair.view === "housing")
    ) {
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
