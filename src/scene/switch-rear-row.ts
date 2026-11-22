import * as THREE from "three";
import { switchRear } from "../assembly-pairs.ts";
import { localMeshBounds } from "./local-mesh-bounds.ts";

import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };

const seat = definition.switchAssembly.rearSeats;
export type RearRowPose = "seated" | "withdrawn";

// 每个槽的支承边沿取自同一装配坐标下的模块外廓。抽出距离仅用于观察。
export class SwitchRearRow {
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
    this.guides.name = "switch-rear-seats";
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

  private build(fans: THREE.Group, parts: Map<string, THREE.Group>) {
    this.envelope.makeEmpty();
    for (const part of switchRear.members) {
      const bounds = localMeshBounds(parts.get(part.id)!, fans);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const slot = new THREE.Group();
      slot.name = part.slot;
      slot.position.set(center.x, bounds.min.y, center.z);
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
      const travel = size.z * seat.travelRatio;
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
    pose?: RearRowPose,
  ) {
    const fans = parts.get(switchRear.fanGroup.id);
    if (!pose || !fans) {
      this.clear();
      return;
    }
    if (this.guides.parent && this.guides.parent !== fans) this.clear();
    // 核对装配槽位时，风扇排和两个电源共用就位姿态。
    for (const part of [switchRear.fanGroup, ...switchRear.supplies])
      parts.get(part.id)!.position.copy(bases.get(part.id)!);
    if (!this.guides.parent) this.build(fans, parts);
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
