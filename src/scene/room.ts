import { createFloorGrilles } from "./floor-grilles.ts";
import {
  entranceSettings,
  entranceFixture,
  entranceOpening,
} from "../entrance.ts";
import { buildRoomFixtures } from "./fixtures.ts";
import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { createRoomFloor } from "./room-surfaces.ts";
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
  const surroundings = new THREE.Group();
  room.add(surroundings);
  const occluders: THREE.Group[] = [];
  const structure = (name: string) => {
    const group = new THREE.Group();
    group.name = name;
    surroundings.add(group);
    occluders.push(group);
    return group;
  };
  const [width, height, depth] = definition.room.size;
  const left = -width / 2,
    back = -depth / 2;
  const floorGroup = new THREE.Group();
  room.add(floorGroup);
  box(
    floorGroup,
    [width + 0.1, 0.2, depth + 0.1],
    [0, -0.11, 0],
    "#323a45",
    0.35,
  );
  const floor = createRoomFloor(width, depth);
  floorGroup.add(floor);
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
  const doorX = entranceFixture.position[0],
    doorW = entranceSettings.openingWidth,
    doorH = entranceOpening.top;
  const leftSpan = entranceOpening.left - left,
    rightSpan = width / 2 - entranceOpening.right;
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
  // 门洞内只保留过梁上的墙缝，不能让竖向装饰条悬在通行开口中。
  for (let x = left + 0.3; x < width / 2; x += 1.4) {
    const aboveDoor = x > entranceOpening.left && x < entranceOpening.right;
    const bottom = aboveDoor ? doorH : 0.15;
    const top = height - 0.15;
    surface(
      backWall,
      [0.008, top - bottom, 0.008],
      [x, (top + bottom) / 2, back + 0.09],
      "joint",
    );
  }
  text(backWall, "MIRAGE  /  01", [-2.6, 3.38, back + 0.15], 0.25);
  // 两排机柜前方保留通行与送风格栅，地面线只作空间导向。
  const grilles = createFloorGrilles();
  floorGroup.add(grilles);
  for (const { z } of definition.airflow.floorOutlets) {
    for (const x of [-4.6, 4.6])
      box(floorGroup, [0.018, 0.007, 1.15], [x, 0.058, z], "#6c9da9", 0.1);
  }
  const overheadMounts = [
    ...definition.room.fixtures,
    ...definition.room.lights,
  ]
    .filter(
      (fixture) =>
        fixture.kind === "cable-tray" || fixture.kind === "ceiling-light",
    )
    .map((fixture) => [fixture.mountId, structure(fixture.mountId)] as const);
  const fixtures = buildRoomFixtures(
    new Map([
      ["room-01", surroundings],
      [leftWall.name, leftWall],
      [backWall.name, backWall],
      ...overheadMounts,
    ]),
    box,
    glow,
  );
  return { occluders, fixtures, surroundings, floorGroup, floor, grilles };
}
