import * as THREE from "three";
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
    const { x, y, z } = face.clone().sub(board.position);
    const depth = z - d / 2;
    box(
      board,
      [0.005, 0.038, depth - 0.0004],
      [x, y, z - depth / 2 - 0.0002],
      "#242c31",
      0.22,
    );
    box(
      board,
      [0.002, 0.028, 0.0004],
      [x, y, z - 0.0002],
      "#aa9359",
      0.48,
    ).name = drivePairs[i].companion.slot;
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
  const boardSeat = box(
    board,
    [0.022, 0.009, 0.008],
    [-w * 0.34, 0.012, -(d + 0.008) / 2],
    "#353e43",
  );
  const cardSeat = box(
    card,
    [0.022, 0.009, 0.012],
    [0, 0.0055, (cd - 0.012) / 2],
    "#353e43",
  );
  connectHarness(cable, boardSeat, cardSeat, "server-2u", layout, box);
  positions.set(layout.backplane, board.position.clone());
  positions.set(layout.harness, cable.position.clone());
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
  const boardSeat = box(
    board,
    [0.016, 0.008, 0.008],
    new THREE.Vector3()
      .fromArray(compact.boardSeat)
      .sub(board.position)
      .toArray(),
    "#353e43",
  );
  const cardSeat = box(
    card,
    [0.016, 0.006, 0.012],
    [0, 0.005, (mount.controllerSize[2] - 0.012) / 2],
    "#353e43",
  );
  connectHarness(cable, boardSeat, cardSeat, "server-1u", compact, box);
  positions.set(compact.harness, cable.position.clone());
}

function connectHarness(
  cable: THREE.Group,
  boardSeat: THREE.Mesh,
  cardSeat: THREE.Mesh,
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
  const socketEnd = (seat: THREE.Mesh, direction: number, depth: number) => {
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
    box(
      cable,
      [compact ? 0.015 : 0.019, compact ? 0.006 : 0.008, 0.012],
      p.toArray(),
      "#46545c",
    ).name = name;
    box(
      cable,
      [0.009, 0.001, 0.007],
      [p.x, p.y + (compact ? 0.0035 : 0.0045), p.z],
      "#a0a9a8",
    );
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
