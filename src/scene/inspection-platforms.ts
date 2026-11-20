import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };

const palette = definition.rendering.inspectionStudio.orientation;
const ink = (color: THREE.ColorRepresentation) =>
  new THREE.MeshBasicMaterial({
    color,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
function band(
  parent: THREE.Group,
  inner: number,
  outer: number,
  start: number,
  span: number,
  y: number,
  material: THREE.Material,
) {
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(
      inner,
      outer,
      Math.max(4, Math.ceil((96 * span) / (2 * Math.PI))),
      1,
      start,
      span,
    ),
    material,
  );
  arc.rotation.x = -Math.PI / 2;
  arc.position.y = y;
  parent.add(arc);
  return arc;
}
function strokes(parent: THREE.Group, segments: number[], color: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(segments, 3),
  );
  const lines = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color, toneMapped: false }),
  );
  lines.raycast = () => {};
  parent.add(lines);
}
export const dialBearingRadius = 1.102;
export function createRackDial() {
  const root = new THREE.Group(),
    rotor = new THREE.Group(),
    bearing = new THREE.Group();
  root.name = "rack-orientation-dial";
  const y = definition.rendering.floor.surfaceY;
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.93, 0.98, 0.056, 96),
    new THREE.MeshStandardMaterial({
      color: 0x192f41,
      metalness: 0.18,
      roughness: 0.86,
    }),
  );
  deck.position.y = y - 0.026;
  deck.receiveShadow = true;
  root.add(deck, rotor, bearing);
  const ice = ink(palette.ice),
    dim = ink(0x42677f),
    violet = ink(palette.violet);
  band(root, 0.91, 0.925, 0, Math.PI * 2, y + 0.005, dim);
  const ticks: number[] = [];
  for (let i = 0; i < 120; i++) {
    const a = (i * Math.PI) / 60,
      r = i % 10 === 0 ? 0.95 : i % 5 === 0 ? 0.97 : 0.993;
    ticks.push(
      Math.sin(a) * r,
      y + 0.008,
      Math.cos(a) * r,
      Math.sin(a) * 1.018,
      y + 0.008,
      Math.cos(a) * 1.018,
    );
  }
  strokes(root, ticks, 0x78a4b9);
  // 三段有前锋和间隙的光路缓慢流转。正面单道琥珀标记、背面双道冰蓝标记固定在柜体方向。
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3;
    band(rotor, 1.037, 1.053, a, 1.34, y + 0.01, i === 2 ? violet : dim);
    band(
      rotor,
      1.035,
      1.061,
      a + 1.34,
      0.19,
      y + 0.012,
      i === 2 ? violet : ice,
    );
  }
  band(
    root,
    0.805,
    0.907,
    -Math.PI / 2 - 0.062,
    0.124,
    y + 0.009,
    ink(palette.brass),
  );
  for (const offset of [-0.065, 0.065])
    band(root, 0.81, 0.9, Math.PI / 2 + offset - 0.023, 0.046, y + 0.009, ice);
  // 外弧始终落在观察者一侧，固定刻度经过弧下时可读出手动转动的方向。
  band(
    bearing,
    1.09,
    dialBearingRadius,
    -Math.PI / 2 - 0.2,
    0.4,
    y + 0.014,
    ice,
  );
  return { root, rotor, bearing };
}

function plate(
  width: number,
  depth: number,
  height: number,
  cut: number,
  color: number,
) {
  const w = width / 2,
    d = depth / 2;
  const outline = new THREE.Shape();
  const corners = [
    [-w + cut, -d],
    [w - cut, -d],
    [w, -d + cut],
    [w, d - cut],
    [w - cut, d],
    [-w + cut, d],
    [-w, d - cut],
    [-w, -d + cut],
  ];
  corners.forEach(([x, z], i) =>
    i ? outline.lineTo(x, z) : outline.moveTo(x, z),
  );
  outline.closePath();
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: height,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, metalness: 0.56, roughness: 0.43 }),
  );
  mesh.receiveShadow = true;
  return mesh;
}

export function createDeviceDock() {
  const root = new THREE.Group();
  root.name = "inspection-bench";
  const { width, depth, surfaceY, thickness } = definition.inspectionBench;
  // 后细前亮的短光迹沿两条外边行进，抵达端标时收短。
  const trailGeometry = new THREE.PlaneGeometry(0.013, 0.115, 1, 10);
  const vertices = trailGeometry.getAttribute("position");
  const colors: number[] = [];
  for (let i = 0; i < vertices.count; i++) {
    const head = 0.5 - vertices.getY(i) / 0.115;
    vertices.setX(i, vertices.getX(i) * (0.18 + 0.82 * head));
    colors.push(0.7, 0.98, 1, head * head);
  }
  trailGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 4),
  );
  trailGeometry.rotateX(-Math.PI / 2);
  const trailMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const trails: THREE.Mesh[] = [];
  const halves = [-1, 1].map((side) => {
    const half = new THREE.Group();
    half.position.set(side * width * 0.25, surfaceY, 0);
    const body = plate(width * 0.5 - 0.003, depth, thickness, 0.045, 0x223d4a);
    body.position.y = -thickness;
    const keel = plate(width * 0.43, depth * 0.88, 0.043, 0.055, 0x182834);
    keel.position.y = -thickness - 0.055;
    const light = plate(width * 0.504, depth * 0.987, 0.011, 0.04, 0x55c6cf);
    light.material.emissive.setHex(0x3cabb8);
    light.position.y = -thickness - 0.011;
    half.add(keel, light, body);
    const bars: number[] = [];
    for (let i = 0; i < 32; i++) {
      const z = ((i - 15.5) * depth) / 36;
      const x = side * (width * 0.25 - 0.016);
      bars.push(
        x,
        0.001,
        z,
        x - side * (i % 4 === 0 ? 0.025 : 0.012),
        0.001,
        z,
      );
    }
    strokes(half, bars, 0x8ab6c0);
    const key = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.004, 0.008),
      ink(side === 1 ? palette.brass : palette.ice),
    );
    key.position.set(side * 0.09, 0.001, depth / 2 - 0.018);
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.set(side * (width * 0.25 - 0.02), 0.003, 0);
    half.add(key, trail);
    trails.push(trail);
    root.add(half);
    return half;
  });
  return { root, halves, trails };
}

// 在展开件下保留机箱原点。只用短线与四角定位，斜看不会挡住部件。
export function createAssemblyDatum() {
  const root = new THREE.Group();
  root.name = "chassis-registration";
  const { surfaceY } = definition.inspectionBench;
  const w = definition.server.size[0] / 2,
    d = definition.server.size[2] / 2,
    h = surfaceY - 0.105;
  const corners: number[] = [],
    rule: number[] = [];
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      corners.push(
        x * (w - 0.065),
        h,
        z * d,
        x * w,
        h,
        z * d,
        x * w,
        h,
        z * d,
        x * w,
        h,
        z * (d - 0.09),
      );
      rule.push(x * w, h, z * (d + 0.018), x * (w + 0.06), h, z * (d + 0.018));
    }
  for (let i = -8; i <= 8; i++)
    for (const side of [-1, 1])
      rule.push(
        side * (w + 0.022),
        h,
        (i * d) / 9,
        side * (w + (i % 4 === 0 ? 0.04 : 0.032)),
        h,
        (i * d) / 9,
      );
  strokes(root, corners, 0x62bac8);
  strokes(root, rule, 0x527894);
  return root;
}
