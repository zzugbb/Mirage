import * as THREE from "three";
import { modelById } from "../catalog.ts";
import { compactDriveBays } from "../compact-drive-bays.ts";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";
import type { Box } from "./equipment-model.ts";

const model = modelById("server-1u"),
  layout = model.compactHarness!;

// 开口朝 +Z，左右承片露出插舌接合处。保留原插座的外廓和安装中心。
export function compactCableSocket(
  root: THREE.Group,
  size: number[],
  position: number[],
  box: Box,
) {
  const [w, h, d] = size,
    wall = 0.0012;
  const socket = new THREE.Group();
  socket.position.fromArray(position);
  root.add(socket);
  box(socket, [w, h, wall], [0, 0, (-d + wall) / 2], "#47545a");
  box(socket, [w, wall, d - wall], [0, (-h + wall) / 2, wall / 2], "#586770");
  for (const side of [-1, 1]) {
    box(
      socket,
      [wall, h - wall, d - wall],
      [(side * (w - wall)) / 2, wall / 2, wall / 2],
      "#586770",
    );
    box(
      socket,
      [0.003, 0.0006, d - 0.002],
      [side * 0.003, 0.0015, -0.0002],
      "#ad9369",
    ).name = "sas-finger";
  }
  return socket;
}

// 插座按当前表示的盘尾定位。每列共用一块竖支板，上下两支水平承托分别落到同号盘尾。
export function buildCompactStoragePath(
  groups: Map<string, THREE.Group>,
  box: Box,
) {
  const board = groups.get(layout.backplane)!;
  const cable = groups.get(layout.harness)!;
  const card = groups.get(model.controllerMount!.controllerId)!;
  const {
    diskTravel,
    cableTravel,
    focusDirection: [x, y, z],
  } = layout.contactInspection;
  const contact = (
    id: string,
    movableOwner: THREE.Group,
    fixedOwner: THREE.Group,
    plug: THREE.Object3D,
    socket: THREE.Object3D,
    travel: number,
  ) => {
    registerLayer(plug, {
      node: plug.name,
      offset: [0, 0, travel],
      direction: [x, y, z],
    });
    const scope = { layerRoot: plug, moving: plug, members: [plug, socket] };
    registerLayerScope(movableOwner, id, { ...scope, selectedBranch: plug });
    registerLayerScope(fixedOwner, id, { ...scope, selectedBranch: socket });
  };
  const rearOfShelf = layout.boardCenter[2] + layout.boardSize[2] * 0.32;
  const boardTop = layout.boardCenter[1] + layout.boardSize[1] / 2;
  const supports = new Map<number, { x: number; top: number; width: number }>();
  for (const bay of compactDriveBays) {
    const disk = groups.get(bay.disk.id)!;
    disk.updateWorldMatrix(true, true);
    const plug = disk.getObjectByName("ssd-tail-connector")!;
    const blade = new THREE.Box3().setFromObject(
      disk.getObjectByName("ssd-tail-port")!,
    );
    const pos = blade.getCenter(new THREE.Vector3());
    const shelfWidth = blade.max.x - blade.min.x + 0.003;
    const socket = new THREE.Group();
    socket.name = "disk-receiver-" + bay.number;
    pos.z = blade.min.z;
    socket.position.copy(board.worldToLocal(pos.clone()));
    board.add(socket);
    const wall = 0.0008,
      depth = 0.004;
    const mouth = 0.0009,
      back = mouth - depth;
    const bladeBottom = blade.min.y - pos.y;
    box(
      socket,
      [shelfWidth, wall, depth],
      [0, bladeBottom - wall / 2, mouth - depth / 2],
      "#626f74",
    ).name = "disk-socket-bed";
    box(
      socket,
      [shelfWidth, 0.0032, wall],
      [0, bladeBottom + 0.0016, back + wall / 2],
      "#424e55",
    );
    for (const side of [-1, 1]) {
      box(
        socket,
        [wall, 0.0032, depth - wall],
        [
          (side * (shelfWidth - wall)) / 2,
          bladeBottom + 0.0016,
          (mouth + back + wall) / 2,
        ],
        "#626f74",
      );
    }
    // 每片承片的宽度和轴线沿用盘尾已有接触片，不派生针脚编号。
    for (const pad of plug.getObjectsByProperty("name", "ssd-tail-pad")) {
      const b = new THREE.Box3().setFromObject(pad);
      const center = b.getCenter(new THREE.Vector3());
      box(
        socket,
        [0.001, 0.0004, mouth - back - wall],
        [center.x - pos.x, b.max.y - pos.y + 0.0002, (mouth + back + wall) / 2],
        "#ae965f",
      ).name = "disk-socket-finger";
    }
    const length = pos.z + back - rearOfShelf;
    const shelfY = blade.min.y;
    const origin = board.worldToLocal(
      new THREE.Vector3(pos.x, shelfY - wall / 2, rearOfShelf + length / 2),
    );
    box(board, [shelfWidth, wall, length], origin.toArray(), "#40644f").name =
      "disk-socket-shelf";
    if ((supports.get(bay.x)?.top ?? -Infinity) < shelfY)
      supports.set(bay.x, { x: pos.x, top: shelfY, width: shelfWidth });
    contact(bay.disk.id, disk, board, plug, socket, diskTravel);
  }
  for (const support of supports.values()) {
    const height = support.top - boardTop;
    const center = board.worldToLocal(
      new THREE.Vector3(support.x, boardTop + height / 2, rearOfShelf - 0.0008),
    );
    box(
      board,
      [support.width, height, 0.0016],
      center.toArray(),
      "#466855",
    ).name = "disk-socket-support";
  }
  for (const [id, owner] of [
    ["backplane-plug", board],
    ["controller-plug", card],
  ] as const)
    contact(
      id,
      cable,
      owner,
      cable.getObjectByName(id + "-assembly")!,
      owner.getObjectByName("harness-socket")!,
      cableTravel,
    );
}
