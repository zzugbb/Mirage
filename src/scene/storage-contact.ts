import * as THREE from "three";
import { storageSlots } from "../storage-slots.ts";
import { storageAssembly } from "../storage-layout.ts";
import type { LayerPose } from "./assembly-layer.ts";
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
    plug = disk?.getObjectByName("storage-drive-plug"),
    contact = plug?.getObjectByName("storage-drive-contact"),
    socket = board?.getObjectByName(
      `storage-socket-${String(slot.index + 1).padStart(2, "0")}`,
    );
  return disk && board && plug && contact && socket
    ? { disk, board, plug, contact, socket }
    : null;
}

// 取景使用插合和分离两端的包围盒，切换姿态时保留镜头。
export function connectorBounds(
  bounds: THREE.Box3,
  pair: NonNullable<ReturnType<typeof storageContactObjects>>,
) {
  const plug = new THREE.Box3().setFromObject(pair.plug);
  const origin = pair.plug.getWorldPosition(new THREE.Vector3());
  bounds.setFromObject(pair.socket);
  for (const z of [0, storageAssembly.contactInspection.travel]) {
    const end = pair.socket.localToWorld(new THREE.Vector3(0, 0, z));
    bounds.union(plug.clone().translate(end.sub(origin)));
  }
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
  private closeUp: ReturnType<typeof storageContactObjects> = null;
  memberFor(id: string) {
    if (id === this.closeUp?.disk.userData.entityId) return this.closeUp?.plug;
    if (id === this.closeUp?.board.userData.entityId)
      return this.closeUp?.socket;
  }
  private rest = new THREE.Vector3();
  private point = new THREE.Vector3();
  // 只在接点近看中移动盘尾分支。换槽、返回总览或加载新模型时恢复各自零位。
  poseConnector(
    pair: ReturnType<typeof storageContactObjects>,
    pose?: LayerPose,
  ) {
    const plug = pose ? pair?.plug : undefined;
    if (this.closeUp?.plug !== plug) {
      if (this.closeUp) this.closeUp.plug.position.copy(this.rest);
      this.closeUp = pose ? pair : null;
      if (plug) this.rest.copy(plug.position);
    }
    if (!pair || !plug?.parent) return;
    this.point.set(
      0,
      0,
      pose === "separated" ? storageAssembly.contactInspection.travel : 0,
    );
    pair.socket.localToWorld(this.point);
    plug.position.copy(plug.parent.worldToLocal(this.point));
    plug.updateWorldMatrix(true, true);
  }
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
