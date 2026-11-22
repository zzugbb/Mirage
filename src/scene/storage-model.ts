import {
  controllerMounts,
  controllerCooler,
} from "./storage-controller-mounts.ts";
import { registerLayer } from "./assembly-layer.ts";
import * as THREE from "three";
import { buildControllerCage } from "./storage-controller-cage.ts";
import {
  controllerPortsFor,
  storageAssembly,
  storageSlot,
} from "../storage-layout.ts";

import type { Box } from "./equipment-model.ts";

// 两个宽度不同的腔口共用一条偏置隔筋。插片与插座从同一截面取尺寸。
const [socketW, socketH, socketD] = storageAssembly.socketSize;
const wall = socketH * 0.13;
const innerW = socketW - wall * 3;
const wide = innerW * 0.65;
const divider = -socketW / 2 + wall + wide + wall / 2;
const padTop = socketH * 0.2 + wall * 0.13;
const cavities = [
  { x: -socketW / 2 + wall + wide / 2, w: wide },
  { x: (divider + wall / 2 + socketW / 2 - wall) / 2, w: innerW - wide },
];
function storageSocket(box: Box) {
  const socket = new THREE.Group();
  const frame = "#394950",
    depth = socketD - wall;
  box(
    socket,
    [socketW, socketH, wall],
    [0, 0, -socketD + wall / 2],
    frame,
  ).name = "socket-back";
  box(
    socket,
    [socketW, wall, depth],
    [0, -(socketH - wall) / 2, -depth / 2],
    frame,
  ).name = "socket-floor";
  // 顶部保留前横梁、隔筋和后壁，透过两个观察窗核对插片落位。
  box(
    socket,
    [socketW - 2 * wall, wall, wall],
    [0, (socketH - wall) / 2, -wall / 2],
    frame,
  ).name = "socket-rim";
  for (const side of [-1, 1])
    box(
      socket,
      [wall, socketH - wall, depth],
      [(side * (socketW - wall)) / 2, wall / 2, -depth / 2],
      frame,
    ).name = "socket-side";
  box(
    socket,
    [wall, socketH - wall, depth - wall],
    [divider, wall / 2, -(wall + depth) / 2],
    frame,
  ).name = "socket-divider";
  box(socket, [wall, socketH - 2 * wall, wall], [divider, 0, -wall / 2], frame);
  for (const c of cavities) {
    const width = c.w - wall * 0.65;
    for (const offset of [-1, 0, 1])
      box(
        socket,
        [width * 0.11, wall * 0.36, depth * 0.54],
        [c.x + offset * width * 0.29, padTop + wall * 0.18, -depth * 0.73],
        "#b78b60",
      ).name = "socket-contact";
  }
  return socket;
}

/** 接点用于说明盘组与中板的对应，不表示精确连接器或电气走线。 */
export function storageMidplane(root: THREE.Group, size: number[], box: Box) {
  const [w, h, d] = size;
  box(root, size, [0, 0, 0], "#294d3f", 0.15).name = "storage-midplane-board";
  const template = storageSocket(box);
  for (let i = 0; i < storageAssembly.columns * storageAssembly.rows; i++) {
    const [x, y] = storageSlot(i);
    const socket = template.clone();
    socket.name = `storage-socket-${String(i + 1).padStart(2, "0")}`;
    socket.position.set(x, y, d / 2 + socketD);
    root.add(socket);
    for (const mesh of socket.children) mesh.userData.storageSlotIndex = i;
    // 短焊盘留在竖直板面，不在板顶复制水平主板元件。
    for (const dx of [-1, 1])
      box(
        root,
        [0.006, 0.001, 0.0003],
        [x + dx * (socketW / 2 + 0.004), y, d / 2 + 0.00015],
        "#82794f",
        0.4,
      );
  }
  for (const x of [-w / 2 + 0.008, w / 2 - 0.008])
    for (const y of [-h / 2 + 0.008, h / 2 - 0.008])
      box(root, [0.004, 0.004, 0.002], [x, y, d / 2 + 0.001], "#9ca5a9", 0.7);
}

export function storageDrive(
  root: THREE.Group,
  index: number,
  size: number[],
  box: Box,
) {
  const { driveSize, columns, rows, railThickness: rail } = storageAssembly;
  const [w, h, d] = driveSize;
  const [x, y] = storageSlot(index);
  root.position.set(x, y, 0);
  const drive = new THREE.Group();
  drive.name = "storage-drive";
  root.add(drive);
  const bodyW = w - rail * 2;
  const bodyH = h - rail;
  const lid = 0.0008;
  box(
    drive,
    [bodyW, bodyH - lid, d - 0.003],
    [0, -lid / 2, 0.0015],
    "#647078",
    0.6,
  ).name = "storage-drive-body";
  box(
    drive,
    [bodyW - 0.001, lid, d - 0.004],
    [0, (bodyH - lid) / 2, 0.0015],
    "#a4adb0",
    0.63,
  );
  for (const side of [-1, 1]) {
    for (const end of [-1, 1])
      box(
        drive,
        [0.003, 0.0004, 0.003],
        [side * (bodyW / 2 - 0.006), bodyH / 2 + 0.0002, end * (d / 2 - 0.01)],
        "#56636a",
        0.58,
      );
  }
  const plug = new THREE.Group();
  plug.name = "storage-drive-plug";
  plug.position.z = -d / 2;
  drive.add(plug);
  const shoulder = 0.003,
    tongueD = socketD - wall * 1.48;
  box(
    plug,
    [socketW, socketH * 0.74, shoulder],
    [0, 0, shoulder / 2],
    "#54656e",
  ).name = "storage-drive-contact";
  for (const c of cavities) {
    const width = c.w - wall * 0.65;
    box(
      plug,
      [width, socketH * 0.4, tongueD],
      [c.x, 0, -tongueD / 2],
      "#426653",
      0.22,
    ).name = "plug-tongue";
    for (const offset of [-1, 0, 1])
      box(
        plug,
        [width * 0.18, wall * 0.13, tongueD * 0.72],
        [
          c.x + offset * width * 0.29,
          socketH * 0.2 + wall * 0.065,
          -tongueD * 0.56,
        ],
        "#c0a16c",
      ).name = "plug-pad";
  }
  const tray = new THREE.Group();
  tray.name = "storage-drive-tray";
  root.add(tray);
  // 侧轨延伸到前面板，横托的顶面与盘底接触。抬起时端子随盘体移动。
  const front = size[2] / 2 - 0.004;
  const back = -d / 2;
  for (const side of [-1, 1])
    box(
      tray,
      [rail, h, front - back],
      [(side * (w - rail)) / 2, 0, (front + back) / 2],
      "#505e68",
      0.65,
    ).name = "storage-drive-rail";
  for (const z of [-d * 0.32, d * 0.32])
    box(
      tray,
      [bodyW, rail / 2, d * 0.12],
      [0, -(bodyH / 2 + rail / 4), z],
      "#74828b",
      0.58,
    ).name = "storage-drive-support";
  box(tray, [w, h * 0.68, 0.002], [0, 0, front - 0.001], "#505e68", 0.6);
  const faceW = (size[0] / columns) * 0.94,
    faceH = (size[1] / rows) * 0.88;
  box(tray, [faceW, faceH, 0.008], [0, 0, size[2] / 2], "#28333d", 0.4);
  for (const side of [-1, 1])
    box(
      tray,
      [0.004, faceH * 0.65, 0.006],
      [side * faceW * 0.3, 0, size[2] / 2 + 0.006],
      "#7c8992",
      0.65,
    );
  box(
    tray,
    [faceW * 0.6, 0.003, 0.003],
    [0, -faceH * 0.2, size[2] / 2 + 0.009],
    "#a2adb4",
    0.7,
  );
  const { lift, focusDirection } = storageAssembly.trayInspection;
  registerLayer(root, {
    node: drive.name,
    offset: [0, lift, 0],
    direction: [focusDirection[0], focusDirection[1], focusDirection[2]],
  });
}

// 后面板独立于板卡，孔和笼口用同一组中心。左右位置仅用于演示装配。
function controllerPorts(
  root: THREE.Group,
  pcb: THREE.Group,
  width: number,
  panelHeight: number,
  panelZ: number,
  boardTop: number,
  box: Box,
) {
  const { cageSize, pitch, wall, panelGap, panelThickness } =
    storageAssembly.controllerPorts;
  const [w, h] = cageSize;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -panelHeight / 2);
  shape.lineTo(width / 2, -panelHeight / 2);
  shape.lineTo(width / 2, panelHeight / 2);
  shape.lineTo(-width / 2, panelHeight / 2);
  shape.closePath();
  const ports = controllerPortsFor(root.userData.entityId);
  const y = boardTop + h / 2;
  const mouthZ = panelZ + panelThickness + panelGap;
  for (const [i, port] of ports.entries()) {
    const x = -width * 0.22 + ((ports.length - 1) / 2 - i) * pitch;
    const hole = new THREE.Path();
    const hx = (w - wall) / 2,
      hy = (h - wall) / 2;
    hole.moveTo(x - hx, y - hy);
    hole.lineTo(x - hx, y + hy);
    hole.lineTo(x + hx, y + hy);
    hole.lineTo(x + hx, y - hy);
    hole.closePath();
    shape.holes.push(hole);
    const cage = new THREE.Group();
    cage.name = "controller-port-cage";
    cage.position.set(x, y, mouthZ);
    pcb.add(cage);
    buildControllerCage(root, cage, i, box);
    cage.userData.logicalPort = port.port;
  }
  const panel = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: panelThickness,
      bevelEnabled: false,
    }),
    new THREE.MeshStandardMaterial({
      color: "#485662",
      metalness: 0.58,
      roughness: 0.4,
    }),
  );
  panel.name = "controller-rear-panel";
  panel.position.z = panelZ;
  panel.castShadow = panel.receiveShadow = true;
  root.add(panel);
}

// 后面板朝设备 -Z，板卡、托盘与拉手共用控制器的维护身份。
export function storageController(root: THREE.Group, size: number[], box: Box) {
  const [w, h, d] = size;
  const rear = -d / 2;
  root.userData.focusDirection = [0.14, 0.76, -1];
  const trayY = -h * 0.22;
  const boardSize = [w * 0.9, 0.003, d - 0.032];
  const pcb = new THREE.Group();
  pcb.name = "controller-board";
  root.add(pcb);
  const boardArea = controllerMounts(root, pcb, boardSize, trayY + 0.0015, box);
  for (const side of [-1, 1]) {
    for (const z of [-0.32, 0, 0.32]) {
      box(
        pcb,
        [w * 0.1, 0.003, d * 0.08],
        [side * w * 0.33, 0.003, z * boardSize[2]],
        "#303a3d",
        0.2,
      );
    }
  }
  box(root, [w, 0.003, d - 0.012], [0, trayY, 0.006], "#7d8c94", 0.65).name =
    "controller-tray";
  for (const side of [-1, 1]) {
    box(
      root,
      [0.002, h * 0.45, d - 0.012],
      [(side * (w - 0.002)) / 2, 0, 0.006],
      "#8d9ba3",
      0.6,
    );
  }
  controllerPorts(root, pcb, w, h * 0.66, rear + 0.0105, boardSize[1] / 2, box);
  for (const x of [0.09, 0.39]) {
    box(root, [0.004, 0.006, 0.009], [w * x, 0, rear + 0.006], "#adb8c0", 0.7);
  }
  box(
    root,
    [w * 0.3 + 0.004, 0.006, 0.003],
    [w * 0.24, 0, rear + 0.0015],
    "#adb8c0",
    0.7,
  );
  controllerCooler(
    root,
    pcb,
    w * 0.45,
    d * 0.27,
    boardSize[1] / 2,
    boardArea,
    box,
  );
  const [x, y, z] = storageAssembly.controllerPorts.focusDirection;
  registerLayer(root, {
    node: pcb.name,
    offset: [0, h * 1.85, 0],
    direction: [x, y, z],
  });
}
