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
  cone = new THREE.ConeGeometry(0.035, 0.1, 8);
  sphere = new THREE.SphereGeometry(0.035, 8, 6);
  batches = kinds.map((kind) => {
    const count = maximumRoutes * airflowSettings.samples * 2;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geometry.setAttribute(
      "lineDistance",
      new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geometry.setDrawRange(0, 0);
    const line = new THREE.LineSegments(
      geometry,
      new THREE.LineDashedMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        depthTest: kind !== "through",
        toneMapped: false,
        dashSize: kind === "return" ? 0.12 : 0.3,
        gapSize: kind === "return" ? 0.12 : 0.04,
      }),
    );
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
    for (const mesh of [arrows, sparks]) {
      mesh.count = 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.raycast = () => {};
      mesh.frustumCulled = false;
    }
    line.raycast = () => {};
    if (kind === "through")
      for (const object of [line, arrows, sparks]) object.renderOrder = 4;
    this.root.add(line, arrows, sparks);
    return { kind, line, arrows, sparks, paths: [] as CachedPath[] };
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
      const position = batch.line.geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      const colors = batch.line.geometry.getAttribute(
        "color",
      ) as THREE.BufferAttribute;
      const distances = batch.line.geometry.getAttribute(
        "lineDistance",
      ) as THREE.BufferAttribute;
      let vertex = 0,
        arrow = 0;
      batch.paths.forEach((path, index) => {
        path.animated = snapshot.routes[index].animated;
        path.color.set(
          path.animated
            ? airflowSettings.colors[batch.kind]
            : airflowSettings.colors.unknown,
        );
        let length = 0;
        for (let i = 0; i < airflowSettings.samples; i++) {
          const a = path.points[i],
            b = path.points[i + 1];
          position.setXYZ(vertex, ...a);
          position.setXYZ(vertex + 1, ...b);
          colors.setXYZ(vertex, path.color.r, path.color.g, path.color.b);
          colors.setXYZ(vertex + 1, path.color.r, path.color.g, path.color.b);
          distances.setX(vertex, length);
          length += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
          distances.setX(vertex + 1, length);
          vertex += 2;
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
      for (const attr of [position, colors, distances]) attr.needsUpdate = true;
      batch.line.geometry.setDrawRange(0, vertex);
      batch.line.geometry.computeBoundingSphere();
      batch.arrows.count = arrow;
      batch.arrows.instanceMatrix.needsUpdate = true;
      if (batch.arrows.instanceColor)
        batch.arrows.instanceColor.needsUpdate = true;
      batch.line.material.opacity =
        batch.kind === "supply"
          ? 0.4 + (0.3 * snapshot.coolingCapacity) / 100
          : batch.kind === "return"
            ? 0.5
            : 0.6;
    }
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
    for (const batch of this.batches) {
      batch.line.geometry.dispose();
      batch.line.material.dispose();
      for (const mesh of [batch.arrows, batch.sparks]) {
        mesh.material.dispose();
        mesh.dispose();
      }
    }
    this.root.clear();
    this.root.removeFromParent();
  }
}
