import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { storageAssembly } from "../storage-layout.ts";
import { registerLayer, registerLayerScope } from "./assembly-layer.ts";

// 孔壁、柱肩与端面各自保留法线，圆周方向仍然平滑。毫米级孔口无需按坐标舍入焊接。
export function steppedLathe(profile: THREE.Vector2[], segments: number) {
  const bands = profile.slice(1).map((next, i) => {
    const band = new THREE.LatheGeometry([profile[i], next], segments);
    band.normalizeNormals();
    return band;
  });
  const geometry = mergeGeometries(bands)!;
  for (const band of bands) band.dispose();
  return geometry;
}

// 局部 Z 轴朝机内，轮毂在负 Z 侧。电机座的孔底、轴套止肩和轴头取同一轴线。
export function storageFanMotor(
  root: THREE.Group,
  radius: number,
  shaftRadius: number,
  thickness: number,
  rotorZ: number,
  material: THREE.Material,
  hardware: THREE.Material,
) {
  const front = rotorZ + thickness * 1.38;
  const depth = thickness * 2;
  const bore = radius * 0.68;
  const cavity = depth * 0.72;
  function turned(
    parent: THREE.Group,
    name: string,
    profile: number[][],
    finish: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(
      steppedLathe(
        profile.map(([r, z]) => new THREE.Vector2(r, z)),
        48,
      ),
      finish,
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = front;
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
  }
  turned(
    root,
    "fan-motor",
    [
      [0, cavity],
      [bore, cavity],
      [bore, depth * 0.08],
      [bore * 1.09, 0],
      [radius * 0.94, 0],
      [radius, depth * 0.09],
      [radius, depth],
      [0, depth],
    ],
    material,
  );
  const spindle = new THREE.Group();
  spindle.name = "fan-spindle";
  root.add(spindle);
  const end = cavity - thickness * 0.16,
    lip = -thickness * 0.3;
  const bronze = new THREE.MeshStandardMaterial({
    color: storageAssembly.fanGuard.pinColor,
    roughness: 0.43,
    metalness: 0.58,
  });
  turned(
    spindle,
    "fan-sleeve",
    [
      [shaftRadius, lip],
      [radius * 0.81, lip],
      [radius * 0.85, lip * 0.72],
      [radius * 0.85, 0],
      [bore * 0.96, 0],
      [bore * 0.96, end - thickness * 0.1],
      [bore * 0.9, end],
      [shaftRadius, end],
      [shaftRadius, lip],
    ],
    bronze,
  );
  const tip = rotorZ - thickness * 0.25 - front;
  turned(
    spindle,
    "fan-shaft",
    [
      [0, tip],
      [shaftRadius * 0.8, tip],
      [shaftRadius, tip + thickness * 0.1],
      [shaftRadius, end],
      [0, end],
    ],
    hardware,
  );
  return front + depth / 2;
}

export function registerStorageFanMount(fan: THREE.Group) {
  const rotor = fan.getObjectByName("fan-rotor")!;
  const spindle = fan.getObjectByName("fan-spindle")!;
  const motor = fan.getObjectByName("fan-motor")!;
  const arms = fan.getObjectsByProperty("name", "fan-support");
  const config = storageAssembly.fanGuard;
  const hub = rotor.getObjectByName("fan-hub")!;
  const frame = fan.getObjectByName("fan-motor-frame")!;
  // 在轮毂背侧观察时保留原叶轮的平移，露出孔口及带轴头的轴套。
  for (const [scope, layerRoot, body, detail, members, setting] of [
    [
      "storage-rotor",
      rotor,
      rotor,
      rotor,
      [rotor, spindle, motor, frame, ...arms],
      config.rotor,
    ],
    ["storage-hub", rotor.parent!, rotor, hub, [hub, spindle], config.hub],
    [
      "storage-spindle",
      spindle,
      spindle,
      spindle,
      [spindle, motor],
      config.spindle,
    ],
  ] as const) {
    const [x, y, z] = setting.focusDirection;
    registerLayer(layerRoot, {
      node: body.name,
      offset: [0, 0, -setting.travel],
      direction: [x, y, z],
    });
    registerLayerScope(fan, scope, {
      extractedLayers: body === rotor ? [fan] : [fan, rotor],
      layerRoot,
      moving: detail,
      members: [...members],
      selectedBranch: detail,
      selectionPadding: 0.00065,
    });
  }
}
