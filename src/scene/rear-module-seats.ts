import * as THREE from "three";
import { rearLayoutFor } from "../assembly-pairs.ts";
import { localMeshBounds } from "./local-mesh-bounds.ts";

import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };

const seat = definition.rearModuleSeats;
export type RearRowPose = "seated" | "withdrawn";

// 每个槽的支承边沿取自同一装配坐标下的模块外廓。抽出距离仅用于观察。
export class RearModuleSeats {
  readonly guides = new THREE.Group();
  private readonly metal = new THREE.MeshStandardMaterial({
    color: seat.metalColor,
    metalness: 0.5,
    roughness: 0.55,
  });
  private readonly cube = new THREE.BoxGeometry();
  private readonly travel = new Map<string, number>();
  private readonly envelope = new THREE.Box3();
  private moved?: { module: THREE.Group; z: number };

  constructor() {
    this.guides.name = "rear-module-seats";
  }

  private rail(
    parent: THREE.Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) {
    const mesh = new THREE.Mesh(this.cube, this.metal);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.raycast = () => {};
    parent.add(mesh);
  }

  private build(
    fans: THREE.Group,
    parts: Map<string, THREE.Group>,
    layout: NonNullable<ReturnType<typeof rearLayoutFor>>,
  ) {
    this.envelope.makeEmpty();
    for (const part of layout.members) {
      const module = parts.get(part.id)!;
      const bounds = localMeshBounds(module, fans);
      // 控制器由托盘承载，后面板下沿低于托盘底面。
      const tray = module.getObjectByName("controller-tray");
      const support = tray ? localMeshBounds(tray, fans) : bounds;
      const panel = module.getObjectByName("controller-rear-panel");
      if (panel)
        support.min.z = localMeshBounds(panel, fans).max.z + seat.stopClearance;
      const size = support.getSize(new THREE.Vector3());
      const center = support.getCenter(new THREE.Vector3());
      const slot = new THREE.Group();
      slot.name = part.slot;
      slot.position.set(center.x, support.min.y, center.z);
      this.guides.add(slot);
      // 两条托边在底面接触，内侧限位留出净空，向机后开口。
      const edge = size.x / 2 + seat.sideClearance + seat.wallThickness;
      for (const sign of [-1, 1]) {
        this.rail(
          slot,
          seat.ledgeWidth,
          seat.ledgeThickness,
          size.z,
          sign * (edge - seat.ledgeWidth / 2),
          -seat.ledgeThickness / 2,
          0,
        );
        this.rail(
          slot,
          seat.wallThickness,
          seat.wallHeight,
          size.z,
          sign * (edge - seat.wallThickness / 2),
          seat.wallHeight / 2 - seat.ledgeThickness,
          0,
        );
      }
      this.rail(
        slot,
        edge * 2,
        seat.wallHeight,
        seat.wallThickness,
        0,
        seat.wallHeight / 2 - seat.ledgeThickness,
        size.z / 2 + seat.stopClearance + seat.wallThickness / 2,
      );
      const travel = (bounds.max.z - bounds.min.z) * seat.travelRatio;
      this.travel.set(part.id, travel);
      bounds.min.z -= travel;
      this.envelope.union(bounds);
    }
    fans.add(this.guides);
    this.envelope.union(localMeshBounds(this.guides, fans));
  }

  // 每帧先撤销上一帧的局部位移，再由整机的绝对姿态更新接管。
  restoreModule() {
    if (this.moved) this.moved.module.position.z = this.moved.z;
    this.moved = undefined;
  }

  clear() {
    this.restoreModule();
    if (!this.guides.parent) return;
    this.guides.removeFromParent();
    this.guides.clear();
    this.travel.clear();
  }

  update(
    parts: Map<string, THREE.Group>,
    bases: Map<string, THREE.Vector3>,
    selected: string,
    modelId: string,
    pose?: RearRowPose,
  ) {
    const layout = pose && rearLayoutFor(modelId);
    const fans = layout && parts.get(layout.fanGroup.id);
    if (!layout || !fans) {
      this.clear();
      return;
    }
    if (this.guides.parent && this.guides.parent !== fans) this.clear();
    // 同屏核对时，所有模块以装配位置为基准。
    for (const part of [
      layout.fanGroup,
      ...layout.supplies,
      ...layout.controllers,
    ])
      parts.get(part.id)!.position.copy(bases.get(part.id)!);
    if (!this.guides.parent) this.build(fans, parts, layout);
    const module = parts.get(selected);
    const travel = this.travel.get(selected);
    if (pose === "withdrawn" && module && travel !== undefined) {
      this.moved = { module, z: module.position.z };
      module.position.z -= travel;
    }
  }

  includeFrame(bounds: THREE.Box3) {
    if (!this.guides.parent) return;
    this.guides.updateWorldMatrix(true, false);
    bounds.union(this.envelope.clone().applyMatrix4(this.guides.matrixWorld));
  }

  dispose() {
    this.clear();
    this.cube.dispose();
    this.metal.dispose();
  }
}
