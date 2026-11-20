import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };

const studio = definition.rendering.inspectionStudio;

function studioBackground() {
  const stops = studio.background.map((color) => new THREE.Color(color));
  const pixels = new Uint8Array(128 * 4);
  const shade = new THREE.Color();
  for (let y = 0; y < 128; y++) {
    const t = y / 127;
    const i = t < 0.52 ? 0 : 1;
    shade
      .lerpColors(
        stops[i],
        stops[i + 1],
        THREE.MathUtils.smoothstep(t, i ? 0.52 : 0, i ? 1 : 0.52),
      )
      .convertLinearToSRGB();
    pixels.set([shade.r * 255, shade.g * 255, shade.b * 255, 255], y * 4);
  }
  const texture = new THREE.DataTexture(pixels, 1, 128);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// 中心细分较密，远端渐隐；材质与柜脚、台脚共用同一接触高度。
function studioFloor() {
  const geometry = new THREE.PlaneGeometry(2, 2, 56, 56);
  const positions = geometry.getAttribute("position"),
    colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i);
    const px = x * (2 + 14 * x * x),
      py = y * (2 + 14 * y * y);
    positions.setXY(i, px, py);
    const radius = Math.hypot(px, py);
    const light = 1 - 0.48 * THREE.MathUtils.smoothstep(radius, 0.5, 4);
    colors.push(
      light,
      light,
      light,
      1 - THREE.MathUtils.smoothstep(radius, 2, 12),
    );
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
  geometry.rotateX(-Math.PI / 2);
  const size = 128,
    pixels = new Uint8Array(size * size * 4);
  let seed = 41;
  for (let i = 0; i < pixels.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grain = 235 + ((seed >>> 24) % 21);
    pixels.set([grain, grain, grain, 255], i);
  }
  const map = new THREE.DataTexture(pixels, size, size);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(48, 48);
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  const floor = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: studio.floor,
      map,
      roughness: 0.92,
      metalness: 0.08,
      vertexColors: true,
      transparent: true,
    }),
  );
  floor.position.y = definition.rendering.floor.surfaceY;
  floor.receiveShadow = true;
  return floor;
}

export class InspectionBackdrop extends THREE.Group {
  background = studioBackground();
  constructor() {
    super();
    this.add(studioFloor());
    for (const panel of studio.softboxes) {
      const light = new THREE.RectAreaLight(
        panel.color,
        panel.intensity,
        panel.width,
        panel.height,
      );
      light.position.fromArray(panel.position);
      light.lookAt(0, 1, 0);
      this.add(light);
    }
    this.visible = false;
  }
}
