import * as THREE from "three";
import { serverSuppliesFor, rearLayoutFor } from "../assembly-pairs.ts";
import { modelById } from "../catalog.ts";
import { localMeshBounds } from "./local-mesh-bounds.ts";

import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };

const seat = definition.rearModuleSeats;
type PowerBays = ReturnType<typeof modelById>["powerBays"];
export type RearRowPose = "seated" | "withdrawn";

// 以实际壳底顶点求承托段，排除伸到机后的拉手和内端较高的接触片。
function powerSupport(
  module: THREE.Object3D,
  host: THREE.Object3D,
  bounds: THREE.Box3,
) {
  const support = bounds.clone();
  const inverse = host.matrixWorld.clone().invert();
  const point = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  support.min.z = Infinity;
  support.max.z = -Infinity;
  module.traverse((mesh) => {
    if (!(mesh instanceof THREE.Mesh)) return;
    const pos = mesh.geometry.getAttribute("position");
    matrix.multiplyMatrices(inverse, mesh.matrixWorld);
    for (let i = 0; i < pos.count; i++) {
      point.fromBufferAttribute(pos, i).applyMatrix4(matrix);
      if (point.y > bounds.min.y + 0.0002) continue;
      support.min.z = Math.min(support.min.z, point.z);
      support.max.z = Math.max(support.max.z, point.z);
    }
  });
  return support.isEmpty() ? bounds : support;
}

// 每个槽的支承边沿取自同一装配坐标下的模块外廓。抽出距离仅用于观察。
export class RearModuleSeats {
  readonly receivers: THREE.Object3D[] = [];
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
    host: THREE.Object3D,
    parts: Map<string, THREE.Group>,
    members: readonly { id: string; slot: string }[],
    powerBays: PowerBays,
  ) {
    this.envelope.makeEmpty();
    const dimensions = powerBays ?? seat;
    for (const part of members) {
      const module = parts.get(part.id)!;
      const bounds = localMeshBounds(module, host);
      const receiver = host.getObjectByName("bay-receiver-" + part.id);
      if (powerBays && receiver) {
        this.receivers.push(receiver);
        this.envelope.union(localMeshBounds(receiver, host));
      }
      // 后面板下沿可能低于承载面。柜内托边只托住壳底或控制器托盘，并避开面板。
      const base =
        module.getObjectByName("controller-tray") ??
        module.getObjectByName("psu-shell-base");
      const support = powerBays
        ? powerSupport(module, host, bounds)
        : base
          ? localMeshBounds(base, host)
          : bounds;
      if (!powerBays && base) {
        const panel =
          module.getObjectByName("controller-rear-panel") ??
          module.getObjectByName("psu-rear-panel");
        if (panel)
          support.min.z =
            localMeshBounds(panel, host).max.z + seat.stopClearance;
      }
      const size = support.getSize(new THREE.Vector3());
      const center = support.getCenter(new THREE.Vector3());
      const slot = new THREE.Group();
      slot.name = part.slot;
      slot.position.set(center.x, support.min.y, center.z);
      this.guides.add(slot);
      // 两条托边在底面接触，内侧限位留出净空，向机后开口。
      const edge =
        size.x / 2 + dimensions.sideClearance + dimensions.wallThickness;
      for (const sign of [-1, 1]) {
        this.rail(
          slot,
          dimensions.ledgeWidth,
          seat.ledgeThickness,
          size.z,
          sign * (edge - dimensions.ledgeWidth / 2),
          -seat.ledgeThickness / 2,
          0,
        );
        this.rail(
          slot,
          dimensions.wallThickness,
          dimensions.wallHeight,
          size.z,
          sign * (edge - dimensions.wallThickness / 2),
          dimensions.wallHeight / 2 - seat.ledgeThickness,
          0,
        );
      }
      // 服务器内端中央留出接触片空间，两只限位分别接在托边末端。
      const stopDepth = powerBays
        ? powerBays.stopDepth
        : dimensions.wallThickness;
      const stopZ = size.z / 2 + dimensions.stopClearance + stopDepth / 2;
      const stopWidth = powerBays ? dimensions.ledgeWidth : edge * 2;
      for (const x of powerBays
        ? [-edge + stopWidth / 2, edge - stopWidth / 2]
        : [0])
        this.rail(
          slot,
          stopWidth,
          dimensions.wallHeight,
          stopDepth,
          x,
          dimensions.wallHeight / 2 - seat.ledgeThickness,
          stopZ,
        );
      if (powerBays) {
        // 两道横撑从下方连接托边，内横撑同时承托两只限位。
        const depth = powerBays.crossbarDepth;
        for (const z of [-size.z * 0.32, stopZ + stopDepth / 2 - depth / 2])
          this.rail(
            slot,
            edge * 2,
            seat.ledgeThickness,
            depth,
            0,
            -seat.ledgeThickness * 1.5,
            z,
          );
      }
      const travel = (bounds.max.z - bounds.min.z) * dimensions.travelRatio;
      this.travel.set(part.id, travel);
      bounds.min.z -= travel;
      this.envelope.union(bounds);
    }
    host.add(this.guides);
    this.envelope.union(localMeshBounds(this.guides, host));
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
    this.receivers.length = 0;
  }

  update(
    parts: Map<string, THREE.Group>,
    bases: Map<string, THREE.Vector3>,
    selected: string,
    modelId: string,
    pose?: RearRowPose,
  ) {
    if (!pose) {
      this.clear();
      return;
    }
    const layout = rearLayoutFor(modelId);
    const powerBays = modelById(modelId).powerBays;
    const members = layout?.members ?? serverSuppliesFor(modelId);
    const host = layout
      ? parts.get(layout.fanGroup.id)
      : powerBays && parts.get(members[0].id)?.parent;
    if (!host) {
      this.clear();
      return;
    }
    if (this.guides.parent && this.guides.parent !== host) this.clear();
    // 保留整排的安装基准。独立电源用装配根节点承托，两件都可移动。
    for (const part of layout
      ? [layout.fanGroup, ...layout.supplies, ...layout.controllers]
      : members)
      parts.get(part.id)!.position.copy(bases.get(part.id)!);
    if (!this.guides.parent) this.build(host, parts, members, powerBays);
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
