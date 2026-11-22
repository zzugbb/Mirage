import * as THREE from "three";
import { storageAssembly } from "../storage-layout.ts";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";
import type { Box } from "./equipment-model.ts";

const mount = storageAssembly.controllerMount;
type Center = [number, number];

// 板面与散热底座按同一组孔心得到贯通孔，局部坐标为 X、Z，厚度沿 +Y。
function plate(
  width: number,
  depth: number,
  thickness: number,
  holes: Center[],
) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -depth / 2);
  shape.lineTo(width / 2, -depth / 2);
  shape.lineTo(width / 2, depth / 2);
  shape.lineTo(-width / 2, depth / 2);
  shape.closePath();
  for (const [x, z] of holes) {
    const hole = new THREE.Path();
    hole.absarc(x, -z, mount.boreRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 16,
  }).rotateX(-Math.PI / 2);
}

function solid(
  root: THREE.Group,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

export function controllerMounts(
  root: THREE.Group,
  pcb: THREE.Group,
  [w, t, d]: number[],
  trayTop: number,
  box: Box,
) {
  const board = new THREE.Group();
  board.name = "controller-pcb";
  pcb.add(board);
  const cw = w * 0.24,
    cd = d * 0.24,
    bottom = -t / 2;
  // 中部、两端和四角拼成同一块板，隔离近看时只显示选中孔所在的板角。
  const green = "#305443";
  const centerWidth = w * 0.61,
    sideWidth = (w - centerWidth) / 2;
  const center = box(
    board,
    [centerWidth, t, d - 2 * cd],
    [0, 0, 0],
    green,
    0.2,
  );
  center.name = "controller-chip-board";
  for (const sign of [-1, 1])
    box(
      board,
      [sideWidth, t, d - 2 * cd],
      [(sign * (centerWidth + sideWidth)) / 2, 0, 0],
      green,
      0.2,
    );
  for (const sign of [-1, 1])
    box(board, [w - 2 * cw, t, cd], [0, 0, (sign * (d - cd)) / 2], green, 0.2);
  const laminate = center.material;
  const brass = new THREE.MeshStandardMaterial({
    color: "#b59a65",
    metalness: 0.58,
    roughness: 0.46,
  });
  const cornerPlate = plate(cw, cd, t, [[0, 0]]);
  const postHeight = bottom - trayTop;
  const footY = -postHeight / 2;
  const shoulder = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0, footY),
      new THREE.Vector2(0.0048, footY),
      new THREE.Vector2(0.0048, footY + 0.0012),
      new THREE.Vector2(0.0035, footY + 0.0016),
      new THREE.Vector2(0.0035, postHeight / 2),
      new THREE.Vector2(0, postHeight / 2),
    ],
    6,
  );
  const pinHeight = t + 0.0011;
  const pinGeometry = new THREE.CylinderGeometry(
    mount.pinRadius * 0.84,
    mount.pinRadius,
    pinHeight,
    24,
  );
  const rimGeometry = new THREE.RingGeometry(
    mount.boreRadius,
    0.0031,
    32,
  ).rotateX(-Math.PI / 2);
  const [dx, dy, dz] = mount.focusDirection;
  registerLayer(pcb, {
    node: pcb.name,
    offset: [0, mount.cornerLift, 0],
    direction: [dx, dy, dz],
  });
  for (const corner of mount.corners) {
    const x = (corner.x * (w - cw)) / 2,
      z = (corner.z * (d - cd)) / 2;
    const patch = solid(
      board,
      "controller-corner-" + corner.id,
      cornerPlate,
      laminate,
      x,
      bottom,
      z,
    );
    const rim = solid(
      pcb,
      "controller-hole-rim",
      rimGeometry,
      brass,
      x,
      t / 2 + 0.000025,
      z,
    );
    const post = solid(
      root,
      "controller-standoff",
      shoulder,
      brass,
      x,
      trayTop + postHeight / 2,
      z,
    );
    const pin = solid(
      root,
      "controller-guide-pin",
      pinGeometry,
      brass,
      x,
      bottom + pinHeight / 2,
      z,
    );
    registerLayerScope(root, corner.id, {
      layerRoot: pcb,
      moving: patch,
      members: [patch, rim, post, pin],
      selectedBranch: patch,
      selectionPadding: 0.0007,
    });
  }
  return center;
}

export function controllerCooler(
  root: THREE.Group,
  pcb: THREE.Group,
  w: number,
  d: number,
  boardTop: number,
  boardArea: THREE.Object3D,
  box: Box,
) {
  const unit = new THREE.Group();
  unit.name = "controller-thermal-assembly";
  unit.position.y = boardTop;
  pcb.add(unit);
  const body = box(
    unit,
    [w * 0.66, 0.0018, d * 0.64],
    [0, 0.0009, 0],
    "#396753",
    0.2,
  );
  body.name = "controller-chip-substrate";
  const lid = box(
    unit,
    [w * 0.5, 0.0022, d * 0.49],
    [0, 0.0029, 0],
    "#929b9d",
    0.55,
  );
  lid.name = "controller-chip-lid";
  const sink = new THREE.Group();
  sink.name = "controller-heatsink";
  unit.add(sink);
  const bottom = 0.004,
    thickness = 0.004;
  const holes: Center[] = [
    [-w * 0.4, -d * 0.39],
    [w * 0.4, d * 0.39],
  ];
  const metal = new THREE.MeshStandardMaterial({
    color: "#9aa7ac",
    metalness: 0.65,
    roughness: 0.44,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: "#bb9d68",
    metalness: 0.58,
    roughness: 0.48,
  });
  solid(
    sink,
    "controller-sink-base",
    plate(w, d, thickness, holes),
    metal,
    0,
    bottom,
    0,
  );
  const shoulder = new THREE.CylinderGeometry(0.0035, 0.0035, bottom, 16);
  const pinH = thickness + 0.001;
  const tip = new THREE.CylinderGeometry(
    mount.pinRadius * 0.85,
    mount.pinRadius,
    pinH,
    24,
  );
  for (const [x, z] of holes) {
    solid(unit, "controller-sink-shoulder", shoulder, brass, x, bottom / 2, z);
    solid(unit, "controller-sink-pin", tip, brass, x, bottom + pinH / 2, z);
  }
  for (let i = -4; i <= 4; i++) {
    // 两个对角留出定位孔，缩短同侧的鳍片仍保持另一端齐平。
    const side = Math.abs(i) >= 3 ? Math.sign(i) : 0;
    const cut = side ? d * 0.24 : 0;
    box(
      sink,
      [0.0025, 0.009, d - cut],
      [(i * w) / 9, bottom + thickness + 0.0045, (-side * cut) / 2],
      "#a4afb6",
      0.67,
    ).name = "controller-sink-fin";
  }
  const [x, y, z] = mount.focusDirection;
  registerLayer(unit, {
    node: sink.name,
    offset: [0, mount.sinkLift, 0],
    direction: [x, y, z],
  });
  registerLayerScope(root, "controller-cooler", {
    layerRoot: unit,
    moving: sink,
    members: [unit, boardArea],
    selectionPadding: 0.001,
    selectedBranch: sink,
  });
}
