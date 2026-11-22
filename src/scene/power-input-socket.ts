import * as THREE from "three";
import type definition from "../../assets/public/scenes/room-01.json";
import type { Box } from "./equipment-model.ts";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";

type Inlet = typeof definition.storageAssembly.powerTray.inputSocket;

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
  function plate(
    parent: THREE.Group,
    name: string,
    outside: THREE.Vector2[],
    hole: THREE.Vector2[] | undefined,
    length: number,
    z: number,
    material: THREE.Material,
  ) {
    const shape = new THREE.Shape(outside);
    if (hole) shape.holes.push(new THREE.Path(hole));
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
    aperture,
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
    inner,
    wall,
    face - wall,
    black,
  );
  plate(cartridge, "psu-input-sleeve", outer, inner, depth - wall, face, black);
  plate(
    cartridge,
    "psu-input-backing",
    outer,
    undefined,
    wall,
    face + depth - wall,
    black,
  );
  // 三个静态片件只用于辨认凹腔和朝向。
  for (const [x, y] of [
    [-0.22, -0.12],
    [0.22, -0.12],
    [0, 0.22],
  ])
    box(
      cartridge,
      [width * 0.07, height * 0.17, depth * 0.55],
      [width * x, height * y, face + depth - wall - depth * 0.275],
      "#c4b590",
      0.55,
    ).name = "psu-input-blade";
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
