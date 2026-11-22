import { registerLayer } from "./assembly-layer.ts";
import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };

type Box = (
  root: THREE.Object3D,
  size: number[],
  position: number[],
  color: string,
  metalness?: number,
) => THREE.Mesh;

const board = definition.parts.find((part) => part.id === "net-board")!;
const asic = definition.parts.find((part) => part.id === "net-asic")!;

/** 控制板后缘避让电源和风扇；板面细节为配置示意，不代表实际电路。 */
export function switchBoard(root: THREE.Group, size: number[], box: Box) {
  const [w, h, d] = size;
  box(root, size, [0, 0, 0], "#294d3f", 0.15).name = "switch-main-board";
  const rear = definition.switchAssembly.boardRearExtension;
  box(
    root,
    [rear.width, h, rear.depth],
    [0, 0, -(d + rear.depth) / 2],
    "#294d3f",
    0.15,
  ).name = "switch-board-rear";
  // 板面安装区按已登记的 ASIC 装配中心绘制，展开后仍可对照落位。
  const [x, , z] = asic.position.map((v, i) => v - board.position[i]);
  const footprint = new THREE.Group();
  footprint.name = "switch-asic-footprint";
  footprint.position.set(x, h / 2, z);
  root.add(footprint);
  for (const dx of [-1, 1]) {
    for (const dz of [-1, 1]) {
      const edgeX = dx * (asic.size[0] / 2 + 0.003);
      const edgeZ = dz * (asic.size[2] / 2 + 0.003);
      box(
        footprint,
        [0.013, 0.0002, 0.0015],
        [edgeX - dx * 0.006, 0.0001, edgeZ],
        "#c7ccb4",
        0.15,
      );
      box(
        footprint,
        [0.0015, 0.0002, 0.013],
        [edgeX, 0.0001, edgeZ - dz * 0.006],
        "#c7ccb4",
        0.15,
      );
    }
  }
  // 低矮元件放在两侧，中央给交换芯片与散热器留出完整安装面。
  for (const side of [-1, 1]) {
    for (const z of [-0.35, 0, 0.35])
      box(
        root,
        [0.024, 0.005, 0.018],
        [side * w * 0.36, h / 2 + 0.0025, z * d],
        "#202829",
        0.1,
      );
    for (const dx of [0, 0.004, 0.008])
      box(
        root,
        [0.0004, 0.0002, d * 0.4],
        [side * (w * 0.28 + dx), h / 2 + 0.0001, d * 0.1],
        "#747b53",
        0.35,
      );
    for (const z of [-1, 1])
      box(
        root,
        [0.004, 0.002, 0.004],
        [side * (w / 2 - 0.008), h / 2 + 0.001, z * (d / 2 - 0.008)],
        "#939ea3",
        0.65,
      );
  }
}

// 沿用 ASIC 一个维护身份，封装、底座与鳍片的接触面可从侧面核对。
export function switchAsic(root: THREE.Group, size: number[], box: Box) {
  const [w, h, d] = size;
  const boardTop = board.position[1] + board.size[1] / 2 - asic.position[1];
  const substrate = 0.002,
    cap = 0.003,
    base = 0.003;
  box(
    root,
    [w * 0.66, substrate, d * 0.66],
    [0, boardTop + substrate / 2, 0],
    "#285742",
    0.22,
  ).name = "asic-substrate";
  box(
    root,
    [w * 0.49, cap, d * 0.49],
    [0, boardTop + substrate + cap / 2, 0],
    "#414c54",
    0.5,
  ).name = "asic-package";
  const bottom = boardTop + substrate + cap;
  const heatsink = new THREE.Group();
  heatsink.name = "asic-heatsink";
  root.add(heatsink);
  box(heatsink, [w, base, d], [0, bottom + base / 2, 0], "#9aa5ac", 0.72).name =
    "asic-sink-base";
  const finHeight = h / 2 - bottom - base;
  for (let i = 0; i < 15; i++)
    box(
      heatsink,
      [w / 40, finHeight, d],
      [w * ((i + 0.5) / 15 - 0.5), bottom + base + finHeight / 2, 0],
      "#939fa9",
      0.8,
    );
  registerLayer(root, {
    node: heatsink.name,
    offset: [0, h * 2.4, 0],
    direction: [0.55, 0.43, 1],
  });
}

// 端口笼与导光组件共用一个维护身份；孔位只描述前部装配外形。
export function switchPortCages(root: THREE.Group, size: number[], box: Box) {
  const [w, h, d] = size;
  const wall = 0.0012;
  root.userData.focusDirection = [0.14, 0.34, 1];
  box(root, [w, wall, d], [0, (-h + wall) / 2, 0], "#85939b", 0.72).name =
    "front-cage-base";
  const guides = definition.switchAssembly.lightGuides;
  const moving = new THREE.Group();
  moving.name = "front-light-guides";
  root.add(moving);
  const guideTop = h / 2 - guides.railHeight;
  const guideBottom = guideTop - guides.height;
  const roofTop = guideBottom - guides.standHeight;
  const front = d / 2,
    lip = 0.0025;
  const roofFront = front - lip - 0.0005;
  const railZ = -d * 0.27,
    railDepth = d * 0.25;

  // 每列一根静态导光条。前端向笼口折下，横梁托住两组各自的导光条。
  const profile = new THREE.Shape();
  profile.moveTo(d / 2, guideBottom);
  profile.lineTo(d / 2, guideTop);
  profile.lineTo(-front + 0.0005, guideTop);
  profile.lineTo(-front, guideTop - 0.0005);
  profile.lineTo(-front, roofTop - wall);
  profile.lineTo(-front + lip, roofTop - wall);
  profile.lineTo(-front + lip, guideBottom);
  profile.closePath();
  const guideGeometry = new THREE.ExtrudeGeometry(profile, {
    depth: guides.width,
    bevelEnabled: false,
  });
  guideGeometry.rotateY(Math.PI / 2);
  guideGeometry.translate(-guides.width / 2, 0, 0);
  const guideMaterial = new THREE.MeshStandardMaterial({
    color: "#9ebeb7",
    metalness: 0.08,
    roughness: 0.32,
  });
  for (const bank of definition.switchAssembly.frontCages) {
    const { columns, width, centerX } = bank;
    const group = new THREE.Group();
    group.position.x = centerX;
    root.add(group);
    const bottom = -h / 2 + wall;
    const top = roofTop - wall;
    // 后衬低于笼口，主板前沿与底座背面在装配态相接。
    box(
      group,
      [width, top - bottom, wall],
      [0, (top + bottom) / 2, (wall - d) / 2],
      "#19242b",
      0.18,
    ).name = "cage-backing";
    box(group, [width, wall, d], [0, (top + bottom) / 2, 0], "#9ba8ad", 0.72);
    box(
      group,
      [width, wall, roofFront + front],
      [0, roofTop - wall / 2, (roofFront - front) / 2],
      "#9ba8ad",
      0.72,
    ).name = "cage-roof";
    for (let column = 0; column <= columns; column++) {
      const x = (width - wall) * (column / columns - 0.5);
      box(
        group,
        [wall, top - bottom, d],
        [x, (top + bottom) / 2, 0],
        "#8d9aa3",
        0.7,
      );
    }
    const comb = new THREE.Group();
    comb.position.x = centerX;
    moving.add(comb);
    box(
      comb,
      [width, guides.railHeight, railDepth],
      [0, guideTop + guides.railHeight / 2, railZ],
      "#647a7f",
    ).name = "guide-carrier";
    for (const sign of [-1, 1]) {
      const height = guideTop - roofTop;
      box(
        group,
        [wall * 2, height, railDepth],
        [sign * (width / 2 - wall), roofTop + height / 2, railZ],
        "#58666b",
      ).name = "guide-stand";
    }
    for (let column = 0; column < columns; column++) {
      const pipe = new THREE.Mesh(guideGeometry, guideMaterial);
      pipe.name = "light-guide";
      pipe.position.x = (width - wall) * ((column + 0.5) / columns - 0.5);
      pipe.castShadow = pipe.receiveShadow = true;
      comb.add(pipe);
    }
  }
  const [x, y, z] = guides.focusDirection;
  registerLayer(root, {
    node: moving.name,
    offset: [0, guides.lift, 0],
    direction: [x, y, z],
  });
}
