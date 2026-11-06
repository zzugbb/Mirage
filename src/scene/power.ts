import { createAnnotationGroup } from "./annotations.ts";
import * as THREE from "three";
import { powerSettings } from "../power-config.ts";
import type { PowerScene } from "../power-paths.ts";

/** 静态配线：B 路分段，保留真实深度；没有电流或支路计量就不演示电能流动。 */
export class PowerGeometry {
  root = createAnnotationGroup("power");
  cylinder = new THREE.CylinderGeometry(1, 1, 1, 6);
  sphere = new THREE.SphereGeometry(0.045, 10, 8);
  bands = new THREE.InstancedMesh(
    this.cylinder,
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      toneMapped: false,
    }),
    1024,
  );
  dots = new THREE.InstancedMesh(
    this.sphere,
    new THREE.MeshBasicMaterial({ toneMapped: false, depthWrite: false }),
    6,
  );
  transform = new THREE.Object3D();
  up = new THREE.Vector3(0, 1, 0);
  start = new THREE.Vector3();
  end = new THREE.Vector3();
  direction = new THREE.Vector3();
  bounds = new THREE.Box3();
  color = new THREE.Color();
  snapshot: PowerScene | null = null;
  outlet = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.034, 0.048, 0.003)),
    new THREE.LineBasicMaterial({ color: "#d4e9e5", toneMapped: false }),
  );
  constructor() {
    this.root.add(this.bands, this.dots, this.outlet);
    this.outlet.raycast = () => {};
    this.outlet.visible = false;
    for (const mesh of [this.bands, this.dots]) {
      mesh.count = 0;
      mesh.raycast = () => {};
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
    this.root.visible = false;
  }
  update(snapshot: PowerScene | null) {
    this.snapshot = snapshot;
    this.root.visible = !!snapshot;
    this.outlet.visible = false;
    let band = 0,
      dot = 0;
    for (const path of snapshot?.paths ?? []) {
      this.color.set(powerSettings.routing.colors[path.feed]);
      for (let i = 1; i < path.points.length; i++) {
        this.start.fromArray(path.points[i - 1]);
        this.end.fromArray(path.points[i]);
        const distance = this.start.distanceTo(this.end);
        const steps =
          path.feed === "B" ? Math.max(1, Math.ceil(distance / 0.12)) : 1;
        for (let j = 0; j < steps; j++) {
          if (path.feed === "B" && j % 3 === 2) continue;
          this.direction.subVectors(this.end, this.start);
          this.transform.position
            .copy(this.start)
            .addScaledVector(this.direction, (j + 0.5) / steps);
          const radius = snapshot?.traceId ? 0.008 : 0.014;
          this.transform.scale.set(radius, distance / steps, radius);
          if (distance > 1e-8)
            this.transform.quaternion.setFromUnitVectors(
              this.up,
              this.direction.normalize(),
            );
          this.transform.updateMatrix();
          this.bands.setMatrixAt(band, this.transform.matrix);
          this.bands.setColorAt(band++, this.color);
        }
      }
    }
    for (const label of snapshot?.labels ?? []) {
      if (!label.point) continue;
      if (label.kind === "outlet") {
        this.outlet.position.fromArray(label.point);
        this.outlet.position.z -= 0.002;
        this.outlet.visible = true;
        continue;
      }
      this.transform.position.fromArray(label.point);
      this.transform.scale.setScalar(this.snapshot?.traceId ? 0.6 : 1);
      this.transform.quaternion.identity();
      this.transform.updateMatrix();
      this.dots.setMatrixAt(dot, this.transform.matrix);
      this.dots.setColorAt(dot++, this.color.set("#b8cad2"));
    }
    this.bands.count = band;
    this.dots.count = dot;
    this.bands.instanceMatrix.needsUpdate =
      this.dots.instanceMatrix.needsUpdate = true;
    if (this.bands.instanceColor) this.bands.instanceColor.needsUpdate = true;
    if (this.dots.instanceColor) this.dots.instanceColor.needsUpdate = true;
  }
  frame(ready: boolean, parts: Map<string, THREE.Group>) {
    this.root.visible = !!this.snapshot && ready;
    if (!this.snapshot?.labels.some((label) => label.partId)) return;
    let index = 0;
    for (const label of this.snapshot.labels) {
      const part = label.partId ? parts.get(label.partId) : undefined;
      if (!part) continue;
      this.bounds.setFromObject(part).getCenter(this.transform.position);
      this.transform.scale.setScalar(this.snapshot?.traceId ? 0.6 : 1);
      this.transform.quaternion.identity();
      this.transform.updateMatrix();
      this.dots.setMatrixAt(index, this.transform.matrix);
      this.dots.setColorAt(index++, this.color.set("#b8cad2"));
    }
    this.dots.count = index;
    this.dots.instanceMatrix.needsUpdate = true;
    if (this.dots.instanceColor) this.dots.instanceColor.needsUpdate = true;
  }
  dispose() {
    this.outlet.geometry.dispose();
    this.outlet.material.dispose();
    this.cylinder.dispose();
    this.sphere.dispose();
    for (const mesh of [this.bands, this.dots]) {
      mesh.material.dispose();
      mesh.dispose();
    }
    this.root.clear();
    this.root.removeFromParent();
  }
}
