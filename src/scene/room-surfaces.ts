import {
  floorGrilles,
  floorGrilleSettings as grille,
} from "../floor-grilles.ts";
import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import { entranceOpening } from "../entrance.ts";

export const roomWallThickness = 0.16;
export const roomFloorSurfaceY = definition.rendering.floor.surfaceY;

/** 实际后墙与左墙内侧的收边，门洞留空。 */
export function addRoomWallBase(
  backWall: THREE.Group,
  sideWall: THREE.Group,
  color = "#68757b",
  sideColor = color,
) {
  const [width, , depth] = definition.room.size;
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.94,
  });
  const height = 0.12;
  const thickness = 0.024;
  const inset = roomWallThickness / 2 + thickness / 2 - 0.002;
  const y = roomFloorSurfaceY + height / 2;
  const back = -depth / 2 + inset;
  const left = -width / 2 + inset;
  for (const [start, end] of [
    [left + thickness / 2, entranceOpening.left],
    [entranceOpening.right, width / 2],
  ]) {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(end - start, height, thickness),
      material,
    );
    base.name = "room-wall-base-back";
    base.position.set((start + end) / 2, y, back);
    base.receiveShadow = true;
    backWall.add(base);
  }
  const start = -depth / 2 + roomWallThickness / 2;
  const side = new THREE.Mesh(
    new THREE.BoxGeometry(thickness, height, depth / 2 - start),
    sideColor === color
      ? material
      : new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.94 }),
  );
  side.name = "room-wall-base-left";
  side.position.set(left, y, (start + depth / 2) / 2);
  side.receiveShadow = true;
  sideWall.add(side);
}

/** 薄地面为格栅留出浅凹开口；不建立架空地板或送风风腔。 */
export function roomFloorGeometry(
  width: number,
  depth: number,
  thickness: number,
) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -depth / 2);
  shape.lineTo(width / 2, -depth / 2);
  shape.lineTo(width / 2, depth / 2);
  shape.lineTo(-width / 2, depth / 2);
  shape.closePath();
  for (const {
    position: [x, , z],
  } of floorGrilles) {
    const hole = new THREE.Path(),
      y = -z;
    hole.moveTo(x - grille.width / 2, y - grille.depth / 2);
    hole.lineTo(x - grille.width / 2, y + grille.depth / 2);
    hole.lineTo(x + grille.width / 2, y + grille.depth / 2);
    hole.lineTo(x + grille.width / 2, y - grille.depth / 2);
    hole.closePath();
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    steps: 1,
  });
  const positions = geometry.getAttribute("position"),
    uv = geometry.getAttribute("uv");
  // 与原连续地面保持同一世界坐标分格，开口不改变周边纹理比例。
  for (let i = 0; i < positions.count; i++)
    uv.setXY(
      i,
      (positions.getX(i) + width / 2) / width,
      (positions.getY(i) + depth / 2) / depth,
    );
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** 共用样板机房与楼层预览的地面分格。 */
export function createRoomFloorMap(width: number, depth: number) {
  const settings = definition.rendering.floor;
  const size = settings.textureSize;
  const pixels = new Uint8Array(size * size * 4);
  const halfGap = (settings.gap / settings.tileSize) * size * 0.5;
  let seed = 4217;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 像素覆盖率柔化纹理边界；mipmap 让远景细缝逐渐融入表面。
      const edge = Math.min(x + 0.5, y + 0.5, size - x - 0.5, size - y - 0.5);
      const coverage = THREE.MathUtils.clamp(halfGap + 0.5 - edge, 0, 1);
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const grain = (seed >>> 24) % settings.grainRange;
      const value = Math.round(
        THREE.MathUtils.lerp(
          settings.tileValue - grain,
          settings.seamValue,
          coverage,
        ),
      );
      pixels.set([value, value, value, 255], (y * size + x) * 4);
    }
  }
  const map = new THREE.DataTexture(pixels, size, size);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(width / settings.tileSize, depth / settings.tileSize);
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.anisotropy = 8;
  map.needsUpdate = true;
  return map;
}

/** 连续地面保持安装高度；接缝仅表达分格，不模拟可拆地板或架空层。 */
export function createRoomFloor(width: number, depth: number) {
  const settings = definition.rendering.floor;
  const floor = new THREE.Mesh(
    roomFloorGeometry(width, depth, settings.thickness),
    new THREE.MeshStandardMaterial({
      color: settings.color,
      roughness: settings.roughness,
      metalness: settings.metalness,
      map: createRoomFloorMap(width, depth),
    }),
  );
  floor.name = "room-floor";
  floor.position.y = settings.surfaceY - settings.thickness;
  floor.receiveShadow = true;
  return floor;
}
