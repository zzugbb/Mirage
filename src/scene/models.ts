import * as THREE from 'three';
import definition from '../../assets/public/scenes/room-01.json';

export type SceneModel = ReturnType<typeof buildModels>;
const materials = new Map<string, THREE.MeshStandardMaterial>();
function material(color: string, metalness = 0.2, roughness = 0.6) {
  const key = `${color}:${metalness}:${roughness}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, metalness, roughness }));
  return materials.get(key)!;
}
export function box(parent: THREE.Object3D, size: number[], position: number[], color: string, metalness = 0.2) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size as [number, number, number]), material(color, metalness));
  mesh.position.fromArray(position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function identify(group: THREE.Group, id: string) { group.userData.entityId = id; return group; }
function line(parent: THREE.Object3D, points: number[][], color: string) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3().fromArray(p)));
  const object = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.65 })); parent.add(object);
}
function glow(parent: THREE.Object3D, size: number[], position: number[], color = '#72e7d5') {
  const object = box(parent, size, position, color);
  object.material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2, toneMapped: false });
  return object;
}
function text(parent: THREE.Object3D, label: string, position: number[], scale = 0.6) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#a9c5cf'; ctx.font = '500 52px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label, 256, 82);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.position.fromArray(position); sprite.scale.set(scale * 4, scale, 1); parent.add(sprite); return sprite;
}

export function buildModels() {
  // 生成器为技术代码；场景尺寸、构图与装配编排由登记的原创资产定义。
  const root = new THREE.Group();
  const room = identify(new THREE.Group(), 'room-01'); root.add(room);
  const [width, height, depth] = definition.room.size;
  box(room, [width + 0.15, 0.22, depth + 0.15], [0, -0.12, 0], '#233943', 0.5);
  for (let x = -3.75; x < 4; x += 0.5) for (let z = -2.75; z < 3; z += 0.5) {
    box(room, [0.493, 0.055, 0.493], [x, 0.025, z], (Math.round(x * 2 + z * 2) % 3 === 0) ? '#506671' : '#455c67', 0.35);
  }
  for (const x of [-4, 4]) glow(room, [0.025, 0.012, 6], [x, 0.065, 0], '#278e8a');
  // 左侧实体墙与真实窗洞；后侧门洞采用分段墙体，不用贴图冒充开口。
  box(room, [0.14, 0.9, depth], [-4, 0.45, 0], '#58717d');
  box(room, [0.14, 0.75, depth], [-4, height - 0.375, 0], '#58717d');
  for (const z of [-2.9, 0, 2.9]) box(room, [0.14, 1.55, 0.18], [-4, 1.675, z], '#58717d');
  for (const z of [-1.45, 1.45]) {
    const glass = box(room, [0.05, 1.48, 2.65], [-4, 1.675, z], '#92d4dd', 0.4);
    glass.material = new THREE.MeshPhysicalMaterial({ color: '#6eafbe', transparent: true, opacity: 0.24, roughness: 0.15, metalness: 0.25, side: THREE.DoubleSide, depthWrite: false });
    for (const y of [0.94, 2.42]) box(room, [0.18, 0.055, 2.78], [-3.98, y, z], '#263d48');
    for (const dz of [-1.37, 0, 1.37]) box(room, [0.18, 1.55, 0.055], [-3.98, 1.675, z + dz], '#263d48');
  }
  box(room, [5.4, height, 0.14], [-1.3, height / 2, -3], '#536b77');
  box(room, [1.4, height, 0.14], [3.3, height / 2, -3], '#536b77');
  box(room, [1.2, 0.8, 0.14], [2, 2.8, -3], '#536b77');
  const door = new THREE.Group(); door.position.set(1.4, 0, -2.98); door.rotation.y = -Math.PI / 3; room.add(door);
  box(door, [1.16, 2.36, 0.055], [0.58, 1.18, 0], '#354e5a', 0.45);
  box(door, [0.1, 0.25, 0.06], [1, 1.1, 0.05], '#bdd3d9', 0.8);
  glow(room, [0.45, 0.07, 0.04], [2, 2.6, -2.91]);
  for (const x of [-3.9, 3.9]) box(room, [0.12, height + 0.03, 0.2], [x, height / 2, -2.9], '#314c58', 0.5);
  glow(room, [5.8, 0.026, 0.03], [-0.9, 2.9, -2.9], '#c6dfe5');
  text(room, 'MIRAGE / 01', [-1.5, 2.55, -2.85], 0.18);
  // 冷通道与导流格栅。
  for (const x of [-0.5, 0, 0.5]) for (let z = 0.75; z <= 1.75; z += 0.5) {
    for (let k = 0; k < 9; k++) box(room, [0.42, 0.007, 0.014], [x, 0.058, z - 0.2 + k * 0.05], '#203b47');
  }
  line(room, [[-0.75, 0.063, 0.6], [-0.75, 0.063, 2.1], [0.75, 0.063, 2.1], [0.75, 0.063, 0.6]], '#42b2ac');
  const facilities = new Map<string, THREE.Group>();
  const fans: THREE.Group[] = [];
  for (const config of definition.facilities) {
    const group = identify(new THREE.Group(), config.id); group.position.fromArray(config.position); room.add(group); facilities.set(config.id, group);
    box(group, config.size, [0, 0, 0], config.color, 0.45);
    box(group, [config.size[0] - 0.1, config.size[1] - 0.2, 0.03], [0, 0, config.size[2] / 2 + 0.02], '#2c4653');
    if (config.id === 'cooling-01') {
      for (let y = -0.7; y <= 0.7; y += 0.065) box(group, [0.83, 0.022, 0.04], [0, y, 0.36], '#72929f', 0.7);
      const rotor = new THREE.Group(); rotor.position.set(0, 0.96, 0); group.add(rotor); fans.push(rotor);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.016, 8, 32), material('#263e49')); ring.rotation.x = Math.PI / 2; rotor.add(ring);
      for (let k = 0; k < 5; k++) { const blade = box(rotor, [0.07, 0.02, 0.2], [0, 0, 0], '#355562'); blade.rotation.y = k * Math.PI * 2 / 5; blade.position.set(Math.sin(blade.rotation.y) * 0.09, 0, Math.cos(blade.rotation.y) * 0.09); }
    } else {
      box(group, [0.3, 0.19, 0.04], [0, 0.4, 0.28], '#0e2938');
      for (let k = -1; k <= 1; k++) glow(group, [0.045, 0.045, 0.025], [k * 0.11, 0.15, 0.3], k === 1 ? '#dfac62' : '#6dd6c0');
      box(group, [0.035, 0.3, 0.04], [0.28, -0.05, 0.3], '#abc4ca', 0.8);
    }
  }
  const rack = identify(new THREE.Group(), definition.rack.id); root.add(rack);
  const [rw, rh, rd] = definition.rack.size;
  box(rack, [rw, 0.1, rd], [0, 0.12, 0], '#172a34', 0.7);
  box(rack, [rw, 0.065, rd], [0, rh, 0], '#263e4a', 0.7);
  for (const x of [-rw / 2 + 0.025, rw / 2 - 0.025]) for (const z of [-rd / 2 + 0.025, rd / 2 - 0.025]) box(rack, [0.045, rh, 0.045], [x, rh / 2 + 0.05, z], '#405864', 0.8);
  box(rack, [0.025, rh - 0.1, rd - 0.05], [rw / 2, rh / 2 + 0.05, 0], '#243c48', 0.65);
  box(rack, [rw - 0.06, rh - 0.1, 0.025], [0, rh / 2 + 0.05, -rd / 2], '#1e3440', 0.55);
  for (let u = 1; u <= 42; u++) {
    const y = 0.2 + u * 0.04445;
    for (const x of [-0.25, 0.25]) box(rack, [0.015, 0.012, 0.025], [x, y, 0.52], '#819aa2', 0.7);
    if (u !== 23 && u !== 24) {
      box(rack, [0.465, 0.04, 0.025], [0, y, 0.5], '#1e333f', 0.65);
      for (const x of [-0.14, -0.06, 0.02, 0.1]) box(rack, [0.045, 0.008, 0.006], [x, y, 0.517], '#405864');
    }
  }
  for (const x of [-0.3, 0.3]) glow(rack, [0.008, 2, 0.012], [x, 1.1, 0.55], '#45c5b7');
  text(rack, 'A01', [0, 2.36, 0], 0.1);
  const server = identify(new THREE.Group(), definition.server.id); server.position.fromArray(definition.server.position); root.add(server);
  box(server, definition.server.size, [0, 0, 0], '#8fabb7', 0.75);
  box(server, [0.47, 0.085, 0.026], [0, 0, 0.4], '#386578', 0.65);
  for (let i = 0; i < 8; i++) {
    box(server, [0.041, 0.045, 0.01], [-0.18 + i * 0.049, 0, 0.418], '#162e3c');
    glow(server, [0.004, 0.015, 0.008], [-0.191 + i * 0.049, 0, 0.425]);
  }
  const selection = new THREE.Box3Helper(new THREE.Box3(), '#6ce3cf'); root.add(selection); selection.visible = false;
  return { root, room, rack, server, facilities, fans, selection };
}

export function disposeModels(root: THREE.Object3D) {
  const geometry = new Set<THREE.BufferGeometry>(); const mats = new Set<THREE.Material>(); const textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
      if ('geometry' in object) geometry.add(object.geometry);
      for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
        mats.add(mat); if ('map' in mat && mat.map instanceof THREE.Texture) textures.add(mat.map);
      }
    }
  });
  geometry.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); materials.clear();
}
