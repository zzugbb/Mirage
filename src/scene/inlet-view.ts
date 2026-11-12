import * as THREE from "three";
import type { InletInspection } from "../inlet-view.ts";
import { createAnnotationGroup } from "./annotations.ts";

export class InletViewGeometry {
  root = createAnnotationGroup("inlet-view");
  private lines = [false, true].map((dashed) => {
    const settings = {
      color: dashed ? "#b7b9dc" : "#a2e1df",
      toneMapped: false,
      depthWrite: false,
    };
    const material = dashed
      ? new THREE.LineDashedMaterial({
          ...settings,
          dashSize: 0.035,
          gapSize: 0.025,
        })
      : new THREE.LineBasicMaterial(settings);
    const line = new THREE.Line(new THREE.BufferGeometry(), material);
    line.raycast = () => {};
    this.root.add(line);
    return line;
  });
  constructor() {
    this.root.visible = false;
  }
  update(inspection: InletInspection | null) {
    this.root.visible = !!inspection;
    if (!inspection) return;
    this.lines.forEach((line, index) => {
      const corners = inspection.devices[index].corners;
      line.geometry.dispose();
      line.geometry = new THREE.BufferGeometry().setFromPoints([
        ...corners,
        corners[0],
      ]);
      line.computeLineDistances();
    });
  }
  dispose() {
    this.lines.forEach((line) => {
      line.geometry.dispose();
      line.material.dispose();
    });
    this.root.removeFromParent();
  }
}
