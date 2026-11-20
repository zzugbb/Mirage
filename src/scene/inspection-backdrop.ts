import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };

const palette = definition.rendering.inspectionBackdrop;
const [width, height, depth] = definition.room.size;

// 墙体和柜排分两批绘制，设备出柜时可以单独淡出柜排。
function roomSilhouette() {
  const transforms: THREE.Matrix4[] = [];
  const colors: THREE.Color[] = [];
  const add = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
  ) => {
    transforms.push(
      new THREE.Matrix4().makeScale(w, h, d).setPosition(x, y, z),
    );
    colors.push(new THREE.Color(color));
  };
  // 远景尺寸与操作对象分开；前、后视时都留出柜体轮廓两侧的空隙。
  const halfX = width * 1.4,
    halfZ = depth * 1.4;
  const ceilingY = height * 1.25;
  for (const side of [-1, 1]) {
    const x = side * halfX,
      z = side * halfZ;
    add(0, ceilingY / 2, z, halfX * 2, ceilingY, 0.1, palette.wall);
    add(x, ceilingY / 2, 0, 0.1, ceilingY, halfZ * 2, palette.wall);
    add(0, 0.09, z - side * 0.07, halfX * 2, 0.18, 0.06, palette.trim);
    add(x - side * 0.07, 0.09, 0, 0.06, 0.18, halfZ * 2, palette.trim);
    for (let i = -6; i <= 6; i++) {
      add(
        (i * halfX) / 7,
        ceilingY / 2,
        z - side * 0.06,
        0.018,
        ceilingY,
        0.025,
        palette.trim,
      );
    }
    for (const offset of [-0.27, 0, 0.27]) {
      add(
        x - side * 0.07,
        height * 0.52,
        offset * depth,
        0.05,
        height * 0.42,
        depth * 0.25,
        palette.trim,
      );
    }
  }
  add(0, ceilingY + 0.05, 0, halfX * 2, 0.1, halfZ * 2, palette.ceiling);
  for (const lamp of definition.room.lights) {
    const [x, , z] = lamp.position;
    add(x, ceilingY - 0.2, z, 0.18, 0.08, depth * 2.4, palette.trim);
    add(x, ceilingY - 0.245, z, 0.12, 0.015, depth * 2.4, palette.diffuser);
  }
  const architectureCount = transforms.length;
  for (const rack of definition.installation.racks) {
    const [w, h, d] = definition.rack.size;
    const [x, , z] = rack.position;
    const side = Math.sign(z);
    const cx = Math.sign(x) * 2.7 + x * 0.36,
      cz = side * (halfZ - d);
    add(cx, h / 2, cz, w, h, d, palette.cabinet);
    const face = cz - side * (d / 2 + 0.01);
    add(cx, h * 0.53, face, w * 0.87, h * 0.88, 0.015, palette.wall);
    for (let row = 1; row < 16; row++)
      add(
        cx,
        h * (0.1 + row * 0.052),
        face - side * 0.012,
        w * 0.78,
        0.018,
        0.014,
        palette.cabinet,
      );
    add(
      cx + w * 0.32,
      h * 0.49,
      face - side * 0.022,
      0.025,
      0.15,
      0.03,
      palette.trim,
    );
  }
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const faces = geometry.getAttribute("position");
  const shading = [];
  const normal = geometry.getAttribute("normal");
  // 将墙根、柜底的柔和暗部烘入顶点；近景补光只照检视对象。
  for (let i = 0; i < faces.count; i++) {
    const shade =
      (faces.getY(i) > 0 ? 1 : 0.69) * (1 - 0.12 * Math.abs(normal.getX(i)));
    shading.push(shade, shade, shade);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(shading, 3));
  const batch = (start: number, end: number, transparent: boolean) => {
    const mesh = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshBasicMaterial({ vertexColors: true, transparent }),
      end - start,
    );
    for (let i = start; i < end; i++) {
      mesh.setMatrixAt(i - start, transforms[i]);
      mesh.setColorAt(i - start, colors[i]);
    }
    return mesh;
  };
  const group = new THREE.Group();
  const cabinets = batch(architectureCount, transforms.length, true);
  group.add(batch(0, architectureCount, false), cabinets);
  group.userData.excludeFromContactShadows = true;
  return { group, cabinets };
}

/** 地坪延展只铺原机房边界以外，保留原位置的分格、格栅开口与柜脚接触。 */
function floorExtension(material: THREE.MeshStandardMaterial) {
  const extent = 100;
  const outline = new THREE.Shape();
  outline.moveTo(-extent, -extent);
  outline.lineTo(extent, -extent);
  outline.lineTo(extent, extent);
  outline.lineTo(-extent, extent);
  outline.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-width / 2, -depth / 2);
  hole.lineTo(-width / 2, depth / 2);
  hole.lineTo(width / 2, depth / 2);
  hole.lineTo(width / 2, -depth / 2);
  hole.closePath();
  outline.holes.push(hole);
  const geometry = new THREE.ShapeGeometry(outline);
  const points = geometry.getAttribute("position"),
    uv = geometry.getAttribute("uv");
  for (let i = 0; i < points.count; i++)
    uv.setXY(i, points.getX(i) / width + 0.5, points.getY(i) / depth + 0.5);
  geometry.rotateX(-Math.PI / 2);
  return new THREE.Mesh(geometry, material);
}

export class InspectionBackdrop extends THREE.Group {
  private walls = roomSilhouette();
  private apron: THREE.Mesh;
  private workFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: palette.workFloor,
      roughness: 0.96,
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  constructor(floor: THREE.MeshStandardMaterial) {
    super();
    this.apron = floorExtension(floor);
    this.apron.position.y = this.workFloor.position.y =
      definition.rendering.floor.surfaceY;
    this.workFloor.receiveShadow = this.apron.receiveShadow = true;
    this.add(this.apron, this.workFloor, this.walls.group);
    this.visible = false;
  }
  update(
    camera: THREE.Vector3,
    rack: THREE.Vector3,
    close: boolean,
    relocation: number,
  ) {
    this.visible = close;
    if (!close) return;
    const blend = THREE.MathUtils.smoothstep(relocation, 0.58, 1);
    this.workFloor.visible = blend > 0;
    this.workFloor.material.opacity = blend;
    this.apron.visible = blend < 1;
    this.walls.cabinets.visible = blend < 1;
    this.walls.cabinets.material.opacity = 1 - blend;
    // 背景随观察方向取景，始终包住镜头、整柜和柜前检视台；旋转与缩放均无前景实体。
    const radius =
      Math.hypot(camera.x - rack.x, camera.z - rack.z) +
      definition.inspectionBench.frontOffset +
      1;
    const scale = Math.max(
      1,
      radius / (Math.min(width, depth) * 1.4 - definition.rack.size[2] * 2),
    );
    this.walls.group.position.set(
      camera.x,
      this.workFloor.position.y,
      camera.z,
    );
    this.walls.group.scale.set(
      scale,
      Math.max(scale, (camera.y + 1) / (height - 0.6)),
      scale,
    );
  }
}
