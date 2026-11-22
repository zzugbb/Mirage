import * as THREE from "three";
import { modelById } from "../catalog.ts";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";
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
export function compactSsd(root: THREE.Group, box: Box, vertical = false) {
  const [w, h, d] = layout.caseSize;
  const sheet = 0.0008,
    top = h / 2 - sheet,
    bottom = -h / 2 + sheet;
  const metal = "#788891",
    edge = "#a1adb2";
  const housing = new THREE.Group();
  const board = new THREE.Group();
  board.name = "ssd-board-assembly";
  const lid = new THREE.Group();
  lid.name = "ssd-cover";
  root.add(housing, board, lid);
  const floor = new THREE.Group();
  floor.name = "ssd-case-base";
  housing.add(floor);
  const lipDepth = d * 0.075;
  const base = box(
    floor,
    [w, sheet, d - lipDepth],
    [0, bottom - sheet / 2, lipDepth / 2],
    metal,
  );
  const lip = box(
    floor,
    [w, sheet, lipDepth],
    [0, bottom - sheet / 2, (-d + lipDepth) / 2],
    metal,
  );
  lip.name = "ssd-tail-lip";
  for (const sign of [-1, 1])
    box(
      housing,
      [sheet, top - bottom, d],
      [(sign * (w - sheet)) / 2, (top + bottom) / 2, 0],
      metal,
    ).name = "ssd-case-rim";
  box(
    housing,
    [w - 2 * sheet, top - bottom, sheet],
    [0, (top + bottom) / 2, (d - sheet) / 2],
    metal,
  );
  // 尾部开口与盘内板的接口共用基准，左右边段接到底壳侧壁。
  const portWidth = w * 0.49,
    portX = w * (vertical ? 0.1 : -0.1);
  const tailEdges = new THREE.Group();
  housing.add(tailEdges);
  for (const [left, right] of [
    [-w / 2 + sheet, portX - portWidth / 2],
    [portX + portWidth / 2, w / 2 - sheet],
  ])
    box(
      tailEdges,
      [right - left, top - bottom, sheet],
      [(left + right) / 2, (top + bottom) / 2, (-d + sheet) / 2],
      metal,
    ).name = "ssd-tail-edge";
  const boardY = bottom + 0.0016,
    pcb = 0.00085;
  const boardDepth = d * 0.92;
  const boardWidth = w * 0.84;
  const shape = new THREE.Shape();
  shape.moveTo(-boardWidth / 2, -boardDepth / 2);
  shape.lineTo(boardWidth / 2, -boardDepth / 2);
  shape.lineTo(boardWidth / 2, boardDepth / 2);
  // 从板尾分出接头后方的同材质板面，局部核查仍可看到接头归属和实际壳口。
  const tabDepth = d * 0.045,
    tabWidth = portWidth + 0.001;
  const tabLeft = portX - tabWidth / 2,
    tabRight = portX + tabWidth / 2;
  shape.lineTo(tabRight, boardDepth / 2);
  shape.lineTo(tabRight, boardDepth / 2 - tabDepth);
  shape.lineTo(tabLeft, boardDepth / 2 - tabDepth);
  shape.lineTo(tabLeft, boardDepth / 2);
  shape.lineTo(-boardWidth / 2, boardDepth / 2);
  shape.closePath();
  const mount = layout.boardMount;
  const boardBottom = boardY - pcb / 2,
    boardTop = boardY + pcb / 2;
  const postHeight = boardBottom - bottom,
    pinHeight = pcb * 1.35;
  const post = new THREE.CylinderGeometry(
    mount.shoulderRadius,
    mount.shoulderRadius,
    postHeight,
    12,
  );
  const pin = new THREE.CylinderGeometry(
    mount.pinRadius * 0.85,
    mount.pinRadius,
    pinHeight,
    24,
  );
  const ring = new THREE.RingGeometry(
    mount.boreRadius,
    mount.shoulderRadius,
    32,
  ).rotateX(-Math.PI / 2);
  const brass = new THREE.MeshStandardMaterial({
    color: "#b59c72",
    metalness: 0.6,
    roughness: 0.48,
  });
  const packages = new THREE.Group(),
    pads = new THREE.Group();
  board.add(packages);
  lid.add(pads);
  const spreader = layout.heatSpreader;
  const chipHeight = 0.0012,
    padTop = top - spreader.thickness,
    padBottom = boardTop + chipHeight;
  box(
    pads,
    [w * 0.72, spreader.thickness, d * 0.55],
    [0, top - spreader.thickness / 2, 0],
    "#a77e65",
    0.48,
  ).name = "ssd-spreader";
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      const px = x * w * 0.37,
        pz = z * d * 0.39;
      const hole = new THREE.Path();
      hole.absarc(px, -pz, mount.boreRadius, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      for (const [owner, geo, y, name] of [
        [housing, post, bottom + postHeight / 2, "ssd-board-post"],
        [housing, pin, boardBottom + pinHeight / 2, "ssd-board-pin"],
        [board, ring, boardTop + 0.000012, "ssd-board-rim"],
      ] as const) {
        const mesh = new THREE.Mesh(geo, brass);
        mesh.position.set(px, y, pz);
        mesh.name = name;
        mesh.castShadow = mesh.receiveShadow = true;
        owner.add(mesh);
      }
      const cx = x * w * 0.21,
        cz = z * d * 0.15;
      box(
        packages,
        [w * 0.24, chipHeight, d * 0.19],
        [cx, boardTop + chipHeight / 2, cz],
        "#263138",
        0.17,
      ).name = "ssd-package";
      box(
        pads,
        [w * 0.22, padTop - padBottom, d * 0.17],
        [cx, (padBottom + padTop) / 2, cz],
        "#86a9a4",
        0.1,
      ).name = "ssd-thermal-pad";
    }
  const pcbMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: pcb,
      bevelEnabled: false,
      curveSegments: 16,
    }).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: "#305d50",
      roughness: 0.5,
      metalness: 0.16,
    }),
  );
  pcbMesh.position.y = boardBottom;
  pcbMesh.name = "ssd-pcb";
  pcbMesh.castShadow = pcbMesh.receiveShadow = true;
  board.add(pcbMesh);
  // 尾端的小封装及无标识贴片只说明板面朝向，不定义接口规格。
  box(
    board,
    [w * 0.17, 0.0011, d * 0.1],
    [portX, boardTop + 0.00055, -d * 0.34],
    "#343d43",
    0.2,
  );
  for (let i = 0; i < 4; i++)
    box(
      board,
      [0.0015, 0.0007, 0.003],
      [portX + 0.009 + i * 0.003, boardTop + 0.00035, -d * 0.34],
      "#9b927e",
    );
  const tail = new THREE.Group();
  board.add(tail);
  const tab = new THREE.Mesh(
    new THREE.BoxGeometry(tabWidth, pcb, tabDepth),
    pcbMesh.material,
  );
  tab.name = "ssd-tail-board";
  tab.position.set(portX, boardY, (-boardDepth + tabDepth) / 2);
  tab.castShadow = tab.receiveShadow = true;
  tail.add(tab);
  const connector = new THREE.Group();
  connector.name = "ssd-tail-connector";
  tail.add(connector);
  const nose = -d / 2 - 0.0012;
  box(
    connector,
    [portWidth - 0.0006, 0.0025, -boardDepth / 2 - nose],
    [portX, boardY, (-boardDepth / 2 + nose) / 2],
    "#27333b",
  ).name = "ssd-tail-port";
  const contacts = new THREE.Group();
  contacts.name = "ssd-edge-contact";
  connector.add(contacts);
  for (let i = 0; i < 10; i++)
    box(
      contacts,
      [0.0016, 0.00025, 0.0024],
      [portX + (i - 4.5) * 0.0027, boardY + 0.001375, nose + 0.0012],
      "#ae935b",
    ).name = "ssd-tail-pad";
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
      housing.add(seat);
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
  const [bx, by, bz] = mount.focusDirection;
  registerLayer(board, {
    node: board.name,
    offset: [0, mount.lift, 0],
    direction: [bx, by, bz],
  });
  const boardScope = {
    extractedLayers: [root],
    layerRoot: board,
    selectionPadding: 0.0006,
  };
  registerLayerScope(root, "ssd-tail", {
    ...boardScope,
    moving: tail,
    members: [tail, tailEdges, lip],
    selectedBranch: tail,
    direction: [0.3, 0.56, -1],
  });
  registerLayerScope(root, "ssd-board", {
    ...boardScope,
    moving: board,
    members: [housing, board],
    selectedBranch: board,
  });
  const [tx, ty, tz] = spreader.focusDirection;
  registerLayerScope(root, "ssd-pads", {
    layerRoot: root,
    moving: pads,
    members: [pads, packages],
    selectedBranch: pads,
    selectionPadding: 0.00045,
    direction: [tx, ty, tz],
  });
}
