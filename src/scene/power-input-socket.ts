import * as THREE from "three";
import type definition from "../../assets/public/scenes/room-01.json";
import type { Box } from "./equipment-model.ts";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";

type SwitchInlet = typeof definition.switchAssembly.powerTray.inputSocket;
type Inlet =
  SwitchInlet | typeof definition.storageAssembly.powerTray.inputSocket;

// 面板孔、座身和法兰共用削角轮廓；从机后沿 -Z 抽出。
function outline(width: number, height: number, bevel: number) {
  const x = width / 2,
    y = height / 2;
  return [
    new THREE.Vector2(-x, -y),
    new THREE.Vector2(x, -y),
    new THREE.Vector2(x, y - bevel),
    new THREE.Vector2(x - bevel, y),
    new THREE.Vector2(-x, y),
  ];
}

function plate(
  parent: THREE.Group,
  name: string,
  outside: THREE.Vector2[],
  holes: THREE.Vector2[][],
  length: number,
  z: number,
  material: THREE.Material,
) {
  const shape = new THREE.Shape(outside);
  for (const hole of holes) shape.holes.push(new THREE.Path(hole));
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false }),
    material,
  );
  mesh.name = name;
  mesh.position.z = z;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function powerInputSocket(
  root: THREE.Group,
  fascia: THREE.Group,
  box: Box,
  config: Inlet,
  w: number,
  h: number,
  rear: number,
  inletX: number,
) {
  const { width, height, bevel, clearance, wall, depth, travel } = config;
  const panelThickness = 0.003,
    face = -panelThickness / 2;
  const black = new THREE.MeshStandardMaterial({
    color: "#35444c",
    roughness: 0.55,
  });
  const mount = new THREE.Group();
  mount.position.z = rear;
  fascia.add(mount);
  const aperture = outline(
    width + 2 * clearance,
    height + 2 * clearance,
    bevel,
  ).map((point) => new THREE.Vector2(point.x + inletX, point.y));
  plate(
    mount,
    "psu-rear-panel",
    new THREE.Shape()
      .moveTo(-w / 2, -h / 2)
      .lineTo(w / 2, -h / 2)
      .lineTo(w / 2, h / 2)
      .lineTo(-w / 2, h / 2)
      .getPoints(),
    [aperture],
    panelThickness,
    face,
    new THREE.MeshStandardMaterial({
      color: "#53616a",
      metalness: 0.62,
      roughness: 0.4,
    }),
  );
  const slot = new THREE.Group();
  slot.position.x = inletX;
  mount.add(slot);
  const cartridge = new THREE.Group();
  cartridge.name = "psu-input-cartridge";
  slot.add(cartridge);
  const outer = outline(width, height, bevel),
    inner = outline(width - 2 * wall, height - 2 * wall, bevel - wall / 2);
  plate(
    cartridge,
    "psu-input-flange",
    outline(width + 4 * wall, height + 4 * wall, bevel + wall),
    [inner],
    wall,
    face - wall,
    black,
  );
  plate(
    cartridge,
    "psu-input-sleeve",
    outer,
    [inner],
    depth - wall,
    face,
    black,
  );
  buildInputCore(root, slot, cartridge, config, face, box);
  const [x, y, z] = config.focusDirection;
  registerLayer(slot, {
    node: cartridge.name,
    offset: [0, 0, -travel],
    direction: [x, y, z],
  });
  registerLayerScope(root, "input-panel", {
    layerRoot: slot,
    moving: cartridge,
    members: [fascia],
    selectedBranch: cartridge,
    selectionPadding: 0.0007,
  });
}

// 绝缘芯座从套筒背面装入，前段与削角内腔配合，后肩止于套口。
function buildInputCore(
  root: THREE.Group,
  slot: THREE.Group,
  cartridge: THREE.Group,
  config: SwitchInlet,
  face: number,
  box: Box,
) {
  const { width, height, bevel, wall, depth, clearance, core: fit } = config;
  const core = new THREE.Group(),
    terminals = new THREE.Group();
  core.name = "psu-input-core";
  terminals.name = "psu-input-terminals";
  cartridge.add(core);
  core.add(terminals);
  const back = face + depth - wall;
  const nose = back - 1.65 * wall;
  const shoulderEnd = back + wall;
  const tip = face + wall * 0.6;
  const insulator = new THREE.MeshStandardMaterial({
    color: "#778587",
    roughness: 0.68,
  });
  const layouts = [
    { x: -width * 0.23, y: -height * 0.17, w: wall * 1.04, h: height * 0.23 },
    { x: width * 0.23, y: -height * 0.17, w: wall * 1.04, h: height * 0.23 },
    { x: 0, y: height * 0.23, w: width * 0.2, h: wall * 1.04 },
  ];
  const holes = layouts.map(({ x, y, w, h }) => {
    const halfW = w / 2 + clearance * 0.38,
      halfH = h / 2 + clearance * 0.38;
    return [
      new THREE.Vector2(x - halfW, y - halfH),
      new THREE.Vector2(x + halfW, y - halfH),
      new THREE.Vector2(x + halfW, y + halfH),
      new THREE.Vector2(x - halfW, y + halfH),
    ];
  });
  const gap = wall + clearance * 0.48;
  plate(
    core,
    "psu-core-key",
    outline(width - 2 * gap, height - 2 * gap, bevel - wall / 2),
    holes,
    back - nose,
    nose,
    insulator,
  );
  plate(
    core,
    "psu-core-shoulder",
    outline(width, height, bevel),
    holes,
    wall,
    back,
    insulator,
  );
  // 一只绝缘压板同时承载两竖一横的片件，底面合回芯座后侧。
  const keeperDepth = wall * 0.82;
  const keeperShape = new THREE.Shape();
  const halfW = width * 0.33,
    bottom = -height * 0.33,
    step = -height * 0.01,
    top = height * 0.32,
    neck = width * 0.15;
  keeperShape.moveTo(-halfW, bottom);
  for (const [x, y] of [
    [halfW, bottom],
    [halfW, step],
    [neck, step],
    [neck, top],
    [-neck, top],
    [-neck, step],
    [-halfW, step],
  ])
    keeperShape.lineTo(x, y);
  keeperShape.closePath();
  plate(
    terminals,
    "psu-blade-keeper",
    keeperShape.getPoints(),
    [],
    keeperDepth,
    shoulderEnd,
    new THREE.MeshStandardMaterial({ color: "#4b626b", roughness: 0.58 }),
  );
  for (const { x, y, w, h } of layouts) {
    box(
      terminals,
      [w, h, shoulderEnd - tip],
      [x, y, (tip + shoulderEnd) / 2],
      "#cbb183",
      0.55,
    ).name = "psu-input-blade";
  }
  const [cx, cy, cz] = fit.direction,
    [tx, ty, tz] = fit.bladeDirection;
  registerLayer(core, {
    node: core.name,
    offset: [0, 0, fit.travel],
    direction: [cx, cy, cz],
  });
  registerLayer(terminals, {
    node: terminals.name,
    offset: [0, 0, fit.bladeTravel],
    direction: [tx, ty, tz],
  });
  registerLayerScope(root, "input-core", {
    layerRoot: core,
    extractedLayers: [slot],
    moving: core,
    members: [cartridge],
    selectedBranch: core,
    selectionPadding: 0.0003,
  });
  registerLayerScope(root, "input-blades", {
    layerRoot: terminals,
    extractedLayers: [slot, core],
    moving: terminals,
    members: [core],
    selectedBranch: terminals,
    selectionPadding: 0.0003,
  });
}
