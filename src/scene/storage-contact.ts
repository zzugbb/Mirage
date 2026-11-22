import * as THREE from "three";
import { storageSlots } from "../storage-slots.ts";
import { createAnnotationGroup } from "./annotations.ts";

/** 复用建模节点，取实际接触表面；不从编号猜测电气连接。 */
export function storageContactObjects(
  deviceId: string,
  diskId: string | null,
  parts: Map<string, THREE.Group>,
) {
  const slot = storageSlots(deviceId).find((slot) => slot.id === diskId);
  if (!slot) return null;
  const disk = parts.get(slot.id),
    board = parts.get("sto-midplane"),
    contact = disk?.getObjectByName("storage-drive-contact"),
    socket = board?.getObjectByName(
      `storage-socket-${String(slot.index + 1).padStart(2, "0")}`,
    );
  return disk && board && contact && socket
    ? { disk, board, contact, socket }
    : null;
}

export class StorageContactGuide {
  root = createAnnotationGroup("storage-contact");
  private contactBox = new THREE.Box3();
  private socketBox = new THREE.Box3();
  private ends = [
    new THREE.Box3Helper(this.contactBox, "#cae6e7"),
    new THREE.Box3Helper(this.socketBox, "#cae6e7"),
  ];
  private positions = new Float32Array(6);
  private line = new THREE.Line(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3),
    ),
    new THREE.LineDashedMaterial({
      color: "#a9cecf",
      dashSize: 0.008,
      gapSize: 0.006,
      depthWrite: false,
    }),
  );
  constructor() {
    this.root.add(...this.ends, this.line);
    this.line.frustumCulled = false;
    this.root.visible = false;
  }
  update(pair: ReturnType<typeof storageContactObjects>, boardOnly = false) {
    this.root.visible = !!pair;
    if (!pair) return;
    // 机构在本帧刚更新；不能依赖渲染器上一帧留下的父级世界矩阵。
    pair.board.updateWorldMatrix(true, true);
    this.socketBox.setFromObject(pair.socket).expandByScalar(0.0008);
    this.ends[0].visible = this.line.visible = !boardOnly;
    if (boardOnly) return;
    pair.disk.updateWorldMatrix(true, true);
    this.contactBox.setFromObject(pair.contact).expandByScalar(0.0008);
    const a = this.contactBox.getCenter(new THREE.Vector3()),
      b = this.socketBox.getCenter(new THREE.Vector3());
    a.z = this.contactBox.min.z;
    b.z = this.socketBox.max.z;
    this.positions.set(a.toArray(), 0);
    this.positions.set(b.toArray(), 3);
    this.line.geometry.attributes.position.needsUpdate = true;
    this.line.computeLineDistances();
  }
}
