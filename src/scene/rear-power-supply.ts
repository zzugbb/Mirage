import * as THREE from "three";
import type definition from "../../assets/public/scenes/room-01.json";
import type { Box } from "./equipment-model.ts";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";

import { powerBoardMount } from "./power-board-mount.ts";

type ContactConfig = typeof definition.storageAssembly.powerTray.boardContact;
type SwitchTray = typeof definition.switchAssembly.powerTray;
type TrayConfig = Omit<SwitchTray, "boardContact" | "boardMount"> & {
  boardMount?: SwitchTray["boardMount"];
  boardContact?: ContactConfig;
};

// 两件电源共用机后观察方向；壳体、输入面板和拉手归属同一个维护部件。
export function rearPowerSupply(
  root: THREE.Group,
  size: number[],
  box: Box,
  rearClearance: number,
  config: TrayConfig,
) {
  const [w, h, d] = size;
  const rear = -d / 2;
  // 横杆外缘与机箱后沿保留间隙。
  const gripDepth = Math.min(0.012, rearClearance - 0.002);
  root.userData.focusDirection = [0.14, 0.55, -1];
  const panel = powerTray(root, size, box, config);
  box(panel, [w, h, 0.003], [0, 0, rear], "#53616a", 0.62).name =
    "psu-rear-panel";
  const inletX = -w * 0.13;
  box(
    panel,
    [w * 0.44, h * 0.5, 0.003],
    [inletX, 0, rear - 0.003],
    "#242d33",
    0.2,
  );
  box(
    panel,
    [w * 0.34, h * 0.35, 0.001],
    [inletX, 0, rear - 0.0046],
    "#121b20",
    0.12,
  );
  for (const sign of [-1, 1]) {
    box(
      panel,
      [w * 0.43, 0.0016, 0.001],
      [inletX, sign * h * 0.36, rear - 0.002],
      "#20292e",
      0.18,
    );
    box(
      panel,
      [0.004, 0.004, gripDepth],
      [w * 0.32, sign * h * 0.28, rear - gripDepth / 2],
      "#7f9098",
      0.6,
    );
    box(
      root,
      [0.002, 0.001, d * 0.88],
      [sign * w * 0.44, h * 0.47, 0],
      "#74818b",
      0.65,
    );
  }
  box(
    panel,
    [0.005, h * 0.56 + 0.004, 0.003],
    [w * 0.32, 0, rear - gripDepth],
    "#9ba88f",
    0.48,
  ).name = "psu-handle";
  // 上盖压筋沿抽取方向排列，保持模块外廓。
  for (const x of [-0.23, 0.23])
    box(
      root,
      [w * 0.055, 0.0012, d * 0.65],
      [w * x, h * 0.46, 0.002],
      "#a6b0b6",
      0.7,
    );
}

// 输入面板和板件同属内托。闭合时面板贴住壳体，内托远端止于两侧止挡。
function powerTray(
  root: THREE.Group,
  size: number[],
  box: Box,
  config: TrayConfig,
) {
  const [w, h, d] = size;
  const {
    wall,
    railWidth,
    stopDepth,
    travelRatio,
    focusDirection: [x, y, z],
  } = config;
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
  const board = config.boardMount
    ? powerBoardMount(
        root,
        tray,
        config.boardMount,
        pcbWidth,
        pcbDepth,
        trayMid,
        railTop + wall,
        boardBottom,
        wall,
      )
    : tray;
  if (!config.boardMount) {
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
  }
  // 板上散热片与线圈仅帮助辨认内托朝向，不表示真实电路。
  const sinkX = -pcbWidth * 0.19;
  box(
    board,
    [pcbWidth * 0.39, wall, pcbDepth * 0.52],
    [sinkX, boardTop + wall / 2, trayMid],
    "#a3aeb5",
  );
  for (let i = 0; i < 6; i++)
    box(
      board,
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
      board,
      [pcbWidth * 0.23, h * 0.17, pcbDepth * 0.22],
      [pcbWidth * 0.22, boardTop + h * 0.085, pz],
      "#44484a",
      0.18,
    );
    for (const turn of [-1, 0, 1])
      box(
        board,
        [pcbWidth * 0.245, h * 0.18, wall * 1.15],
        [pcbWidth * 0.22, boardTop + h * 0.09, pz + turn * wall * 2.3],
        "#a77652",
        0.52,
      );
  }
  if (config.boardContact)
    boardContact(
      root,
      tray,
      board,
      box,
      config.boardContact,
      wall,
      boardTop,
      trayMid + pcbDepth / 2,
      end - wall,
    );
  registerLayer(root, {
    node: tray.name,
    offset: [0, 0, -d * travelRatio],
    direction: [x, y, z],
  });
  return tray;
}

// 板端从机后沿 +Z 推入壳内。座体背面贴住端壁，中肋落入宽、窄两片之间的缺口。
function boardContact(
  root: THREE.Group,
  tray: THREE.Group,
  board: THREE.Group,
  box: Box,
  config: ContactConfig,
  wall: number,
  boardTop: number,
  boardEdge: number,
  innerEnd: number,
) {
  const {
    width,
    travel,
    focusDirection: [x, y, z],
  } = config;
  const plug = new THREE.Group(),
    socket = new THREE.Group();
  plug.name = "psu-board-plug";
  socket.name = "psu-end-socket";
  board.add(plug);
  root.add(socket);
  const shoulderEnd = boardEdge + wall;
  const mouth = shoulderEnd + wall;
  const back = innerEnd - 2 * wall;
  const tip = back - wall * 0.6;
  const bladeY = boardTop + wall;
  const keyX = width * 0.14;
  const clearance = wall * 0.28;
  const seatColor = "#495762";
  box(
    plug,
    [width, 3 * wall, 4 * wall],
    [0, boardTop + 1.5 * wall, shoulderEnd - 2 * wall],
    "#395b54",
  ).name = "psu-plug-shoulder";
  box(
    socket,
    [width + 2 * wall, wall, innerEnd - mouth],
    [0, bladeY - wall / 2, (innerEnd + mouth) / 2],
    seatColor,
  ).name = "psu-socket-bed";
  box(
    socket,
    [width + 2 * wall, 3 * wall, innerEnd - back],
    [0, bladeY + 1.5 * wall, (innerEnd + back) / 2],
    seatColor,
  ).name = "psu-socket-back";
  for (const cx of [-(width + wall) / 2, keyX, (width + wall) / 2]) {
    box(
      socket,
      [wall, 2.3 * wall, back - mouth],
      [cx, bladeY + 1.15 * wall, (back + mouth) / 2],
      seatColor,
    ).name = cx === keyX ? "psu-socket-key" : "psu-socket-guide";
  }
  for (const [left, right] of [
    [-width / 2, keyX - wall / 2],
    [keyX + wall / 2, width / 2],
  ]) {
    const span = right - left - 2 * clearance,
      cx = (left + right) / 2;
    box(
      plug,
      [span, wall, tip - shoulderEnd],
      [cx, bladeY + wall / 2, (tip + shoulderEnd) / 2],
      "#407661",
    ).name = "psu-plug-tongue";
    const padFront = shoulderEnd + 0.4 * wall;
    const padEnd = tip - 0.3 * wall;
    box(
      plug,
      [span * 0.65, wall * 0.16, padEnd - padFront],
      [cx, bladeY + wall * 1.08, (padFront + padEnd) / 2],
      "#c5a05d",
    ).name = "psu-contact-pad";
    // 固定承片从座背伸向插片，压合面保留在可观察的上侧。
    const fingerFront = (mouth + tip) / 2;
    box(
      socket,
      [span * 0.38, wall * 0.5, back - fingerFront],
      [cx, bladeY + 1.41 * wall, (fingerFront + back) / 2],
      "#ad9270",
    ).name = "psu-socket-finger";
  }
  registerLayer(tray, {
    node: tray.name,
    offset: [0, 0, -travel],
    direction: [x, y, z],
  });
  registerLayerScope(root, "board-contact", {
    layerRoot: tray,
    moving: plug,
    members: [plug, socket],
    selectionPadding: 0.0008,
  });
}
