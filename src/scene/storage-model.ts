import { registerLayer } from "./assembly-layer.ts";
import * as THREE from "three";
import { storageAssembly, storageSlot } from "../storage-layout.ts";

type Box = (
  root: THREE.Object3D,
  size: number[],
  position: number[],
  color: string,
  metalness?: number,
) => THREE.Mesh;

/** 接点用于说明盘组与中板的对应，不表示精确连接器或电气走线。 */
export function storageMidplane(root: THREE.Group, size: number[], box: Box) {
  const [w, h, d] = size;
  box(root, size, [0, 0, 0], "#294d3f", 0.15).name = "storage-midplane-board";
  const [cw, ch, cd] = storageAssembly.socketSize;
  for (let i = 0; i < storageAssembly.columns * storageAssembly.rows; i++) {
    const [x, y] = storageSlot(i);
    const socket = box(
      root,
      [cw, ch, cd],
      [x, y, d / 2 + cd / 2],
      "#222a2d",
      0.15,
    );
    socket.name = `storage-socket-${String(i + 1).padStart(2, "0")}`;
    socket.userData.storageSlotIndex = i;
    const contact = box(
      root,
      [cw * 0.7, ch * 0.35, 0.0006],
      [x, y, d / 2 + cd + 0.0003],
      "#a28e5b",
      0.5,
    );
    contact.userData.storageSlotIndex = i;
    // 短焊盘留在竖直板面，不在板顶复制水平主板元件。
    for (const dx of [-1, 1])
      box(
        root,
        [0.006, 0.001, 0.0003],
        [x + dx * (cw / 2 + 0.004), y, d / 2 + 0.00015],
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
  const {
    driveSize,
    columns,
    rows,
    railThickness: rail,
    socketSize,
  } = storageAssembly;
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
  box(
    drive,
    [socketSize[0] * 0.8, socketSize[1] * 0.7, 0.003],
    [0, 0, -d / 2 + 0.0015],
    "#a28e5b",
    0.5,
  ).name = "storage-drive-contact";
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
  box(pcb, boardSize, [0, 0, 0], "#305443", 0.2).name = "controller-pcb";
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
  const boardBottom = -boardSize[1] / 2,
    trayTop = trayY + 0.0015;
  for (const x of [-0.38, 0.38])
    for (const z of [-0.38, 0.38]) {
      box(
        pcb,
        [0.004, 0.001, 0.004],
        [x * boardSize[0], 0.002, z * boardSize[2]],
        "#9ca5a9",
        0.65,
      );
      box(
        root,
        [0.006, boardBottom - trayTop, 0.006],
        [x * boardSize[0], (boardBottom + trayTop) / 2, z * boardSize[2]],
        "#ab9463",
        0.55,
      ).name = "controller-standoff";
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
  box(root, [w, h * 0.66, 0.003], [0, 0, rear + 0.012], "#485662", 0.58).name =
    "controller-rear-panel";
  // 仅标出接口区域，逻辑端口归属沿用网络配置。
  box(
    root,
    [w * 0.43, h * 0.25, 0.003],
    [-w * 0.2, h * 0.04, rear + 0.009],
    "#202a31",
    0.32,
  );
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
  const sinkW = w * 0.45,
    sinkD = d * 0.27;
  box(pcb, [sinkW, 0.004, sinkD], [0, 0.0035, 0], "#89979e", 0.67);
  for (let i = 0; i < 9; i++)
    box(
      pcb,
      [0.0025, 0.009, sinkD],
      [((i - 4) * sinkW) / 9, 0.01, 0],
      "#a4afb6",
      0.67,
    );
  registerLayer(root, {
    node: pcb.name,
    offset: [0, h * 1.85, 0],
    direction: [1, 1.12, -0.72],
  });
}

// S4 的输入面板和板件同属内托。闭合时面板贴住壳体，内托远端止于两侧止挡。
export function storagePowerTray(root: THREE.Group, size: number[], box: Box) {
  const [w, h, d] = size;
  const {
    wall,
    railWidth,
    stopDepth,
    travelRatio,
    focusDirection: [x, y, z],
  } = storageAssembly.powerTray;
  const shellWidth = w * 0.96,
    shellHeight = h * 0.92;
  const mouth = -d / 2 + 0.0015,
    end = d / 2;
  const length = end - mouth,
    mid = (mouth + end) / 2;
  const innerEdge = shellWidth / 2 - wall;
  const railTop = -shellHeight / 2 + 3 * wall;
  const trayEnd = end - wall - stopDepth;
  const trayMid = (mouth + trayEnd) / 2;
  const metal = "#87949c",
    railMetal = "#aebac0";
  // 两侧长孔露出内轨和止挡，长孔之间保留金属连接筋。
  const sideHeight = shellHeight - 2 * wall;
  const outline = new THREE.Shape();
  outline.moveTo(-length / 2, -sideHeight / 2);
  outline.lineTo(length / 2, -sideHeight / 2);
  outline.lineTo(length / 2, sideHeight / 2);
  outline.lineTo(-length / 2, sideHeight / 2);
  outline.closePath();
  const slotWidth = length * 0.4,
    radius = sideHeight * 0.075;
  for (const column of [-1, 1])
    for (const row of [-1, 0, 1]) {
      const cx = column * length * 0.235,
        cy = row * sideHeight * 0.28;
      const dx = slotWidth / 2 - radius;
      const slot = new THREE.Path();
      slot.absarc(cx - dx, cy, radius, -Math.PI / 2, Math.PI / 2, true);
      slot.absarc(cx + dx, cy, radius, Math.PI / 2, -Math.PI / 2, true);
      slot.closePath();
      outline.holes.push(slot);
    }
  const sideSheet = new THREE.ExtrudeGeometry(outline, {
    depth: wall,
    bevelEnabled: false,
    curveSegments: 6,
  });
  sideSheet.translate(0, 0, -wall / 2);
  sideSheet.rotateY(Math.PI / 2);
  for (const side of [-1, 1]) {
    const plate = box(
      root,
      [shellWidth, wall, length],
      [0, (side * (shellHeight - wall)) / 2, mid],
      metal,
      0.72,
    );
    plate.name = side < 0 ? "psu-shell-base" : "psu-shell-lid";
    const sheet = new THREE.Mesh(sideSheet, plate.material);
    sheet.name = "psu-shell-side";
    sheet.position.set(side * (innerEdge + wall / 2), 0, mid);
    sheet.castShadow = sheet.receiveShadow = true;
    root.add(sheet);
    const railX = side * (innerEdge - railWidth / 2);
    box(
      root,
      [railWidth, wall, length - wall],
      [railX, railTop - wall / 2, mid - wall / 2],
      railMetal,
    ).name = "psu-inner-rail";
    box(
      root,
      [railWidth, 3 * wall, stopDepth],
      [railX, railTop + 1.5 * wall, trayEnd + stopDepth / 2],
      "#9b805f",
    ).name = "psu-tray-stop";
  }
  box(
    root,
    [2 * innerEdge, shellHeight - 2 * wall, wall],
    [0, 0, end - wall / 2],
    metal,
  ).name = "psu-end-wall";

  const tray = new THREE.Group();
  tray.name = "psu-inner-tray";
  root.add(tray);
  const width = 2 * innerEdge - wall;
  const trayLength = trayEnd - mouth;
  box(
    tray,
    [width, wall, trayLength],
    [0, railTop + wall / 2, trayMid],
    "#87949c",
  ).name = "psu-tray-floor";
  for (const sign of [-1, 1])
    box(
      tray,
      [wall, 3 * wall, trayLength],
      [(sign * (width - wall)) / 2, railTop + 2.5 * wall, trayMid],
      railMetal,
    );
  const pcbWidth = width * 0.83,
    pcbDepth = trayLength * 0.85;
  const boardBottom = railTop + wall * 3.6,
    boardTop = boardBottom + wall;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const px = sx * pcbWidth * 0.43,
        pz = trayMid + sz * pcbDepth * 0.43;
      box(
        tray,
        [3 * wall, boardBottom - railTop - wall, 3 * wall],
        [px, (boardBottom + railTop + wall) / 2, pz],
        "#7d857d",
      );
      box(
        tray,
        [2 * wall, wall * 0.4, 2 * wall],
        [px, boardTop + wall * 0.2, pz],
        railMetal,
      );
    }
  box(
    tray,
    [pcbWidth, wall, pcbDepth],
    [0, boardBottom + wall / 2, trayMid],
    "#365a4c",
    0.15,
  ).name = "psu-tray-board";
  // 板上散热片与线圈仅帮助辨认内托朝向，不表示真实电路。
  const sinkX = -pcbWidth * 0.19;
  box(
    tray,
    [pcbWidth * 0.39, wall, pcbDepth * 0.52],
    [sinkX, boardTop + wall / 2, trayMid],
    "#a3aeb5",
  );
  for (let i = 0; i < 6; i++)
    box(
      tray,
      [wall * 0.75, h * 0.19, pcbDepth * 0.52],
      [
        sinkX + pcbWidth * 0.065 * (i - 2.5),
        boardTop + wall + h * 0.095,
        trayMid,
      ],
      "#a3aeb5",
    );
  for (const sign of [-1, 1]) {
    const pz = trayMid + sign * pcbDepth * 0.19;
    box(
      tray,
      [pcbWidth * 0.23, h * 0.17, pcbDepth * 0.22],
      [pcbWidth * 0.22, boardTop + h * 0.085, pz],
      "#44484a",
      0.18,
    );
    for (const turn of [-1, 0, 1])
      box(
        tray,
        [pcbWidth * 0.245, h * 0.18, wall * 1.15],
        [pcbWidth * 0.22, boardTop + h * 0.09, pz + turn * wall * 2.3],
        "#a77652",
        0.52,
      );
  }
  registerLayer(root, {
    node: tray.name,
    offset: [0, 0, -d * travelRatio],
    direction: [x, y, z],
  });
  return tray;
}
