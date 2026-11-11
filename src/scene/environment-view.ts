import * as THREE from "three";
import type { EnvironmentInspection } from "../environment-view.ts";
import { createAnnotationGroup } from "./annotations.ts";

export class EnvironmentViewGeometry {
  root = createAnnotationGroup("environment-view");
  private material = new THREE.LineBasicMaterial({
    color: "#c5ded6",
    toneMapped: false,
    depthWrite: false,
  });
  private geometry = new THREE.BufferGeometry();
  private lines = new THREE.LineSegments(this.geometry, this.material);
  constructor() {
    this.root.add(this.lines);
    this.root.visible = false;
    this.lines.raycast = () => {};
  }
  update(inspection: EnvironmentInspection | null) {
    this.root.visible = !!inspection;
    if (!inspection) return;
    const points: THREE.Vector3[] = [];
    for (const { point } of inspection.probes) {
      // 各自的高度参考线，留在墙前；不画两探头之间的连接或覆盖区域。
      const center = point.clone().add(new THREE.Vector3(0.09, 0, 0));
      points.push(center.clone().setY(0), center.clone());
      for (const y of [0, center.y])
        points.push(
          new THREE.Vector3(center.x, y, center.z - 0.09),
          new THREE.Vector3(center.x, y, center.z + 0.09),
        );
      for (let i = 0; i < 24; i++)
        for (const a of [i, i + 1])
          points.push(
            center
              .clone()
              .add(
                new THREE.Vector3(
                  0,
                  Math.cos((a * Math.PI) / 12) * 0.12,
                  Math.sin((a * Math.PI) / 12) * 0.12,
                ),
              ),
          );
    }
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
