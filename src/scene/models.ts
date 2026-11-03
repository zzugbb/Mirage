import { createRackBlanking } from "./rack-blanking";
import { SelectionCorners } from "./selection";
import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { createEquipmentAssembly } from "./equipment-model";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { buildRoomShell } from "./room";
import { powerSettings, pdus } from "../power-config.ts";

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
  roughness = 0.6,
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
    material(color, metalness, roughness),
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
  const { occluders: shellOccluders, fixtures } = buildRoomShell(
    room,
    box,
    glow,
    text,
  );
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
  const rearShell = new THREE.Group();
  rearShell.name = "rack-rear-shell";
  rack.add(rearShell);
  for (const x of [-rw / 2 + 0.025, rw / 2 - 0.025])
    for (const z of [-rd / 2 + 0.025, rd / 2 - 0.025])
      box(
        z < 0 ? rearShell : rack,
        [0.045, rh, 0.045],
        [x, rh / 2 + 0.05, z],
        "#5d6369",
        0.8,
      );
  for (const x of [-rw / 2, rw / 2])
    box(
      rack,
      [0.025, rh - 0.1, rd - 0.05],
      [x, rh / 2 + 0.05, 0],
      "#24272b",
      0.45,
    );
  box(
    rearShell,
    [rw - 0.06, rh - 0.1, 0.025],
    [0, rh / 2 + 0.05, -rd / 2],
    "#1d2024",
    0.55,
  );
  for (let u = 1; u <= definition.rack.units; u++) {
    const y = definition.rack.unitOrigin + u * definition.rack.unitPitch;
    for (const x of [-0.25, 0.25])
      box(rack, [0.015, 0.012, 0.025], [x, y, 0.52], "#70767d", 0.7);
  }
  rack.add(createRackBlanking(definition.rack.id));
  for (const x of [-0.3, 0.3])
    glow(rack, [0.008, rh - 0.1, 0.012], [x, rh / 2 + 0.05, 0.55], "#4f565e");
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
    new THREE.PlaneGeometry(0.51, rh - 0.21),
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
  steelDoor.position.set(0.285, rh / 2 + 0.05, 0);
  steelDoor.castShadow = true;
  rackDoor.add(steelDoor);
  for (const x of [-0.277, 0.277])
    box(
      rackDoor,
      [0.025, rh - 0.11, 0.025],
      [x + 0.285, rh / 2 + 0.05, 0.005],
      "#282c31",
      0.65,
    );
  for (const y of [0.115, rh - 0.015])
    box(rackDoor, [0.57, 0.034, 0.025], [0.285, y, 0.005], "#282c31", 0.65);
  box(
    rackDoor,
    [0.018, 0.22, 0.035],
    [0.512, rh / 2 + 0.05, 0.037],
    "#72777e",
    0.85,
  );
  for (const y of [0.45, 1.72])
    box(rack, [0.025, 0.065, 0.035], [-0.28, y, 0.59], "#777b80", 0.8);
  for (let z = -0.43; z < 0.4; z += 0.032)
    box(rack, [0.35, 0.002, 0.006], [0, rh + 0.035, z], "#15171b");
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
  for (const [index, feed] of (["A", "B"] as const).entries()) {
    const pdu = new THREE.Group();
    pdu.name = `pdu-${feed}`;
    pdu.userData.entityId = pdus.find(
      (pdu) => pdu.rackId === definition.rack.id && pdu.feed === feed,
    )!.id;
    rack.add(pdu);
    pdu.position.fromArray(powerSettings.layout.positions[feed]);
    box(pdu, powerSettings.layout.size, [0, 0, 0], "#1b242c", 0.5);
    for (let i = 0; i < powerSettings.outletsPerPdu; i++) {
      box(
        pdu,
        [0.021, 0.035, 0.004],
        [
          0,
          (i - (powerSettings.outletsPerPdu - 1) / 2) *
            powerSettings.layout.outletPitch,
          -0.021,
        ],
        "#394149",
        0.3,
      );
      for (const dx of [-0.005, 0.005])
        box(
          pdu,
          [0.003, 0.014, 0.002],
          [
            dx,
            (i - (powerSettings.outletsPerPdu - 1) / 2) *
              powerSettings.layout.outletPitch,
            -0.024,
          ],
          "#10171b",
          0.1,
        );
    }
    box(
      pdu,
      [0.027, 0.045, 0.004],
      [0, 0.76, -0.022],
      index ? "#849dba" : "#bd895d",
      0.2,
    );
  }
  const assembly = createEquipmentAssembly("server-2u");
  server.add(assembly.root);
  for (const x of [-0.232, 0.232])
    glow(server, [0.002, 0.002, 0.77], [x, 0.041, 0], "#757c84");
  const selection = new SelectionCorners();
  root.add(selection);
  selection.visible = false;
  return {
    root,
    room,
    shellOccluders,
    rack,
    rackDoor,
    rackSlide,
    railMount,
    server,
    facilities,
    fixtures,
    fans,
    selection,
    parts: assembly.groups,
    rotors: [] as THREE.Group[],
  };
}

export function disposeModels(root: THREE.Object3D, shared = true) {
  const geometry = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) object.dispose();
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
