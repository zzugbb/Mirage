import * as THREE from "three";
import type { EntranceInspection } from "../entrance-view.ts";
import { createAnnotationGroup } from "./annotations.ts";

/** 配置洞口轮廓、高度参考线与空心端点；不生成连接线、门锁状态或探测覆盖。 */
export class EntranceViewGeometry {
  root = createAnnotationGroup("entrance-view");
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
  update(inspection: EntranceInspection | null) {
    this.root.visible = !!inspection;
    if (!inspection) return;
    const points: THREE.Vector3[] = [];
    for (const path of inspection.paths)
      for (let i = 1; i < path.length; i++) points.push(path[i - 1], path[i]);
    const radius =
      inspection.jamb ||
      "measure" in inspection ||
      inspection.view === "heads" ||
      inspection.view === "section" ||
      inspection.view === "hinges"
        ? 0.018
        : inspection.view === "head-boundary"
          ? 0.12
          : 0.055;
    const up = new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3(0, 0, 1);
    for (const [index, marker] of inspection.markers.entries()) {
      if (
        inspection.view === "hinges" &&
        inspection.hinges.selected !== null &&
        index > 0
      )
        continue;
      const head = inspection.view === "heads" ? inspection.heads[index] : null;
      const surface =
        inspection.view === "head-boundary"
          ? inspection.boundary[index]?.surface
          : undefined;
      const normal = head
        ? new THREE.Quaternion().setFromUnitVectors(forward, head.direction)
        : null;
      const center = head
        ? head.face.clone().addScaledVector(head.direction, 0.002)
        : inspection.view === "hinges"
          ? marker.point.clone().addScaledVector(forward, 0.005)
          : marker.point;
      for (let i = 0; i < 24; i++)
        for (const a of [i, i + 1]) {
          const offset = new THREE.Vector3(
            Math.cos((a * Math.PI) / 12) * radius,
            Math.sin((a * Math.PI) / 12) * radius,
            0,
          );
          if (inspection.view === "sweep") {
            if (marker.id === "entrance-sweep-door")
              offset.applyAxisAngle(up, inspection.sweep.pose.angle);
            else offset.set(offset.x, 0, offset.y);
          }
          if (surface === "east" || surface === "west")
            offset.set(0, offset.y, offset.x);
          if (surface === "floor" || surface === "ceiling")
            offset.set(offset.x, 0, offset.y);
          if (normal) offset.applyQuaternion(normal);
          points.push(center.clone().add(offset));
        }
    }
    // 观察段顶点数量不同，替换缓冲前释放旧 GPU 数据，避免残留上段线条。
    this.geometry.dispose();
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        points.flatMap((point) => point.toArray()),
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
