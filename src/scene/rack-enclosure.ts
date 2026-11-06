import * as THREE from "three";
import { rearDoorAngle } from "../mechanics.ts";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { powerSettings } from "../power-config.ts";

const settings = definition.rack.enclosure;
const [width, height, depth] = definition.rack.size;

function solid(
  group: THREE.Group,
  name: string,
  size: number[],
  position: number[],
  material: THREE.MeshStandardMaterial,
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...(size as [number, number, number])),
    material,
  );
  mesh.name = name;
  mesh.position.fromArray(position);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

/** 周期冲孔只用于外观，不将纹理孔洞声明为工程开孔率。 */
function perforation(panelWidth: number, panelHeight: number) {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const value =
        Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) < 22 ? 0 : 255;
      pixels.set([value, value, value, 255], (y * size + x) * 4);
    }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    panelWidth / settings.rearDoor.holePitch,
    panelHeight / settings.rearDoor.holePitch,
  );
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/** 双扇门沿外侧铰轴向柜后打开，仅用于可逆结构展示。 */
export function createRackRearDoors() {
  const group = new THREE.Group();
  group.name = "rack-rear-doors";
  const s = settings.rearDoor;
  const leafWidth = (s.width - s.seam) / 2;
  const leafHeight = height - s.heightInset;
  const panelWidth = leafWidth - s.frameWidth * 2;
  const panelHeight = leafHeight - s.frameWidth * 2;
  const frame = new THREE.MeshStandardMaterial({
    color: s.frameColor,
    roughness: 0.65,
    metalness: 0.55,
  });
  const panel = new THREE.MeshStandardMaterial({
    color: s.color,
    roughness: 0.6,
    metalness: 0.5,
    alphaMap: perforation(panelWidth, panelHeight),
    alphaTest: 0.5,
    alphaToCoverage: true,
    side: THREE.DoubleSide,
  });
  const hardware = new THREE.MeshStandardMaterial({
    color: "#77818a",
    roughness: 0.5,
    metalness: 0.65,
  });
  group.position.set(0, height / 2 + s.centerYInset, -depth / 2 + s.offsetZ);
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.name = `rear-door-${side < 0 ? "left" : "right"}`;
    leaf.position.x = (side * s.width) / 2;
    group.add(leaf);
    for (const edge of [-1, 1]) {
      solid(
        leaf,
        "door-stile",
        [s.frameWidth, leafHeight, s.thickness],
        [(edge * (leafWidth - s.frameWidth)) / 2, 0, 0],
        frame,
      );
      solid(
        leaf,
        "door-rail",
        [panelWidth, s.frameWidth, s.thickness],
        [0, (edge * (leafHeight - s.frameWidth)) / 2, 0],
        frame,
      );
      solid(
        leaf,
        "rear-hinge",
        [0.014, 0.07, 0.02],
        [(side * leafWidth) / 2, edge * leafHeight * 0.35, -0.004],
        hardware,
      );
    }
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(panelWidth, panelHeight),
      panel,
    );
    mesh.name = "rear-perforated-panel";
    mesh.castShadow = mesh.receiveShadow = true;
    leaf.add(mesh);
    solid(
      leaf,
      "rear-handle",
      [0.012, 0.16, 0.015],
      [(-side * (leafWidth - s.frameWidth)) / 2, 0, -0.014],
      hardware,
    );
    // 几何仍沿叶片中心布置，再将局部原点移到外侧铰轴；闭合外廓不变。
    for (const child of leaf.children)
      child.position.x -= (side * leafWidth) / 2;
  }
  return group;
}

export function poseRackRearDoors(group: THREE.Object3D, progress: number) {
  const angle = rearDoorAngle(progress);
  group.getObjectByName("rear-door-left")!.rotation.y = angle;
  group.getObjectByName("rear-door-right")!.rotation.y =
    angle === 0 ? 0 : -angle;
}

/** 顶板分块围出两个真实开口，刷条位于开口内；不虚构穿过开口的线缆。 */
export function createRackRoof() {
  const group = new THREE.Group();
  group.name = "rack-roof";
  const s = settings.roof;
  group.position.y = height;
  const plate = new THREE.MeshStandardMaterial({
    color: s.color,
    metalness: 0.6,
    roughness: 0.65,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: "#303840",
    metalness: 0.4,
    roughness: 0.7,
  });
  const brush = new THREE.MeshStandardMaterial({
    color: s.brushColor,
    metalness: 0,
    roughness: 0.95,
  });
  const rear = s.entryZ - s.entryDepth / 2;
  const front = s.entryZ + s.entryDepth / 2;
  const slab = (minX: number, maxX: number, minZ: number, maxZ: number) =>
    solid(
      group,
      "roof-plate",
      [maxX - minX, s.thickness, maxZ - minZ],
      [(minX + maxX) / 2, 0, (minZ + maxZ) / 2],
      plate,
    );
  slab(-width / 2, width / 2, -depth / 2, rear);
  slab(-width / 2, width / 2, front, depth / 2);
  let start = -width / 2;
  for (const x of [...s.entryXs].sort((a, b) => a - b)) {
    slab(start, x - s.entryWidth / 2, rear, front);
    start = x + s.entryWidth / 2;
    const entry = new THREE.Group();
    entry.name = "roof-brush-entry";
    entry.position.set(x, s.thickness / 2, s.entryZ);
    group.add(entry);
    for (const side of [-1, 1]) {
      solid(
        entry,
        "entry-rim",
        [s.rimWidth, 0.006, s.entryDepth + s.rimWidth * 2],
        [(side * (s.entryWidth + s.rimWidth)) / 2, 0.002, 0],
        trim,
      );
      solid(
        entry,
        "entry-rim",
        [s.entryWidth, 0.006, s.rimWidth],
        [0, 0.002, (side * (s.entryDepth + s.rimWidth)) / 2],
        trim,
      );
      const half = (s.entryWidth - s.brushGap) / 2;
      solid(
        entry,
        "entry-brush",
        [half, 0.008, s.entryDepth],
        [(side * (half + s.brushGap)) / 2, -0.005, 0],
        brush,
      );
    }
  }
  slab(start, width / 2, rear, front);
  return group;
}

/** 侧壁固定支架留在柜体上，后门观察剖切时仍保留安装依据。 */
export function createPduMounts() {
  const group = new THREE.Group();
  group.name = "rack-pdu-mounts";
  const s = settings.pduMount;
  const material = new THREE.MeshStandardMaterial({
    color: s.color,
    metalness: 0.65,
    roughness: 0.6,
  });
  for (const feed of ["A", "B"] as const) {
    const [x, y, z] = powerSettings.layout.positions[feed];
    const [pw, , pd] = powerSettings.layout.size;
    const side = Math.sign(x);
    const outer = Math.abs(x) + pw / 2;
    const inner = Math.abs(x) - pw / 2;
    for (const dy of s.heightOffsets) {
      solid(
        group,
        `pdu-mount-${feed}`,
        [s.sideInnerX - inner, s.height, s.thickness],
        [
          (side * (inner + s.sideInnerX)) / 2,
          y + dy,
          z + pd / 2 + s.thickness / 2,
        ],
        material,
      );
      solid(
        group,
        `pdu-spacer-${feed}`,
        [s.sideInnerX - outer, s.height, pd],
        [(side * (outer + s.sideInnerX)) / 2, y + dy, z],
        material,
      );
    }
  }
  return group;
}
