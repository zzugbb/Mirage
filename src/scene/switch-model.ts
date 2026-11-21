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
  box(root, [w, base, d], [0, bottom + base / 2, 0], "#9aa5ac", 0.72).name =
    "asic-sink-base";
  const finHeight = h / 2 - bottom - base;
  for (let i = 0; i < 15; i++)
    box(
      root,
      [w / 40, finHeight, d],
      [w * ((i + 0.5) / 15 - 0.5), bottom + base + finHeight / 2, 0],
      "#939fa9",
      0.8,
    );
}
