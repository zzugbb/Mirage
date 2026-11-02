import * as THREE from "three";
import { airflowSettings, flowPoint } from "../airflow.ts";
import type { AirflowSnapshot, FlowKind, FlowPoint } from "../airflow.ts";
import { sliceRackRows } from "../temperature-slice.ts";

const kinds: FlowKind[] = ["supply", "through", "return"];
const maximumRoutes = sliceRackRows.length;
type CachedPath = {
  points: FlowPoint[];
  animated: boolean;
  index: number;
  color: THREE.Color;
};
/** 少量实例化箭头和粒子；路径不参与拾取，穿柜段用低亮度透视线表达方向。 */
export class AirflowGeometry {
  root = new THREE.Group();
  cone = new THREE.ConeGeometry(0.065, 0.19, 8);
  sphere = new THREE.SphereGeometry(0.055, 8, 6);
  ribbon = new THREE.CylinderGeometry(1, 1, 1, 6);
  batches = kinds.map((kind) => {
    const arrows = new THREE.InstancedMesh(
      this.cone,
      new THREE.MeshBasicMaterial({
        vertexColors: false,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        depthTest: kind !== "through",
        toneMapped: false,
      }),
      maximumRoutes * 3,
    );
    const sparks = new THREE.InstancedMesh(
      this.sphere,
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        depthTest: kind !== "through",
        toneMapped: false,
      }),
      maximumRoutes * 3,
    );
    const band = new THREE.InstancedMesh(
      this.ribbon,
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        depthTest: kind !== "through",
        toneMapped: false,
      }),
      maximumRoutes * airflowSettings.samples,
    );
    for (const mesh of [arrows, sparks, band]) {
      mesh.count = 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.raycast = () => {};
      mesh.frustumCulled = false;
    }
    if (kind === "through")
      for (const object of [arrows, sparks, band]) object.renderOrder = 4;
    this.root.add(arrows, sparks, band);
    return { kind, arrows, sparks, band, paths: [] as CachedPath[] };
  });
  transform = new THREE.Object3D();
  position = new THREE.Vector3();
  tangent = new THREE.Vector3();
  next = new THREE.Vector3();
  up = new THREE.Vector3(0, 1, 0);
  key = "";
  enabled = false;
  constructor() {
    this.root.visible = false;
  }
  at(path: CachedPath, t: number, target: THREE.Vector3) {
    const scaled = Math.max(0, Math.min(1, t)) * airflowSettings.samples,
      index = Math.min(airflowSettings.samples - 1, Math.floor(scaled));
    return target
      .fromArray(path.points[index])
      .lerp(this.next.fromArray(path.points[index + 1]), scaled - index);
  }
  update(snapshot: AirflowSnapshot | null) {
    this.enabled = !!snapshot?.routes.length;
    this.root.visible = this.enabled;
    if (!snapshot) return;
    const key = JSON.stringify(
      snapshot.routes.map((route) => [route.id, route.segments]),
    );
    if (key !== this.key) {
      this.key = key;
      for (const batch of this.batches)
        batch.paths = snapshot.routes.map((route, index) => {
          const points = route.segments.find(
            (segment) => segment.kind === batch.kind,
          )!.points;
          return {
            points: Array.from(
              { length: airflowSettings.samples + 1 },
              (_, i) => flowPoint(points, i / airflowSettings.samples),
            ),
            animated: route.animated,
            index,
            color: new THREE.Color(),
          };
        });
    }
    for (const batch of this.batches) {
      let arrow = 0,
        strip = 0;
      batch.paths.forEach((path, index) => {
        path.animated = snapshot.routes[index].animated;
        path.color.set(
          path.animated
            ? airflowSettings.colors[batch.kind]
            : airflowSettings.colors.unknown,
        );
        for (let i = 0; i < airflowSettings.samples; i++) {
          const a = path.points[i],
            b = path.points[i + 1];
          // 回风保留间隔，送风连续；实体线宽不依赖 WebGL 的单像素线限制。
          if (batch.kind !== "return" || i % 3 !== 2) {
            this.position.fromArray(a);
            this.tangent.fromArray(b).sub(this.position);
            this.transform.position
              .copy(this.position)
              .addScaledVector(this.tangent, 0.5);
            this.transform.scale.set(0.03, this.tangent.length(), 0.03);
            this.transform.quaternion.setFromUnitVectors(
              this.up,
              this.tangent.normalize(),
            );
            this.transform.updateMatrix();
            batch.band.setMatrixAt(strip, this.transform.matrix);
            batch.band.setColorAt(strip++, path.color);
          }
        }
        for (const t of [0.2, 0.55, 0.85]) {
          this.at(path, t, this.position);
          this.at(path, t + 0.01, this.tangent)
            .sub(this.position)
            .normalize();
          this.transform.position.copy(this.position);
          this.transform.scale.setScalar(1);
          this.transform.quaternion.setFromUnitVectors(this.up, this.tangent);
          this.transform.updateMatrix();
          batch.arrows.setMatrixAt(arrow, this.transform.matrix);
          batch.arrows.setColorAt(arrow, path.color);
          arrow++;
        }
      });
      batch.band.count = strip;
      batch.band.instanceMatrix.needsUpdate = true;
      if (batch.band.instanceColor) batch.band.instanceColor.needsUpdate = true;
      batch.arrows.count = arrow;
      batch.arrows.instanceMatrix.needsUpdate = true;
      if (batch.arrows.instanceColor)
        batch.arrows.instanceColor.needsUpdate = true;
    }
    this.batches.forEach((batch) => {
      batch.band.material.opacity =
        batch.kind === "supply" ? 0.55 + snapshot.coolingCapacity * 0.003 : 0.7;
    });
    this.animate(snapshot.time, false, true);
  }
  animate(time: number, reducedMotion = false, roomReady = true) {
    this.root.visible = this.enabled && roomReady;
    if (!this.root.visible) return;
    for (const batch of this.batches) {
      batch.sparks.visible = !reducedMotion;
      let count = 0;
      for (const path of batch.paths) {
        if (!path.animated || reducedMotion) continue;
        const particles = batch.kind === "through" ? 2 : 3;
        for (let i = 0; i < particles; i++) {
          const t =
            (((time * airflowSettings.visualCyclesPerSecond +
              i / particles +
              path.index * 0.27) %
              1) +
              1) %
            1;
          this.at(path, t, this.position);
          this.transform.position.copy(this.position);
          this.transform.scale.setScalar(1);
          this.transform.quaternion.identity();
          this.transform.updateMatrix();
          batch.sparks.setMatrixAt(count, this.transform.matrix);
          batch.sparks.setColorAt(count, path.color);
          count++;
        }
      }
      batch.sparks.count = count;
      batch.sparks.instanceMatrix.needsUpdate = true;
      if (batch.sparks.instanceColor)
        batch.sparks.instanceColor.needsUpdate = true;
    }
  }
  dispose() {
    this.cone.dispose();
    this.sphere.dispose();
    this.ribbon.dispose();
    for (const batch of this.batches) {
      for (const mesh of [batch.arrows, batch.sparks, batch.band]) {
        mesh.material.dispose();
        mesh.dispose();
      }
    }
    this.root.clear();
    this.root.removeFromParent();
  }
}
