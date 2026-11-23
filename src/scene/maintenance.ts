import type { FrontServiceInspection } from "../front-service.ts";
import { createAnnotationGroup } from "./annotations.ts";
import type { GrilleDoorSweep } from "../grille-door-sweep.ts";
import {
  doorSector,
  type DoorReference,
  type DoorSweep,
} from "../door-sweep.ts";
import * as THREE from "three";
import { maintenanceSettings } from "../maintenance.ts";
import type {
  MaintenanceArea,
  MaintenanceAisle,
  MaintenanceGrille,
} from "../maintenance.ts";

/** 两个中性地面范围，保留深度测试，不参与对象拾取或运行告警。 */
export class MaintenanceGeometry {
  root = createAnnotationGroup("maintenance");
  enabled = false;
  geometry = new THREE.BoxGeometry(1, 1, 1);
  border = new THREE.InstancedMesh(
    this.geometry,
    new THREE.MeshBasicMaterial({
      color: maintenanceSettings.color,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      toneMapped: false,
    }),
    8,
  );
  fill = new THREE.InstancedMesh(
    this.geometry,
    new THREE.MeshBasicMaterial({
      color: maintenanceSettings.color,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      toneMapped: false,
    }),
    2,
  );
  ruler = new THREE.InstancedMesh(
    this.geometry,
    new THREE.MeshBasicMaterial({
      color: "#b7dedb",
      depthWrite: false,
      toneMapped: false,
    }),
    3,
  );
  overlap = new THREE.Mesh(
    this.geometry,
    new THREE.MeshBasicMaterial({
      color: "#ffcd80",
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  sweepFill = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({
      color: "#9bd9da",
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  sweepLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color: "#fae5b9",
      toneMapped: false,
      depthWrite: false,
    }),
  );
  grillePatch = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({
      color: "#ffbd60",
      opacity: 0.8,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  frontRuler = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color: "#ffd38b",
      toneMapped: false,
      depthWrite: false,
    }),
  );
  transform = new THREE.Object3D();
  constructor() {
    this.frontRuler.name = "front-service-projection";
    this.frontRuler.visible = false;
    this.frontRuler.raycast = () => {};
    this.root.visible = false;
    this.root.add(
      this.border,
      this.fill,
      this.ruler,
      this.overlap,
      this.sweepFill,
      this.sweepLines,
      this.grillePatch,
      this.frontRuler,
    );
    this.grillePatch.name = "grille-swept-area";
    this.grillePatch.raycast = () => {};
    this.grillePatch.visible =
      this.sweepFill.visible =
      this.sweepLines.visible =
        false;
    this.sweepFill.raycast = this.sweepLines.raycast = () => {};
    this.overlap.visible = false;
    this.overlap.raycast = () => {};
    for (const mesh of [this.border, this.fill, this.ruler]) {
      mesh.count = 0;
      mesh.raycast = () => {};
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
  }
  update(
    areas: MaintenanceArea[],
    aisle?: MaintenanceAisle,
    overlap?: MaintenanceGrille,
  ) {
    this.enabled = areas.length > 0;
    this.root.visible = this.enabled;
    this.overlap.visible = !!overlap && !!aisle;
    if (overlap && aisle) {
      this.overlap.scale.set(overlap.overlapWidth, 0.002, overlap.overlapDepth);
      this.overlap.position.set(
        (overlap.minX + overlap.maxX) / 2,
        aisle.front.position[1] + 0.006,
        (overlap.minZ + overlap.maxZ) / 2,
      );
    }
    let index = 0;
    for (const [i, area] of areas.entries()) {
      const [x, y, z] = area.position;
      this.transform.position.set(x, y, z);
      this.transform.scale.set(area.width, 0.002, area.depth);
      this.transform.updateMatrix();
      this.fill.setMatrixAt(i, this.transform.matrix);
      for (const [dx, dz, width, depth] of [
        [0, -area.depth / 2, area.width, 0.03],
        [0, area.depth / 2, area.width, 0.03],
        [-area.width / 2, 0, 0.03, area.depth],
        [area.width / 2, 0, 0.03, area.depth],
      ]) {
        this.transform.position.set(x + dx, y + 0.002, z + dz);
        this.transform.scale.set(width, 0.003, depth);
        this.transform.updateMatrix();
        this.border.setMatrixAt(index++, this.transform.matrix);
      }
    }
    this.ruler.count = 0;
    if (aisle) {
      const bar = (z: number, width: number, depth: number) => {
        this.transform.position.set(
          aisle.x,
          aisle.front.position[1] + 0.008,
          z,
        );
        this.transform.scale.set(width, 0.004, depth);
        this.transform.updateMatrix();
        this.ruler.setMatrixAt(this.ruler.count++, this.transform.matrix);
      };
      bar(aisle.startZ, 0.24, 0.025);
      if (Math.abs(aisle.gap) > 1e-8) {
        bar((aisle.startZ + aisle.endZ) / 2, 0.025, Math.abs(aisle.gap));
        bar(aisle.endZ, 0.24, 0.025);
      }
    }
    this.ruler.instanceMatrix.needsUpdate = true;
    this.fill.count = areas.length;
    this.border.count = index;
    this.fill.instanceMatrix.needsUpdate =
      this.border.instanceMatrix.needsUpdate = true;
  }
  showFrontService(inspection: FrontServiceInspection | null) {
    this.frontRuler.visible = !!inspection;
    if (!inspection) return;
    const { area, height, frontZ } = inspection;
    const [x, floor] = area.position,
      y = floor + 0.012;
    const side = area.bounds.maxX,
      end = area.bounds.maxZ;
    const point = (x: number, y: number, z: number) =>
      new THREE.Vector3(x, y, z);
    const shoulder = point(side, height, frontZ),
      foot = point(side, y, frontZ);
    this.frontRuler.geometry.setFromPoints([
      point(x, height, frontZ),
      shoulder,
      shoulder,
      foot,
      foot,
      point(side, y, end),
      point(side - 0.06, y, frontZ),
      point(side + 0.06, y, frontZ),
      point(side - 0.06, y, end),
      point(side + 0.06, y, end),
    ]);
    this.frontRuler.geometry.computeBoundingSphere();
  }
  showDoorSweeps(
    sweeps: DoorSweep[] | undefined,
    reference: DoorReference,
    grille?: GrilleDoorSweep | null,
  ) {
    this.sweepFill.visible = this.sweepLines.visible = !!sweeps || !!grille;
    this.grillePatch.visible = !!grille?.patch.length;
    if (!sweeps && !grille) return;
    const fill: number[] = [],
      lines: number[] = [],
      patch: number[] = [];
    const outline = (points: GrilleDoorSweep["sector"], y: number) => {
      for (const [i, a] of points.entries()) {
        const b = points[(i + 1) % points.length];
        lines.push(a.x, y, a.z, b.x, y, b.z);
      }
    };
    const face = (
      points: GrilleDoorSweep["sector"],
      y: number,
      target: number[],
    ) => {
      for (let i = 1; i + 1 < points.length; i++) {
        for (const p of [points[0], points[i], points[i + 1]])
          target.push(p.x, y, p.z);
      }
    };
    if (grille) {
      face(grille.sector, grille.y, fill);
      outline(grille.sector, grille.y + 0.001);
      outline(grille.frame, grille.y + 0.002);
      face(grille.patch, grille.y + 0.003, patch);
    } else {
      for (const sweep of sweeps ?? []) {
        const y = sweep.area.position[1] + 0.012;
        for (const leaf of sweep.leaves) {
          const sector = doorSector(leaf, sweep[reference].angle, 4);
          face(sector, y, fill);
          outline(sector, y);
        }
      }
    }
    for (const [mesh, coordinates] of [
      [this.sweepFill, fill],
      [this.sweepLines, lines],
      [this.grillePatch, patch],
    ] as const) {
      mesh.geometry.dispose();
      mesh.geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(coordinates, 3),
      );
      mesh.geometry.computeBoundingSphere();
    }
  }
  setReady(ready: boolean) {
    this.root.visible = this.enabled && ready;
  }
  dispose() {
    this.overlap.material.dispose();
    for (const mesh of [
      this.sweepFill,
      this.sweepLines,
      this.grillePatch,
      this.frontRuler,
    ]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.geometry.dispose();
    for (const mesh of [this.border, this.fill, this.ruler]) {
      mesh.material.dispose();
      mesh.dispose();
    }
    this.root.clear();
    this.root.removeFromParent();
  }
}
