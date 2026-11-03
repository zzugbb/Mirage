import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };

/** 连续地面保持安装高度；接缝仅表达分格，不模拟可拆地板或架空层。 */
export function createRoomFloor(width: number, depth: number) {
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
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(width, settings.thickness, depth),
    new THREE.MeshStandardMaterial({
      color: settings.color,
      roughness: settings.roughness,
      metalness: settings.metalness,
      map,
    }),
  );
  floor.name = "room-floor";
  floor.position.y = settings.surfaceY - settings.thickness / 2;
  floor.receiveShadow = true;
  return floor;
}
