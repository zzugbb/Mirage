import * as THREE from "three";
import { localMeshBounds } from "./local-mesh-bounds.ts";
import type { LayerPose } from "./assembly-layer.ts";

// 只在单槽核查时挂入当前内存条；槽体在内存组中的位置固定。
// 使用模型本地坐标量取外廓，避免工位旋转或放大后将世界包围盒当作槽宽。
export class DimmSocket {
  readonly root = new THREE.Group();
  private readonly shape = new THREE.BoxGeometry(1, 1, 1);
  private readonly housing = new THREE.MeshStandardMaterial({
    color: "#414c53",
    roughness: 0.63,
  });
  private readonly insulator = new THREE.MeshStandardMaterial({
    color: "#222c31",
    roughness: 0.7,
  });
  private readonly handle = new THREE.MeshStandardMaterial({
    color: "#c2c7bd",
    roughness: 0.47,
  });
  private readonly contact = new THREE.MeshStandardMaterial({
    color: "#a58e59",
    metalness: 0.42,
    roughness: 0.5,
  });
  private clips: THREE.Group[] = [];
  private target?: THREE.Object3D;
  private restY = 0;
  private socketY = 0;
  lift = 0;

  private block(
    parent: THREE.Object3D,
    size: number[],
    point: number[],
    material: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(this.shape, material);
    mesh.scale.fromArray(size);
    mesh.position.fromArray(point);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private mount(target: THREE.Object3D) {
    const bounds = localMeshBounds(target);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const gap = size.x + 0.0006;
    const depth = size.z;
    const wall = 0.0012;
    const width = gap + 2 * wall;
    const shoulder = 0.0024;
    this.lift = size.y * 1.18;
    this.target = target;
    this.restY = target.position.y;
    this.socketY = bounds.min.y;
    this.root.position.set(center.x, this.socketY, center.z);
    this.root.name = "dimm-socket";
    target.add(this.root);
    // 内存条底沿落在槽底接触带上，两侧槽壁高于底沿。
    this.block(
      this.root,
      [width, 0.002, depth + 0.005],
      [0, -0.0013, 0],
      this.insulator,
    );
    this.block(
      this.root,
      [gap, 0.0003, depth],
      [0, -0.00015, 0],
      this.contact,
    ).name = "socket-contact";
    for (const side of [-1, 1]) {
      this.block(
        this.root,
        [wall, 0.006, depth + 0.003],
        [(side * (gap + wall)) / 2, 0.0007, 0],
        this.housing,
      );
      const hingeZ = side * (depth / 2 + shoulder);
      const pivot = new THREE.Group();
      pivot.name = side < 0 ? "socket-rear-clip" : "socket-front-clip";
      this.root.add(pivot);
      pivot.position.set(0, 0, hingeZ);
      this.clips.push(pivot);
      this.block(
        this.root,
        [width + 0.001, 0.003, 0.003],
        [0, 0, hingeZ],
        this.housing,
      );
      this.block(
        pivot,
        [width * 0.78, 0.009, 0.0024],
        [0, 0.0045, 0],
        this.handle,
      );
      this.block(
        pivot,
        [width, 0.0024, 0.004],
        [0, 0.009, side * 0.0005],
        this.handle,
      );
    }
  }

  update(target?: THREE.Object3D, pose?: LayerPose) {
    if (!pose) target = undefined;
    if (target !== this.target) {
      if (this.target) {
        this.target.position.y = this.restY;
        this.root.removeFromParent();
        this.root.clear();
        this.clips = [];
        this.target = undefined;
      }
      if (target) this.mount(target);
    }
    if (!target) return;
    const raised = pose === "separated";
    const offset = raised ? this.lift : 0;
    target.position.y = this.restY + offset;
    this.root.position.y = this.socketY - offset;
    this.clips.forEach((clip, i) => {
      clip.rotation.x = raised ? (i ? 1 : -1) * 0.68 : 0;
    });
  }

  dispose() {
    this.update();
    this.shape.dispose();
    for (const material of [
      this.housing,
      this.insulator,
      this.handle,
      this.contact,
    ])
      material.dispose();
  }
}
