import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { buildParts } from "./parts";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createFloorMaterial } from "./rendering";

export type SceneModel = ReturnType<typeof buildModels>;
const materials = new Map<string, THREE.MeshStandardMaterial>();
function material(color: string, metalness = 0.2, roughness = 0.6) {
  const key = `${color}:${metalness}:${roughness}`;
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshStandardMaterial({ color, metalness, roughness }),
    );
  return materials.get(key)!;
}
export function box(
  parent: THREE.Object3D,
  size: number[],
  position: number[],
  color: string,
  metalness = 0.2,
) {
  const mesh = new THREE.Mesh(
    Math.min(...size) >= 0.02
      ? new RoundedBoxGeometry(
          size[0],
          size[1],
          size[2],
          2,
          Math.min(0.006, Math.min(...size) * 0.1),
        )
      : new THREE.BoxGeometry(...(size as [number, number, number])),
    material(color, metalness),
  );
  mesh.position.fromArray(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function identify(group: THREE.Group, id: string) {
  group.userData.entityId = id;
  return group;
}
function line(parent: THREE.Object3D, points: number[][], color: string) {
  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map((p) => new THREE.Vector3().fromArray(p)),
  );
  const object = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.65 }),
  );
  parent.add(object);
}
function glow(
  parent: THREE.Object3D,
  size: number[],
  position: number[],
  color = "#72e7d5",
) {
  const object = box(parent, size, position, color);
  object.material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 2,
    toneMapped: false,
  });
  return object;
}
export function text(
  parent: THREE.Object3D,
  label: string,
  position: number[],
  scale = 0.6,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#bac1c9";
  ctx.font = "500 52px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, 256, 82);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    }),
  );
  sprite.position.fromArray(position);
  sprite.scale.set(scale * 4, scale, 1);
  parent.add(sprite);
  return sprite;
}

export function buildModels() {
  // 生成器为技术代码；场景尺寸、构图与装配编排由登记的原创资产定义。
  const root = new THREE.Group();
  const room = identify(new THREE.Group(), "room-01");
  root.add(room);
  const [width, height, depth] = definition.room.size;
  box(room, [width + 0.15, 0.22, depth + 0.15], [0, -0.12, 0], "#555b60", 0.5);
  const floorMaterial = createFloorMaterial();
  for (let x = -3.75; x < 4; x += 0.5)
    for (let z = -2.75; z < 3; z += 0.5) {
      const tile = box(
        room,
        [
          0.5 - definition.rendering.floor.gap,
          0.055,
          0.5 - definition.rendering.floor.gap,
        ],
        [x, 0.025, z],
        Math.round(x * 2 + z * 2) % 3 === 0 ? "#777b7e" : "#7a7e81",
        0.35,
      );
      tile.geometry.dispose();
      tile.geometry = new RoundedBoxGeometry(
        0.5 - definition.rendering.floor.gap,
        0.055,
        0.5 - definition.rendering.floor.gap,
        1,
        0.0008,
      );
      tile.material = floorMaterial;
    }
  for (const x of [-4, 4])
    box(room, [0.025, 0.012, 6], [x, 0.065, 0], "#72777c", 0.7);
  // 左侧实体墙与真实窗洞；后侧门洞采用分段墙体，不用贴图冒充开口。
  box(room, [0.14, 0.9, depth], [-4, 0.45, 0], "#a9a8a3");
  box(room, [0.14, 0.75, depth], [-4, height - 0.375, 0], "#a9a8a3");
  for (const z of [-2.9, 0, 2.9])
    box(room, [0.14, 1.55, 0.18], [-4, 1.675, z], "#a9a8a3");
  for (const z of [-1.45, 1.45]) {
    const glass = box(room, [0.05, 1.48, 2.65], [-4, 1.675, z], "#c0c7c9", 0.4);
    glass.material = new THREE.MeshPhysicalMaterial({
      color: "#b3bec5",
      transparent: true,
      opacity: 0.24,
      roughness: 0.15,
      metalness: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (const y of [0.94, 2.42])
      box(room, [0.18, 0.055, 2.78], [-3.98, y, z], "#6c7074");
    for (const dz of [-1.37, 0, 1.37])
      box(room, [0.18, 1.55, 0.055], [-3.98, 1.675, z + dz], "#6c7074");
  }
  box(room, [5.4, height, 0.14], [-1.3, height / 2, -3], "#a9a8a3");
  box(room, [1.4, height, 0.14], [3.3, height / 2, -3], "#a9a8a3");
  box(room, [1.2, 0.8, 0.14], [2, 2.8, -3], "#a9a8a3");
  const door = new THREE.Group();
  door.position.set(1.4, 0, -2.98);
  door.rotation.y = -Math.PI / 3;
  room.add(door);
  box(door, [1.16, 2.36, 0.055], [0.58, 1.18, 0], "#4b5058", 0.45);
  box(door, [0.1, 0.25, 0.06], [1, 1.1, 0.05], "#bdd3d9", 0.8);
  glow(room, [0.45, 0.07, 0.04], [2, 2.6, -2.91]);
  for (const x of [-3.9, 3.9])
    box(
      room,
      [0.12, height + 0.03, 0.2],
      [x, height / 2, -2.9],
      "#777b7e",
      0.5,
    );
  glow(room, [5.8, 0.026, 0.03], [-0.9, 2.9, -2.9], "#f0eee6");
  text(room, "MIRAGE / 01", [-1.5, 2.55, -2.85], 0.18);
  // 冷通道与导流格栅。
  for (const x of [-0.5, 0, 0.5])
    for (let z = 0.75; z <= 1.75; z += 0.5) {
      for (let k = 0; k < 9; k++)
        box(
          room,
          [0.42, 0.007, 0.014],
          [x, 0.058, z - 0.2 + k * 0.05],
          "#203b47",
        );
    }
  line(
    room,
    [
      [-0.75, 0.063, 0.6],
      [-0.75, 0.063, 2.1],
      [0.75, 0.063, 2.1],
      [0.75, 0.063, 0.6],
    ],
    "#42b2ac",
  );
  // 墙板分缝、架空线槽与悬吊灯具，补足空间尺度和设施层次。
  for (let x = -3.7; x < 1.3; x += 1.25)
    box(room, [0.012, 3, 0.006], [x, 1.55, -2.923], "#696d70");
  for (const y of [0.3, 2.5])
    box(room, [5.2, 0.012, 0.006], [-1.3, y, -2.923], "#7b7e7f");
  for (const z of [-1.1, -0.75])
    box(room, [5.5, 0.055, 0.025], [-0.5, 2.85, z], "#5d6268", 0.7);
  for (let x = -3.15; x < 2.2; x += 0.22)
    box(room, [0.023, 0.026, 0.35], [x, 2.83, -0.925], "#7b8084", 0.65);
  for (const x of [-2.4, 1.7]) {
    for (const z of [-1.9, 0.8])
      box(room, [0.012, 0.27, 0.012], [x, 3, z], "#8b8e8f", 0.7);
    box(room, [0.14, 0.055, 3.2], [x, 2.87, -0.55], "#888d91", 0.5);
    glow(room, [0.095, 0.008, 3.05], [x, 2.836, -0.55], "#e1ddd1");
  }
  const facilities = new Map<string, THREE.Group>();
  const fans: THREE.Group[] = [];
  for (const config of definition.facilities) {
    const group = identify(new THREE.Group(), config.id);
    group.position.fromArray(config.position);
    room.add(group);
    facilities.set(config.id, group);
    box(group, config.size, [0, 0, 0], config.color, 0.45);
    box(
      group,
      [config.size[0] - 0.1, config.size[1] - 0.2, 0.03],
      [0, 0, config.size[2] / 2 + 0.02],
      "#2c4653",
    );
    if (config.id === "cooling-01") {
      for (let y = -0.7; y <= 0.7; y += 0.065)
        box(group, [0.83, 0.022, 0.04], [0, y, 0.36], "#72929f", 0.7);
      const rotor = new THREE.Group();
      rotor.position.set(0, 0.96, 0);
      group.add(rotor);
      fans.push(rotor);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.23, 0.016, 8, 32),
        material("#263e49"),
      );
      ring.rotation.x = Math.PI / 2;
      rotor.add(ring);
      for (let k = 0; k < 5; k++) {
        const blade = box(rotor, [0.07, 0.02, 0.2], [0, 0, 0], "#355562");
        blade.rotation.y = (k * Math.PI * 2) / 5;
        blade.position.set(
          Math.sin(blade.rotation.y) * 0.09,
          0,
          Math.cos(blade.rotation.y) * 0.09,
        );
      }
    } else {
      box(group, [0.3, 0.19, 0.04], [0, 0.4, 0.28], "#0e2938");
      for (let k = -1; k <= 1; k++)
        glow(
          group,
          [0.045, 0.045, 0.025],
          [k * 0.11, 0.15, 0.3],
          k === 1 ? "#dfac62" : "#6dd6c0",
        );
      box(group, [0.035, 0.3, 0.04], [0.28, -0.05, 0.3], "#abc4ca", 0.8);
    }
  }
  const rack = identify(new THREE.Group(), definition.rack.id);
  root.add(rack);
  const [rw, rh, rd] = definition.rack.size;
  box(rack, [rw, 0.1, rd], [0, 0.12, 0], "#23272c", 0.7);
  const rubber = new THREE.MeshStandardMaterial({
    color: "#202227",
    roughness: 0.94,
    metalness: 0,
  });
  for (const x of [-0.25, 0.25])
    for (const z of [-0.45, 0.45]) {
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.025, 0.026, 16),
        rubber,
      );
      foot.position.set(x, 0.0655, z);
      foot.castShadow = true;
      foot.receiveShadow = true;
      rack.add(foot);
      box(rack, [0.016, 0.035, 0.016], [x, 0.09, z], "#8b939c", 0.8);
    }

  box(rack, [rw, 0.065, rd], [0, rh, 0], "#3f454c", 0.7);
  for (const x of [-rw / 2 + 0.025, rw / 2 - 0.025])
    for (const z of [-rd / 2 + 0.025, rd / 2 - 0.025])
      box(rack, [0.045, rh, 0.045], [x, rh / 2 + 0.05, z], "#5d6369", 0.8);
  for (const x of [-rw / 2, rw / 2])
    box(
      rack,
      [0.025, rh - 0.1, rd - 0.05],
      [x, rh / 2 + 0.05, 0],
      "#24272b",
      0.45,
    );
  box(
    rack,
    [rw - 0.06, rh - 0.1, 0.025],
    [0, rh / 2 + 0.05, -rd / 2],
    "#1d2024",
    0.55,
  );
  for (let u = 1; u <= 42; u++) {
    const y = definition.rack.unitOrigin + u * definition.rack.unitPitch;
    for (const x of [-0.25, 0.25])
      box(rack, [0.015, 0.012, 0.025], [x, y, 0.52], "#70767d", 0.7);
    if (![23, 24, 34, 35].includes(u)) {
      box(rack, [0.465, 0.04, 0.025], [0, y, 0.5], "#282c31", 0.65);
      for (const x of [-0.14, -0.06, 0.02, 0.1])
        box(rack, [0.045, 0.008, 0.006], [x, y, 0.517], "#5d6369");
    }
  }
  for (const x of [-0.3, 0.3])
    glow(rack, [0.008, 2, 0.012], [x, 1.1, 0.55], "#4f565e");
  text(rack, "A01", [0, 2.36, 0], 0.1).name = "rack-label";
  // 可透视的冲孔钢网门；孔洞通过规则透明度图实现，尺寸仍为真实米制。
  const perforation = document.createElement("canvas");
  perforation.width = 64;
  perforation.height = 64;
  const pattern = perforation.getContext("2d")!;
  pattern.fillStyle = "#fff";
  pattern.fillRect(0, 0, 64, 64);
  pattern.fillStyle = "#000";
  for (const [x, y] of [
    [16, 16],
    [48, 16],
    [0, 48],
    [32, 48],
    [64, 48],
  ]) {
    pattern.beginPath();
    pattern.arc(x, y, 11, 0, Math.PI * 2);
    pattern.fill();
  }
  const holes = new THREE.CanvasTexture(perforation);
  holes.wrapS = holes.wrapT = THREE.RepeatWrapping;
  holes.repeat.set(24, 84);
  const steelDoor = new THREE.Mesh(
    new THREE.PlaneGeometry(0.51, 1.89),
    new THREE.MeshStandardMaterial({
      color: "#32363b",
      metalness: 0.65,
      roughness: 0.45,
      alphaMap: holes,
      alphaTest: 0.5,
      alphaToCoverage: true,
      side: THREE.DoubleSide,
    }),
  );
  const rackDoor = new THREE.Group();
  rackDoor.name = "rack-door";
  rackDoor.position.set(-0.285, 0, 0.57);
  rack.add(rackDoor);
  steelDoor.position.set(0.285, 1.1, 0);
  steelDoor.castShadow = true;
  rackDoor.add(steelDoor);
  for (const x of [-0.277, 0.277])
    box(
      rackDoor,
      [0.025, 1.99, 0.025],
      [x + 0.285, 1.1, 0.005],
      "#282c31",
      0.65,
    );
  for (const y of [0.115, 2.085])
    box(rackDoor, [0.57, 0.034, 0.025], [0.285, y, 0.005], "#282c31", 0.65);
  box(rackDoor, [0.018, 0.22, 0.035], [0.512, 1.1, 0.037], "#72777e", 0.85);
  for (const y of [0.45, 1.72])
    box(rack, [0.025, 0.065, 0.035], [-0.28, y, 0.59], "#777b80", 0.8);
  for (let z = -0.43; z < 0.4; z += 0.032)
    box(rack, [0.35, 0.002, 0.006], [0, 2.135, z], "#15171b");
  const rackSlide = new THREE.Group();
  rack.add(rackSlide);
  const railMount = new THREE.Group();
  rack.add(railMount);
  for (const x of [-0.251, 0.251]) {
    box(
      railMount,
      [0.014, 0.024, 0.83],
      [x, definition.server.position[1] - 0.024, 0.07],
      "#8e969f",
      0.8,
    );
    box(
      rackSlide,
      [0.008, 0.014, 0.67],
      [x, definition.server.position[1] - 0.018, 0.08],
      "#a8afb5",
      0.85,
    );
  }
  const server = identify(new THREE.Group(), definition.server.id);
  server.position.fromArray(definition.server.position);
  root.add(server);
  box(server, [0.46, 0.009, 0.78], [0, -0.047, 0], "#8fabb7", 0.75);
  for (const x of [-0.23, 0.23])
    box(server, [0.008, 0.089, 0.78], [x, 0, 0], "#7c96a3", 0.7);
  for (const z of [-0.39, 0.39])
    box(server, [0.46, 0.019, 0.008], [0, -0.028, z], "#78929f", 0.7);
  for (const x of [-0.248, 0.248])
    box(server, [0.028, 0.085, 0.018], [x, 0, 0.396], "#355c6d", 0.8);
  const assembly = buildParts(server, box, glow);
  for (const x of [-0.232, 0.232])
    glow(server, [0.002, 0.002, 0.77], [x, 0.041, 0], "#757c84");
  const selection = new THREE.Box3Helper(new THREE.Box3(), "#b5c9e2");
  root.add(selection);
  selection.visible = false;
  return {
    root,
    room,
    rack,
    rackDoor,
    rackSlide,
    railMount,
    server,
    facilities,
    fans,
    selection,
    parts: assembly.groups,
    rotors: assembly.rotors,
  };
}

export function disposeModels(root: THREE.Object3D, shared = true) {
  const geometry = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (
      object instanceof THREE.DirectionalLight ||
      object instanceof THREE.PointLight ||
      object instanceof THREE.SpotLight
    )
      object.shadow.dispose();
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.Sprite
    ) {
      if ("geometry" in object) geometry.add(object.geometry);
      for (const mat of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        mats.add(mat);
        for (const value of Object.values(mat))
          if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  if (shared) for (const material of materials.values()) mats.add(material);
  geometry.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
  if (shared) materials.clear();
}
