import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { createFloorMaterial } from "./rendering";
type Box = (
  parent: THREE.Object3D,
  size: number[],
  position: number[],
  color: string,
  metalness?: number,
) => THREE.Mesh;
type Text = (
  parent: THREE.Object3D,
  label: string,
  position: number[],
  scale?: number,
) => THREE.Sprite;
/** 原创剖切机房：有真实开口、通道和吊装设施；远景地砖共用一次实例绘制。 */
export function buildRoomShell(
  room: THREE.Group,
  box: Box,
  glow: Box,
  text: Text,
) {
  const [width, height, depth] = definition.room.size;
  const left = -width / 2,
    back = -depth / 2;
  box(room, [width + 0.1, 0.2, depth + 0.1], [0, -0.11, 0], "#323a45", 0.35);
  const tile = new THREE.BoxGeometry(0.496, 0.045, 0.496);
  const floor = new THREE.InstancedMesh(
    tile,
    createFloorMaterial(),
    width * depth * 4,
  );
  const transform = new THREE.Matrix4();
  let index = 0;
  for (let x = left + 0.25; x < width / 2; x += 0.5)
    for (let z = back + 0.25; z < depth / 2; z += 0.5) {
      transform.makeTranslation(x, 0.022, z);
      floor.setMatrixAt(index++, transform);
    }
  floor.receiveShadow = true;
  room.add(floor);
  // 左墙窗洞：上下梁与四个立柱围出三扇玻璃窗。
  box(room, [0.16, 0.95, depth], [left, 0.475, 0], "#77828e");
  box(room, [0.16, 1.25, depth], [left, height - 0.625, 0], "#77828e");
  for (const z of [back + 0.1, -2, 2, depth / 2 - 0.1])
    box(room, [0.18, 2, 0.18], [left, 1.95, z], "#667382", 0.3);
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
    const glass = box(room, [0.04, 1.9, 3.76], [left, 1.95, z], "#8ba0b5");
    glass.material = glassMaterial;
    for (const y of [1, 2.9])
      box(room, [0.19, 0.04, 3.9], [left, y, z], "#9aa7b7", 0.6);
  }
  // 后墙的 1.3 米门洞，墙体分段而非贴图。
  const doorX = 4.2,
    doorW = 1.3,
    doorH = 2.5;
  const leftSpan = doorX - doorW / 2 - left,
    rightSpan = width / 2 - (doorX + doorW / 2);
  box(
    room,
    [leftSpan, height, 0.16],
    [left + leftSpan / 2, height / 2, back],
    "#7b8792",
  );
  box(
    room,
    [rightSpan, height, 0.16],
    [width / 2 - rightSpan / 2, height / 2, back],
    "#7b8792",
  );
  box(
    room,
    [doorW, height - doorH, 0.16],
    [doorX, doorH + (height - doorH) / 2, back],
    "#7b8792",
  );
  const door = new THREE.Group();
  door.position.set(doorX - doorW / 2, 0, back + 0.04);
  door.rotation.y = -0.7;
  room.add(door);
  box(
    door,
    [doorW - 0.04, doorH - 0.03, 0.055],
    [(doorW - 0.04) / 2, doorH / 2, 0],
    "#3b4859",
    0.5,
  );
  box(door, [0.08, 0.24, 0.045], [1.05, 1.1, 0.05], "#bccad9", 0.85);
  for (let x = left + 0.3; x < width / 2; x += 1.4)
    box(
      room,
      [0.008, height - 0.3, 0.008],
      [x, height / 2, back + 0.09],
      "#5b6877",
    );
  text(room, "MIRAGE  /  01", [-2.6, 3.38, back + 0.15], 0.25);
  // 两排机柜前方保留通行与送风格栅，地面线只作空间导向。
  for (const z of [3.05, -0.55]) {
    for (let x = -4.1; x < 4.2; x += 0.5) {
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
    for (const dz of [-0.2, 0.2])
      box(room, [9.5, 0.07, 0.035], [0, 3.38, z + dz], "#465364", 0.7);
    for (let x = -4.6; x < 4.7; x += 0.3)
      box(room, [0.03, 0.04, 0.42], [x, 3.35, z], "#667486", 0.7);
    for (const x of [-4.4, 4.4])
      box(room, [0.025, 0.7, 0.025], [x, 3.76, z], "#7d8b9c", 0.7);
  }
  // 结构设施：仅表示布置，不带状态灯、数值或监测覆盖推断。
  for (const fixture of definition.room.fixtures) {
    const group = new THREE.Group();
    group.name = fixture.id;
    group.position.fromArray(fixture.position);
    group.userData = { fixtureId: fixture.id, dataStatus: fixture.dataStatus };
    room.add(group);
    if (fixture.kind === "smoke") {
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.085, 0.055, 16),
        new THREE.MeshStandardMaterial({ color: "#d2d6d4", roughness: 0.65 }),
      );
      group.add(shell);
      box(group, [0.08, 0.02, 0.06], [0, -0.035, 0], "#697577");
      box(group, [0.025, 0.5, 0.025], [0, 0.26, 0], "#58676d", 0.5);
    } else if (fixture.kind === "access") {
      box(group, [0.13, 0.23, 0.055], [0, 0, 0], "#26383d", 0.3);
      box(group, [0.085, 0.07, 0.008], [0, 0.04, 0.031], "#7d9697");
      box(group, [0.045, 0.045, 0.009], [0, -0.055, 0.032], "#131e23");
    } else {
      box(group, [0.065, 0.16, 0.11], [0, 0, 0], "#ccd4d0");
      for (let k = 0; k < 4; k++)
        box(
          group,
          [0.008, 0.008, 0.07],
          [0.036, -0.04 + k * 0.025, 0],
          "#52686e",
        );
    }
  }
  for (const lamp of definition.room.lights) {
    const [x, y, z] = lamp.position;
    box(
      room,
      [0.16, 0.07, lamp.length + 0.12],
      [x, y + 0.025, z],
      "#8391a0",
      0.55,
    );
    glow(room, [0.105, 0.008, lamp.length], [x, y - 0.016, z], "#d9e7f3");
  }
}
