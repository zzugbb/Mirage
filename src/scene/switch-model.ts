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

// 两件电源共用机后观察方向；壳体、输入面板和拉手归属同一个维护部件。
export function switchPowerSupply(root: THREE.Group, size: number[], box: Box) {
  const [w, h, d] = size;
  const rear = -d / 2;
  root.userData.focusDirection = [0.14, 0.55, -1];
  box(root, [w * 0.96, h * 0.92, d], [0, 0, 0], "#87949c", 0.72);
  box(root, [w, h, 0.003], [0, 0, rear], "#53616a", 0.62).name =
    "psu-rear-panel";
  const inletX = -w * 0.13;
  box(
    root,
    [w * 0.44, h * 0.5, 0.003],
    [inletX, 0, rear - 0.003],
    "#242d33",
    0.2,
  );
  box(
    root,
    [w * 0.34, h * 0.35, 0.001],
    [inletX, 0, rear - 0.0046],
    "#121b20",
    0.12,
  );
  for (const sign of [-1, 1]) {
    box(
      root,
      [w * 0.43, 0.0016, 0.001],
      [inletX, sign * h * 0.36, rear - 0.002],
      "#20292e",
      0.18,
    );
    box(
      root,
      [0.004, 0.004, 0.012],
      [w * 0.32, sign * h * 0.28, rear - 0.006],
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
    root,
    [0.005, h * 0.56 + 0.004, 0.003],
    [w * 0.32, 0, rear - 0.012],
    "#9ba88f",
    0.48,
  );
  // 上盖压筋沿抽取方向排列，保持 1U 外廓。
  for (const x of [-0.23, 0.23])
    box(
      root,
      [w * 0.055, 0.0012, d * 0.65],
      [w * x, h * 0.46, 0.002],
      "#a6b0b6",
      0.7,
    );
}
