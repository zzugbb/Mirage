import * as THREE from "three";
import type definition from "../../assets/public/scenes/room-01.json";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";

type Mount = typeof definition.switchAssembly.powerTray.boardMount;

// 板底压在四根柱肩上。柱尖穿过板孔，板件抬起时焊盘和板端插片都随板移动。
export function powerBoardMount(
  root: THREE.Group,
  tray: THREE.Group,
  mount: Mount,
  width: number,
  depth: number,
  midZ: number,
  trayTop: number,
  bottom: number,
  thickness: number,
) {
  const board = new THREE.Group();
  board.name = "psu-board-assembly";
  tray.add(board);
  const shape = new THREE.Shape();
  const x = width / 2,
    z = depth / 2,
    bevel = 2 * thickness;
  shape.moveTo(-x, -z + bevel);
  shape.lineTo(-x + bevel, -z);
  shape.lineTo(x - bevel, -z);
  shape.lineTo(x, -z + bevel);
  shape.lineTo(x, z);
  shape.lineTo(-x, z);
  shape.closePath();
  const height = bottom - trayTop;
  const brass = new THREE.MeshStandardMaterial({
    color: "#b19662",
    metalness: 0.58,
    roughness: 0.46,
  });
  const shoulder = new THREE.CylinderGeometry(
    mount.shoulderRadius,
    mount.shoulderRadius,
    height,
    6,
  );
  const pinHeight = thickness * 1.8;
  const pin = new THREE.CylinderGeometry(
    mount.pinRadius * 0.82,
    mount.pinRadius,
    pinHeight,
    24,
  );
  const ring = new THREE.RingGeometry(
    mount.holeRadius,
    mount.shoulderRadius,
    32,
  ).rotateX(-Math.PI / 2);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const px = sx * width * 0.42,
        pz = sz * depth * 0.43;
      const hole = new THREE.Path();
      hole.absarc(px, -pz, mount.holeRadius, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      for (const [owner, geometry, name, y] of [
        [tray, shoulder, "psu-board-shoulder", trayTop + height / 2],
        [tray, pin, "psu-board-pin", bottom + pinHeight / 2],
        [board, ring, "psu-hole-rim", bottom + thickness + 0.000012],
      ] as const) {
        const mesh = new THREE.Mesh(geometry, brass);
        mesh.name = name;
        mesh.position.set(px, y, midZ + pz);
        mesh.castShadow = mesh.receiveShadow = true;
        owner.add(mesh);
      }
    }
  const sheet = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: 16,
    }).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: "#365a4c",
      roughness: 0.56,
      metalness: 0.15,
    }),
  );
  sheet.name = "psu-tray-board";
  sheet.castShadow = sheet.receiveShadow = true;
  sheet.position.set(0, bottom, midZ);
  board.add(sheet);
  const [dx, dy, dz] = mount.focusDirection;
  registerLayer(board, {
    node: board.name,
    offset: [0, mount.lift, 0],
    direction: [dx, dy, dz],
  });
  registerLayerScope(root, "board-mount", {
    extractedLayers: [root],
    layerRoot: board,
    moving: board,
    members: [tray],
    selectedBranch: board,
    selectionPadding: 0.001,
  });
  return board;
}
