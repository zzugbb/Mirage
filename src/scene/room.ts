import { buildRoomFixtures } from "./fixtures";
import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { createRoomFloor } from "./room-surfaces";
type Box = (
  parent: THREE.Object3D,
  size: number[],
  position: number[],
  color: string,
  metalness?: number,
  roughness?: number,
) => THREE.Mesh;
type Text = (
  parent: THREE.Object3D,
  label: string,
  position: number[],
  scale?: number,
) => THREE.Sprite;
/** 原创剖切机房：有真实开口、通道和吊装设施；地面分格以低对比表面纹理表达。 */
export function buildRoomShell(
  room: THREE.Group,
  box: Box,
  glow: Box,
  text: Text,
) {
  const occluders: THREE.Group[] = [];
  const structure = (name: string) => {
    const group = new THREE.Group();
    group.name = name;
    room.add(group);
    occluders.push(group);
    return group;
  };
  const [width, height, depth] = definition.room.size;
  const left = -width / 2,
    back = -depth / 2;
  box(room, [width + 0.1, 0.2, depth + 0.1], [0, -0.11, 0], "#323a45", 0.35);
  room.add(createRoomFloor(width, depth));
  const surface = (
    parent: THREE.Object3D,
    size: number[],
    position: number[],
    kind: keyof typeof definition.rendering.shell,
  ) => {
    const { color, metalness, roughness } = definition.rendering.shell[kind];
    return box(parent, size, position, color, metalness, roughness);
  };
  const leftWall = structure("shell-left-wall");
  // 左墙窗洞：上下梁与四个立柱围出三扇玻璃窗。
  surface(leftWall, [0.16, 0.95, depth], [left, 0.475, 0], "wall");
  surface(leftWall, [0.16, 1.25, depth], [left, height - 0.625, 0], "wall");
  for (const z of [back + 0.1, -2, 2, depth / 2 - 0.1])
    surface(leftWall, [0.18, 2, 0.18], [left, 1.95, z], "frame");
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: "#8ba0b5",
    transparent: true,
    opacity: 0.16,
    roughness: 0.2,
    metalness: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const z of [-4, 0, 4]) {
    const glass = box(leftWall, [0.04, 1.9, 3.76], [left, 1.95, z], "#8ba0b5");
    glass.material = glassMaterial;
    for (const y of [1, 2.9])
      surface(leftWall, [0.19, 0.04, 3.9], [left, y, z], "trim");
  }
  const backWall = structure("shell-back-wall");
  // 后墙的 1.3 米门洞，墙体分段而非贴图。
  const doorX = 4.2,
    doorW = 1.3,
    doorH = 2.5;
  const leftSpan = doorX - doorW / 2 - left,
    rightSpan = width / 2 - (doorX + doorW / 2);
  surface(
    backWall,
    [leftSpan, height, 0.16],
    [left + leftSpan / 2, height / 2, back],
    "wall",
  );
  surface(
    backWall,
    [rightSpan, height, 0.16],
    [width / 2 - rightSpan / 2, height / 2, back],
    "wall",
  );
  surface(
    backWall,
    [doorW, height - doorH, 0.16],
    [doorX, doorH + (height - doorH) / 2, back],
    "wall",
  );
  const door = new THREE.Group();
  door.position.set(doorX - doorW / 2, 0, back + 0.04);
  door.rotation.y = -0.7;
  backWall.add(door);
  box(
    door,
    [doorW - 0.04, doorH - 0.03, 0.055],
    [(doorW - 0.04) / 2, doorH / 2, 0],
    "#3b4859",
    0.5,
  );
  box(door, [0.08, 0.24, 0.045], [1.05, 1.1, 0.05], "#bccad9", 0.85);
  for (let x = left + 0.3; x < width / 2; x += 1.4)
    surface(
      backWall,
      [0.008, height - 0.3, 0.008],
      [x, height / 2, back + 0.09],
      "joint",
    );
  text(backWall, "MIRAGE  /  01", [-2.6, 3.38, back + 0.15], 0.25);
  // 两排机柜前方保留通行与送风格栅，地面线只作空间导向。
  for (const { z } of definition.airflow.floorOutlets) {
    const { startX, step, count } = definition.airflow.floorGrid;
    for (let i = 0; i < count; i++) {
      const x = startX + i * step;
      box(room, [0.44, 0.008, 0.46], [x, 0.052, z], "#27333e", 0.5);
      for (let k = 0; k < 7; k++)
        box(
          room,
          [0.38, 0.009, 0.018],
          [x, 0.06, z - 0.18 + k * 0.06],
          "#69798c",
          0.7,
        );
    }
    for (const x of [-4.6, 4.6])
      box(room, [0.018, 0.007, 1.15], [x, 0.058, z], "#6c9da9", 0.1);
  }
  for (const z of [-1.8, 1.8]) {
    const tray = structure(`shell-tray-${z}`);
    for (const dz of [-0.2, 0.2])
      surface(tray, [9.5, 0.07, 0.035], [0, 3.38, z + dz], "tray");
    for (let x = -4.6; x < 4.7; x += 0.3)
      surface(tray, [0.03, 0.04, 0.42], [x, 3.35, z], "tray");
    for (const x of [-4.4, 4.4])
      surface(tray, [0.025, 0.7, 0.025], [x, 3.76, z], "suspension");
  }
  const fixtures = buildRoomFixtures(
    new Map([
      ["room-01", room],
      [leftWall.name, leftWall],
      [backWall.name, backWall],
    ]),
    box,
  );
  for (const lamp of definition.room.lights) {
    const [x, y, z] = lamp.position;
    const fixture = structure(`shell-light-${x}`);
    box(
      fixture,
      [0.16, 0.07, lamp.length + 0.12],
      [x, y + 0.025, z],
      "#8391a0",
      0.55,
    );
    glow(fixture, [0.105, 0.008, lamp.length], [x, y - 0.016, z], "#d9e7f3");
  }
  return { occluders, fixtures };
}
