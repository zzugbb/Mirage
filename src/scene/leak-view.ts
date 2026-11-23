import * as THREE from "three";
import type { LeakInspection } from "../leak-view.ts";
import { createAnnotationGroup } from "./annotations.ts";

/** 静态局部线段和空心端点；保留深度测试，不表示泄漏状态或覆盖面积。 */
export class LeakViewGeometry {
  root = createAnnotationGroup("leak-view");
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
  update(inspection: LeakInspection | null) {
    this.root.visible = !!inspection;
    if (!inspection) return;
    const points: THREE.Vector3[] = [];
    const lifted = (p: THREE.Vector3) =>
      p.clone().add(new THREE.Vector3(0, 0.018, 0));
    for (const path of inspection.paths)
      for (let i = 1; i < path.length; i++)
        points.push(lifted(path[i - 1]), lifted(path[i]));
    // 地面尺寸线单独绘制，两端短刻线与感应线实体区分。
    if (inspection.floor) {
      const { middle, edge, footprint } = inspection.floor;
      const offset = edge.clone().sub(middle);
      const tick = new THREE.Vector3(-offset.z, 0, offset.x)
        .normalize()
        .multiplyScalar(0.04);
      points.push(lifted(middle), lifted(edge));
      for (const p of [middle, edge])
        points.push(lifted(p).sub(tick), lifted(p).add(tick));
      // 配置投影独立于精模外形，以虚线标出尺寸线的柜体基准。
      footprint.forEach((start, i) => {
        const end = footprint[(i + 1) % footprint.length];
        const dashes = Math.ceil(start.distanceTo(end) / 0.13);
        for (let j = 0; j < dashes; j++) {
          points.push(
            lifted(start).lerp(lifted(end), j / dashes),
            lifted(start).lerp(lifted(end), (j + 0.5) / dashes),
          );
        }
      });
    } else {
      for (const marker of inspection.markers) {
        const center = lifted(marker.point);
        for (let i = 0; i < 24; i++)
          for (const a of [i, i + 1])
            points.push(
              center
                .clone()
                .add(
                  new THREE.Vector3(
                    Math.cos((a * Math.PI) / 12) * 0.055,
                    0,
                    Math.sin((a * Math.PI) / 12) * 0.055,
                  ),
                ),
            );
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
