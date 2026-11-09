import * as THREE from "three";
import { devices } from "../installation.ts";
import { createAnnotationGroup } from "./annotations.ts";
import type { SliceDeviceInspection } from "../slice-device.ts";

/** 小方框表示估计位置，圈/叉表示输入；虚线仅供位置核对。 */
export class SliceEvidenceGeometry {
  root = createAnnotationGroup("slice-evidence");
  geometry = new THREE.BufferGeometry();
  material = new THREE.LineBasicMaterial({
    color: "#d6ecea",
    depthWrite: false,
    toneMapped: false,
  });
  marks = new THREE.LineSegments(this.geometry, this.material);
  lineGeometry = new THREE.BufferGeometry();
  lineMaterial = new THREE.LineDashedMaterial({
    color: "#bad5d8",
    dashSize: 0.045,
    gapSize: 0.035,
    depthWrite: false,
    toneMapped: false,
  });
  line = new THREE.Line(this.lineGeometry, this.lineMaterial);
  private dirty = true;
  private rotation = new THREE.Quaternion();
  context: SliceDeviceInspection | null = null;
  sourceId: string | null = null;
  constructor() {
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array((devices.length * 40 + 8) * 3),
        3,
      ),
    );
    this.lineGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(6), 3),
    );
    this.lineGeometry.setAttribute(
      "lineDistance",
      new THREE.BufferAttribute(new Float32Array(2), 1),
    );
    this.marks.raycast = () => {};
    this.line.raycast = () => {};
    this.marks.frustumCulled = false;
    this.line.frustumCulled = false;
    this.root.add(this.marks, this.line);
    this.root.visible = false;
  }
  update(context: SliceDeviceInspection | null, sourceId: string | null) {
    this.dirty = true;
    this.context = context;
    this.sourceId = sourceId;
    this.root.visible = !!context?.point;
  }
  frame(camera: THREE.Camera, ready = true) {
    const context = this.context;
    this.root.visible = ready && !!context?.point;
    if (!context?.point || !this.root.visible) return;
    if (!this.dirty && this.rotation.equals(camera.quaternion)) return;
    this.dirty = false;
    this.rotation.copy(camera.quaternion);
    const vertices: number[] = [];
    const p = new THREE.Vector3(),
      q = camera.quaternion;
    const segment = (
      point: number[],
      ax: number,
      ay: number,
      bx: number,
      by: number,
    ) => {
      for (const [x, y] of [
        [ax, ay],
        [bx, by],
      ]) {
        p.set(x, y, 0).applyQuaternion(q);
        vertices.push(point[0] + p.x, point[1] + p.y, point[2] + p.z);
      }
    };
    const size = 0.055;
    for (const [ax, ay, bx, by] of [
      [-size, -size, size, -size],
      [size, -size, size, size],
      [size, size, -size, size],
      [-size, size, -size, -size],
    ])
      segment(context.point, ax, ay, bx, by);
    for (const input of context.evidence?.inputs ?? []) {
      const radius = input.id === this.sourceId ? 0.045 : 0.023;
      if (input.temperature === null) {
        segment(input.position, -radius, -radius, radius, radius);
        segment(input.position, -radius, radius, radius, -radius);
      } else
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2,
            b = ((i + 1) / 20) * Math.PI * 2;
          segment(
            input.position,
            Math.cos(a) * radius,
            Math.sin(a) * radius,
            Math.cos(b) * radius,
            Math.sin(b) * radius,
          );
        }
    }
    const positions = this.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    positions.array.set(vertices);
    positions.needsUpdate = true;
    this.geometry.setDrawRange(0, vertices.length / 3);
    const source = context.evidence?.inputs.find(
      (input) => input.id === this.sourceId,
    );
    this.line.visible = !!source;
    if (source) {
      const positions = this.lineGeometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      positions.array.set([...context.point, ...source.position]);
      positions.needsUpdate = true;
      const distances = this.lineGeometry.getAttribute(
        "lineDistance",
      ) as THREE.BufferAttribute;
      distances.setX(
        1,
        Math.hypot(...context.point.map((v, i) => v - source.position[i])),
      );
      distances.needsUpdate = true;
    }
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
    this.root.clear();
    this.root.removeFromParent();
  }
}
