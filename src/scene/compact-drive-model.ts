import * as THREE from "three";
import { modelById } from "../catalog.ts";
import { registerLayer } from "./assembly-layer.ts";
import type { Box } from "./equipment-model.ts";

const layout = modelById("server-1u").compactDrive!;

// 简化托架向机后敞开，横托上表面对应盘底，前拉手归属托架。
export function compactTray(root: THREE.Group, depth: number, box: Box) {
  const [width, height] = layout.caseSize;
  root.userData.focusDirection = layout.trayDirection;
  const side = width / 2 + 0.0015;
  for (const sign of [-1, 1]) {
    box(root, [0.0018, 0.016, depth], [sign * side, 0, 0], "#809098").name =
      "compact-tray-side";
    box(
      root,
      [2 * side - 0.0018, 0.0016, 0.009],
      [0, -height / 2 - 0.0008, sign * depth * 0.32],
      "#8b999e",
    ).name = "compact-tray-crossbar";
  }
  box(
    root,
    [2 * side - 0.0018, 0.015, 0.002],
    [0, 0, depth / 2 - 0.004],
    "#343f47",
  );
  for (const sign of [-1, 1])
    box(
      root,
      [0.004, 0.003, 0.002],
      [sign * width * 0.31, 0, depth / 2 - 0.002],
      "#a2adb3",
    );
  box(
    root,
    [width * 0.62 + 0.004, 0.003, 0.001],
    [0, 0, depth / 2 - 0.0005],
    "#99abae",
  );
}

// 上盖、底壳、板上器件和尾部接触片沿用同一块 SSD 的维护身份。
export function compactSsd(root: THREE.Group, box: Box) {
  const [w, h, d] = layout.caseSize;
  const sheet = 0.0008,
    top = h / 2 - sheet,
    bottom = -h / 2 + sheet;
  const metal = "#788891",
    edge = "#a1adb2";
  const base = box(root, [w, sheet, d], [0, bottom - sheet / 2, 0], metal);
  base.name = "ssd-case-base";
  for (const sign of [-1, 1])
    box(
      root,
      [sheet, top - bottom, d],
      [(sign * (w - sheet)) / 2, (top + bottom) / 2, 0],
      metal,
    ).name = "ssd-case-rim";
  box(
    root,
    [w - 2 * sheet, top - bottom, sheet],
    [0, (top + bottom) / 2, (d - sheet) / 2],
    metal,
  );
  // 尾部开口与盘内板的接口共用基准，左右边段接到底壳侧壁。
  const portWidth = w * 0.49,
    portX = -w * 0.1;
  for (const [left, right] of [
    [-w / 2 + sheet, portX - portWidth / 2],
    [portX + portWidth / 2, w / 2 - sheet],
  ])
    box(
      root,
      [right - left, top - bottom, sheet],
      [(left + right) / 2, (top + bottom) / 2, (-d + sheet) / 2],
      metal,
    );
  const boardY = bottom + 0.0016,
    pcb = 0.00085;
  const boardDepth = d * 0.92;
  box(root, [w * 0.84, pcb, boardDepth], [0, boardY, 0], "#305d50", 0.16).name =
    "ssd-pcb";
  const boardTop = boardY + pcb / 2;
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      box(
        root,
        [0.004, boardY - pcb / 2 - bottom, 0.004],
        [x * w * 0.37, (boardY - pcb / 2 + bottom) / 2, z * d * 0.39],
        metal,
      );
      box(
        root,
        [w * 0.24, 0.0012, d * 0.19],
        [x * w * 0.21, boardTop + 0.0006, z * d * 0.15],
        "#263138",
        0.17,
      );
    }
  // 尾端的小封装及无标识贴片只说明板面朝向，不定义接口规格。
  box(
    root,
    [w * 0.17, 0.0011, d * 0.1],
    [portX, boardTop + 0.00055, -d * 0.34],
    "#343d43",
    0.2,
  );
  for (let i = 0; i < 4; i++)
    box(
      root,
      [0.0015, 0.0007, 0.003],
      [portX + 0.009 + i * 0.003, boardTop + 0.00035, -d * 0.34],
      "#9b927e",
    );
  const connector = new THREE.Group();
  connector.name = "ssd-tail-connector";
  root.add(connector);
  const nose = -d / 2 - 0.0012;
  box(
    connector,
    [portWidth - 0.0006, 0.0025, -boardDepth / 2 - nose],
    [portX, boardY, (-boardDepth / 2 + nose) / 2],
    "#27333b",
  ).name = "ssd-tail-port";
  for (let i = 0; i < 10; i++)
    box(
      connector,
      [0.0016, 0.00025, 0.0024],
      [portX + (i - 4.5) * 0.0027, boardY + 0.001375, nose + 0.0012],
      "#ae935b",
    ).name = "ssd-tail-pad";
  const lid = new THREE.Group();
  lid.name = "ssd-cover";
  root.add(lid);
  box(lid, [w, sheet, d], [0, top + sheet / 2, 0], edge, 0.7).name =
    "ssd-cover-sheet";
  // 定位销随盖移动。环形座孔贯通至壳底，孔壁与销留出径向间隙。
  const seatGeometry = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0022, bottom),
      new THREE.Vector2(0.0022, top),
      new THREE.Vector2(0.00125, top),
      new THREE.Vector2(0.00125, bottom),
    ],
    24,
  );
  const pinLength = (top - bottom) * 0.68;
  const pinGeometry = new THREE.CylinderGeometry(
    0.00105,
    0.00092,
    pinLength,
    24,
  );
  for (const sign of [-1, 1]) {
    box(
      lid,
      [0.002, 0.0004, d * 0.63],
      [sign * w * 0.34, h / 2 + 0.0002, 0],
      "#86969d",
    );
    for (const end of [-1, 1]) {
      const x = sign * (w / 2 - 0.003),
        z = end * (d / 2 - 0.003);
      const seat = new THREE.Mesh(seatGeometry, base.material);
      seat.name = "ssd-lid-seat";
      seat.position.set(x, 0, z);
      seat.castShadow = seat.receiveShadow = true;
      root.add(seat);
      const pin = new THREE.Mesh(pinGeometry, base.material);
      pin.name = "ssd-cover-pin";
      pin.position.set(x, top - pinLength / 2, z);
      pin.castShadow = pin.receiveShadow = true;
      lid.add(pin);
    }
  }
  const [x, y, z] = layout.coverDirection;
  registerLayer(root, {
    node: lid.name,
    offset: [0, layout.coverLift, 0],
    direction: [x, y, z],
  });
}
