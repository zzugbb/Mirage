import * as THREE from "three";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";
import { compactCablePlug, registerCompactSasEnd } from "./compact-sas-ends.ts";
import {
  compactCableSocket,
  registerStorageContact,
} from "./compact-storage-path.ts";
import { drivePairs } from "../assembly-pairs.ts";
import { modelById, partsForModel } from "../catalog.ts";
import type { Box } from "./equipment-model.ts";

const layout = modelById("server-2u").storageHarness!;
const memberIds = [layout.backplane, layout.harness, layout.controller];
export const isStorageHarnessPart = (id: string) => memberIds.includes(id);

// 在拐角两侧预留弯曲半径，避免直角折线或样条越过机箱侧边。
function roundedRoute(points: THREE.Vector3[]) {
  const path = new THREE.CurvePath<THREE.Vector3>();
  let start = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const corner = points[i];
    const toPrev = points[i - 1].clone().sub(corner);
    const toNext = points[i + 1].clone().sub(corner);
    const radius = Math.min(0.012, toPrev.length() / 2, toNext.length() / 2);
    const before = toPrev.setLength(radius).add(corner);
    const after = toNext.setLength(radius).add(corner);
    path.add(new THREE.LineCurve3(start, before));
    path.add(new THREE.QuadraticBezierCurve3(before, corner, after));
    start = after;
  }
  path.add(new THREE.LineCurve3(start, points[points.length - 1]));
  return path;
}

// 装配时各模组在同一设备坐标系。精模和简模分别从已就位的 SSD 取接触面。
export function buildStorageHarness(
  groups: Map<string, THREE.Group>,
  positions: Map<string, THREE.Vector3>,
  box: Box,
) {
  const board = groups.get(layout.backplane)!;
  const cable = groups.get(layout.harness)!;
  const card = groups.get(layout.controller)!;
  const contacts = drivePairs.map(({ companion }) => {
    const edge = groups.get(companion.id)!.getObjectByName("ssd-edge-contact")!;
    edge.updateWorldMatrix(true, false);
    const bounds = new THREE.Box3().setFromObject(edge);
    const face = bounds.getCenter(new THREE.Vector3());
    face.z = bounds.min.z;
    return face;
  });
  const [w, h, d] = layout.boardSize;
  const faceCenter = new THREE.Box3()
    .setFromPoints(contacts)
    .getCenter(new THREE.Vector3());
  board.position.copy(faceCenter);
  board.position.z -= layout.socketDepth + d / 2;
  box(board, [w, h, d], [0, 0, 0], "#285441", 0.22);
  for (const [i, face] of contacts.entries()) {
    const disk = groups.get(drivePairs[i].companion.id)!;
    const plug = disk.getObjectByName("ssd-tail-connector")!;
    const socket = new THREE.Group();
    socket.name = "disk-receiver-" + drivePairs[i].companion.slot;
    board.add(socket);
    const { x, y, z } = face.clone().sub(board.position);
    const depth = z - d / 2;
    box(
      socket,
      [0.005, 0.038, depth - 0.0004],
      [x, y, z - depth / 2 - 0.0002],
      "#242c31",
      0.22,
    );
    box(
      socket,
      [0.002, 0.028, 0.0004],
      [x, y, z - 0.0002],
      "#aa9359",
      0.48,
    ).name = drivePairs[i].companion.slot;
    for (const pad of plug.getObjectsByProperty("name", "ssd-tail-pad")) {
      const b = new THREE.Box3().setFromObject(pad);
      const c = b.getCenter(new THREE.Vector3()).sub(board.position);
      box(
        socket,
        [0.0004, 0.001, 0.0024],
        [b.max.x - board.position.x + 0.0002, c.y, z + 0.0012],
        "#b39a71",
      ).name = "disk-socket-finger";
    }
    registerStorageContact(
      drivePairs[i].companion.id,
      disk,
      board,
      plug,
      socket,
      0.021,
    );
  }
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      box(
        board,
        [0.003, 0.003, 0.001],
        [sx * (w / 2 - 0.004), sy * (h / 2 - 0.004), d / 2 + 0.0005],
        "#929e9e",
      );

  const cardPart = partsForModel("server-2u").find(
    (part) => part.id === layout.controller,
  )!;
  const [cw, , cd] = cardPart.size;
  box(card, [cw, 0.002, cd], [0, 0, 0], "#315947", 0.22);
  box(card, [cw * 0.55, 0.004, cd * 0.34], [0, 0.003, -0.011], "#737f85");
  for (let i = 0; i < 7; i++)
    box(
      card,
      [0.002, 0.006, cd * 0.34],
      [(i - 3) * 0.004, 0.008, -0.011],
      "#9da8aa",
    );
  box(card, [cw * 0.64, 0.001, 0.004], [0, 0, -cd / 2 - 0.002], "#b1965f");

  // 两个座分别属于板件，压扣与插头归线束。两端都以座的外表面定位。
  const boardSeat = compactCableSocket(
    board,
    [0.022, 0.009, 0.008],
    [-w * 0.34, 0.012, -(d + 0.008) / 2],
    box,
  );
  boardSeat.rotation.y = Math.PI;
  const cardSeat = compactCableSocket(
    card,
    [0.022, 0.009, 0.012],
    [0, 0.0055, (cd - 0.012) / 2],
    box,
  );
  connectHarness(cable, boardSeat, cardSeat, "server-2u", layout, box);
  for (const [id, owner, socket, sign] of [
    ["backplane-plug", board, boardSeat, -1],
    ["controller-plug", card, cardSeat, 1],
  ] as const) {
    const plug = cable.getObjectByName(id + "-assembly")!;
    registerStorageContact(id, cable, owner, plug, socket, sign * 0.022);
    registerCompactSasEnd(id, cable, owner, plug, socket, sign);
  }
  registerControllerSeat(groups, card, box);
  positions.set(layout.backplane, board.position.clone());
  positions.set(layout.harness, cable.position.clone());
}

// 托座按控制卡基板的四角定位，活动件沿装配法向离开固定座。
function registerControllerSeat(
  groups: Map<string, THREE.Group>,
  card: THREE.Group,
  box: Box,
) {
  const board = groups.get(modelById("server-2u").rtcMount!.boardId)!;
  const pcb = card.children[0];
  const bounds = new THREE.Box3().setFromObject(pcb, true);
  const center = bounds.getCenter(new THREE.Vector3());
  center.y = bounds.min.y;
  const seat = new THREE.Group();
  seat.name = "controller-board-seat";
  seat.position.copy(board.worldToLocal(center.clone()));
  board.add(seat);
  const size = bounds.getSize(new THREE.Vector3());
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = sx * (size.x / 2 - 0.005),
        z = sz * (size.z / 2 - 0.005);
      const point = center.clone().add(new THREE.Vector3(x, 0, z));
      const hit = new THREE.Raycaster(
        point,
        new THREE.Vector3(0, -1, 0),
      ).intersectObject(board)[0];
      const height = Math.max(0.001, hit?.distance ?? 0.004);
      box(seat, [0.006, height, 0.006], [x, -height / 2, z], "#84908a").name =
        "controller-seat-post";
    }
  const body = new THREE.Group();
  body.name = "controller-card-body";
  body.add(...card.children);
  card.add(body);
  registerLayer(body, {
    node: body.name,
    offset: [0, 0.038, 0],
    direction: [0.8, 0.72, 0.9],
  });
  for (const [owner, target] of [
    [card, body],
    [board, seat],
  ])
    registerLayerScope(owner, "card-seat", {
      layerRoot: body,
      moving: body,
      members: [body, seat],
      selectedBranch: target,
    });
}

// M1 精模保留两块原板件。简模上的插座连同线束以同一装配坐标转挂到精模。
export function buildCompactHarness(
  groups: Map<string, THREE.Group>,
  positions: Map<string, THREE.Vector3>,
  box: Box,
) {
  const model = modelById("server-1u");
  const compact = model.compactHarness!;
  const mount = model.controllerMount!;
  const board = groups.get(compact.backplane)!;
  const card = groups.get(mount.controllerId)!;
  const cable = groups.get(compact.harness)!;
  const boardSeat = compactCableSocket(
    board,
    [0.016, 0.008, 0.008],
    new THREE.Vector3()
      .fromArray(compact.boardSeat)
      .sub(board.position)
      .toArray(),
    box,
  );
  const cardSeat = compactCableSocket(
    card,
    [0.016, 0.006, 0.012],
    [0, 0.005, (mount.controllerSize[2] - 0.012) / 2],
    box,
  );
  connectHarness(cable, boardSeat, cardSeat, "server-1u", compact, box);
  positions.set(compact.harness, cable.position.clone());
}

function connectHarness(
  cable: THREE.Group,
  boardSeat: THREE.Object3D,
  cardSeat: THREE.Object3D,
  model: "server-1u" | "server-2u",
  route: {
    sideX: number;
    sideY: number;
    rearBendZ: number;
    rearRise?: { startZ: number; endZ: number; height: number };
  },
  box: Box,
) {
  const compact = model === "server-1u";
  const boardDirection = compact ? 1 : -1;
  const socketEnd = (
    seat: THREE.Object3D,
    direction: number,
    depth: number,
  ) => {
    seat.name = "harness-socket";
    const end = seat.getWorldPosition(new THREE.Vector3());
    end.z += (direction * depth) / 2;
    return end;
  };
  const front = socketEnd(boardSeat, boardDirection, 0.008);
  const rear = socketEnd(cardSeat, 1, 0.012);
  cable.position.copy(front).lerp(rear, 0.5);
  function plug(end: THREE.Vector3, direction: number, name: string) {
    const p = end.clone().sub(cable.position);
    p.z += direction * 0.006;
    const body = new THREE.Group();
    body.name = name + "-assembly";
    cable.add(body);
    const endPlug = compactCablePlug(body, name, p, box);
    if (direction < 0) endPlug.rotation.y = Math.PI;
    return end.clone().add(new THREE.Vector3(0, 0, direction * 0.012));
  }
  const from = plug(front, boardDirection, "backplane-plug");
  const to = plug(rear, 1, "controller-plug");
  const { sideX, sideY, rearBendZ } = route;
  const frontBendZ = from.z + boardDirection * (compact ? 0.012 : 0.027);
  // M1 先从导风罩侧下方通过，再抬高跨过主板上的元件。
  const rise = route.rearRise;
  const rearY = rise?.height ?? sideY;
  const points = [
    from,
    new THREE.Vector3(from.x, sideY, frontBendZ),
    new THREE.Vector3(sideX, sideY, frontBendZ),
    ...(rise
      ? [
          new THREE.Vector3(sideX, sideY, rise.startZ),
          new THREE.Vector3(sideX, rearY, rise.endZ),
        ]
      : []),
    new THREE.Vector3(sideX, rearY, rearBendZ),
    new THREE.Vector3(to.x, rearY, rearBendZ),
    to,
  ].map((p) => p.sub(cable.position));
  // 名称引线落在线束侧边直段，避开 U 形包围框的空心区域。
  cable.userData.labelPoint = points[2].clone().lerp(points[3], 0.5);
  const path = roundedRoute(points);
  const jacket = new THREE.MeshStandardMaterial({
    color: "#567880",
    roughness: 0.62,
  });
  for (const offset of compact ? [0] : [-0.0026, 0, 0.0026]) {
    const wire = new THREE.Mesh(
      new THREE.TubeGeometry(path, 128, compact ? 0.00145 : 0.0016, 8, false),
      jacket,
    );
    wire.position.y = offset;
    wire.castShadow = wire.receiveShadow = true;
    cable.add(wire);
  }
}
