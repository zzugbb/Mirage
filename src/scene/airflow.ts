import { createAnnotationGroup } from "./annotations.ts";
import { floorGrilleSettings as grille } from "../floor-grilles.ts";
import * as THREE from "three";
import { airflowSettings, flowPoint } from "../airflow.ts";
import type { AirflowSnapshot, FlowKind, FlowPoint } from "../airflow.ts";
import { airflowStageEmphasis, showAirflowEndpoint } from "../airflow-stage.ts";
import type { AirflowView } from "../airflow-view.ts";
import { sliceRackRows } from "../temperature-slice.ts";

const kinds: FlowKind[] = ["supply", "through", "return"];
const maximumRoutes = sliceRackRows.length;
type CachedPath = {
  points: FlowPoint[];
  animated: boolean;
  index: number;
  color: THREE.Color;
};
/** 少量实例化箭头和粒子；柜面轮廓与柜外方向标保留真实遮挡，不参与拾取。 */
export class AirflowGeometry {
  root = createAnnotationGroup("airflow");
  cone = new THREE.ConeGeometry(0.065, 0.19, 8);
  sphere = new THREE.SphereGeometry(0.055, 8, 6);
  ribbon = new THREE.CylinderGeometry(1, 1, 1, 6);
  endpointGeometry = new THREE.TorusGeometry(0.1, 0.018, 6, 20);
  endpoints = new THREE.InstancedMesh(
    this.endpointGeometry,
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      toneMapped: false,
    }),
    maximumRoutes * 4,
  );
  floorFrameGeometry = new THREE.BoxGeometry(1, 1, 1);
  floorFrames = new THREE.InstancedMesh(
    this.floorFrameGeometry,
    new THREE.MeshBasicMaterial({ toneMapped: false, depthWrite: false }),
    maximumRoutes * 4,
  );
  deviceFrames = new THREE.InstancedMesh(
    this.floorFrameGeometry,
    new THREE.MeshBasicMaterial({ toneMapped: false, depthWrite: false }),
    maximumRoutes * 8,
  );
  faceArrows = new THREE.InstancedMesh(
    this.cone,
    new THREE.MeshBasicMaterial({ toneMapped: false, depthWrite: false }),
    maximumRoutes * 2,
  );
  batches = kinds.map((kind) => {
    const arrows = new THREE.InstancedMesh(
      this.cone,
      new THREE.MeshBasicMaterial({
        vertexColors: false,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        depthTest: true,
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
        depthTest: true,
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
        depthTest: true,
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
  view: AirflowView | null = null;
  constructor() {
    this.root.visible = false;
    this.endpoints.count = 0;
    this.endpoints.raycast = () => {};
    this.endpoints.frustumCulled = false;
    this.endpoints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.floorFrames.count = 0;
    this.floorFrames.raycast = () => {};
    this.floorFrames.frustumCulled = false;
    this.floorFrames.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (const mesh of [this.deviceFrames, this.faceArrows]) {
      mesh.count = 0;
      mesh.raycast = () => {};
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
    this.root.add(
      this.endpoints,
      this.floorFrames,
      this.deviceFrames,
      this.faceArrows,
    );
  }
  at(path: CachedPath, t: number, target: THREE.Vector3) {
    const scaled = Math.max(0, Math.min(1, t)) * airflowSettings.samples,
      index = Math.min(airflowSettings.samples - 1, Math.floor(scaled));
    return target
      .fromArray(path.points[index])
      .lerp(this.next.fromArray(path.points[index + 1]), scaled - index);
  }
  update(snapshot: AirflowSnapshot | null, view: AirflowView | null = null) {
    this.view = view;
    this.enabled = !!snapshot?.routes.length;
    this.root.visible = this.enabled;
    if (!snapshot) {
      this.endpoints.count = this.floorFrames.count = 0;
      this.deviceFrames.count = this.faceArrows.count = 0;
      return;
    }
    let endpointIndex = 0,
      frameIndex = 0,
      deviceFrameIndex = 0,
      faceArrowIndex = 0;
    for (const route of snapshot.routes) {
      const [x, y, z] = route.floorGrille.position;
      const color = new THREE.Color(
        route.animated
          ? airflowSettings.colors.supply
          : airflowSettings.colors.unknown,
      );
      color.multiplyScalar(airflowStageEmphasis(view, "supply"));
      this.transform.rotation.set(0, 0, 0);
      for (const side of [-1, 1]) {
        for (const horizontal of [false, true]) {
          this.transform.position.set(
            x + (horizontal ? 0 : (side * grille.width) / 2),
            y + grille.outlineLift,
            z + (horizontal ? (side * grille.depth) / 2 : 0),
          );
          this.transform.scale.set(
            horizontal
              ? grille.width + grille.outlineWidth
              : grille.outlineWidth,
            grille.outlineHeight,
            horizontal
              ? grille.outlineWidth
              : grille.depth + grille.outlineWidth,
          );
          this.transform.updateMatrix();
          this.floorFrames.setMatrixAt(frameIndex, this.transform.matrix);
          this.floorFrames.setColorAt(frameIndex++, color);
        }
      }
      const through = route.segments.find(
        (segment) => segment.kind === "through",
      )!;
      const [width, height] = route.faceSize;
      this.tangent
        .fromArray(through.points.at(-1)!)
        .sub(this.position.fromArray(through.points[0]))
        .normalize();
      // 前后柜面分别标出同一安装范围；箭头放在柜外，暂停也能辨认前进后出。
      for (const [index, point] of [
        through.points[0],
        through.points.at(-1)!,
      ].entries()) {
        const faceColor = new THREE.Color(
          route.animated
            ? airflowSettings.colors[index === 0 ? "through" : "return"]
            : airflowSettings.colors.unknown,
        );
        faceColor.multiplyScalar(
          Math.max(
            airflowStageEmphasis(view, "through"),
            airflowStageEmphasis(view, index === 0 ? "supply" : "return"),
          ),
        );
        this.transform.rotation.set(0, 0, 0);
        for (const side of [-1, 1]) {
          for (const horizontal of [false, true]) {
            this.transform.position.set(
              point[0] + (horizontal ? 0 : (side * width) / 2),
              point[1] + (horizontal ? (side * height) / 2 : 0),
              point[2],
            );
            this.transform.scale.set(
              horizontal ? width : 0.009,
              horizontal ? 0.009 : height,
              0.009,
            );
            this.transform.updateMatrix();
            this.deviceFrames.setMatrixAt(
              deviceFrameIndex,
              this.transform.matrix,
            );
            this.deviceFrames.setColorAt(deviceFrameIndex++, faceColor);
          }
        }
        this.transform.position
          .fromArray(point)
          .addScaledVector(this.tangent, index === 0 ? -0.16 : 0.16);
        this.transform.scale.setScalar(0.8);
        this.transform.quaternion.setFromUnitVectors(this.up, this.tangent);
        this.transform.updateMatrix();
        this.faceArrows.setMatrixAt(faceArrowIndex, this.transform.matrix);
        this.faceArrows.setColorAt(faceArrowIndex++, faceColor);
      }
      for (const endpoint of route.endpoints) {
        if (endpoint.kind === "floor" || endpoint.kind === "intake") continue;
        if (
          endpoint.kind === "receiver" &&
          !showAirflowEndpoint(view, endpoint.kind)
        )
          continue;
        const kind = endpoint.kind === "receiver" ? "return" : endpoint.kind;
        this.transform.position.fromArray(endpoint.point);
        this.transform.scale.setScalar(1);
        this.transform.rotation.set(0, 0, 0);
        this.transform.updateMatrix();
        this.endpoints.setMatrixAt(endpointIndex, this.transform.matrix);
        this.endpoints.setColorAt(
          endpointIndex++,
          new THREE.Color(
            route.animated
              ? airflowSettings.colors[kind]
              : airflowSettings.colors.unknown,
          ).multiplyScalar(airflowStageEmphasis(view, kind)),
        );
      }
    }
    for (const [mesh, count] of [
      [this.deviceFrames, deviceFrameIndex],
      [this.faceArrows, faceArrowIndex],
    ] as const) {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.floorFrames.count = frameIndex;
    this.floorFrames.instanceMatrix.needsUpdate = true;
    if (this.floorFrames.instanceColor)
      this.floorFrames.instanceColor.needsUpdate = true;
    this.endpoints.count = endpointIndex;
    this.endpoints.instanceMatrix.needsUpdate = true;
    if (this.endpoints.instanceColor)
      this.endpoints.instanceColor.needsUpdate = true;
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
      const emphasis = airflowStageEmphasis(view, batch.kind);
      batch.band.material.opacity =
        (batch.kind === "supply"
          ? 0.64 + snapshot.coolingCapacity * 0.003
          : batch.kind === "through"
            ? 0.9
            : 0.68) * emphasis;
      batch.arrows.material.opacity = 0.94 * emphasis;
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
        if (
          !path.animated ||
          reducedMotion ||
          airflowStageEmphasis(this.view, batch.kind) < 1
        )
          continue;
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
          this.at(path, Math.min(1, t + 0.01), this.tangent)
            .sub(this.position)
            .normalize();
          this.transform.position.copy(this.position);
          this.transform.scale.set(0.65, 1.8, 0.65);
          this.transform.quaternion.setFromUnitVectors(this.up, this.tangent);
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
    this.endpointGeometry.dispose();
    this.floorFrameGeometry.dispose();
    this.floorFrames.material.dispose();
    this.floorFrames.dispose();
    this.deviceFrames.material.dispose();
    this.deviceFrames.dispose();
    this.faceArrows.material.dispose();
    this.faceArrows.dispose();
    this.endpoints.material.dispose();
    this.endpoints.dispose();
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
