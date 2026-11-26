import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { AnnotationAwareGTAOPass } from "./annotation-shadows.ts";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };

/** 统一直出与细节阴影模式的色调映射，半浮点保留暗部渐变。 */
export function createLinearBackdrop(
  pixels: Uint16Array<ArrayBuffer>,
  width: number,
  height: number,
) {
  const backdrop = new THREE.DataTexture(
    pixels,
    width,
    height,
    THREE.RGBAFormat,
    THREE.HalfFloatType,
  );
  backdrop.magFilter = THREE.LinearFilter;
  backdrop.minFilter = THREE.LinearFilter;
  backdrop.colorSpace = THREE.LinearSRGBColorSpace;
  backdrop.needsUpdate = true;
  return backdrop;
}

/** 与楼层画面一样，蓝灰亮部集中在场景中下部。 */
export function createBackdrop() {
  const { centerColor, middleColor, edgeColor } =
    definition.rendering.roomBackdrop;
  const stops = [centerColor, middleColor, edgeColor].map(
    (c) => new THREE.Color(c),
  );
  const width = 144;
  const height = 96;
  const pixels = new Uint16Array(width * height * 4);
  const half = THREE.DataUtils.toHalfFloat;
  const opaque = half(1);
  const color = new THREE.Color();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const radius = Math.hypot(
        (x / (width - 1) - 0.48) / 0.68,
        (y / (height - 1) - 0.33) / 0.76,
      );
      const t = Math.min(radius, 1) * (stops.length - 1);
      const index = Math.min(stops.length - 2, Math.floor(t));
      color.lerpColors(stops[index], stops[index + 1], t - index);
      pixels.set(
        [half(color.r), half(color.g), half(color.b), opaque],
        (y * width + x) * 4,
      );
    }
  }
  return createLinearBackdrop(pixels, width, height);
}

/** 保留机房周边的尺度参照，让远处网格融入画布。 */
export function createRoomGrid() {
  const [axis, line] = definition.rendering.roomBackdrop.grid.map(
    (color) => new THREE.Color(color),
  );
  const positions: number[] = [];
  const colors: number[] = [];
  const gridY = -0.285;
  const opacity = (row: number, offset: number) =>
    0.15 * (1 - THREE.MathUtils.smoothstep(Math.hypot(row, offset), 7, 18));
  for (let row = -20; row <= 20; row += 0.5) {
    const { r, g, b } = row === 0 ? axis : line;
    for (let start = -20; start < 20; start += 4) {
      const end = start + 4;
      const from = opacity(row, start);
      const to = opacity(row, end);
      positions.push(
        row,
        gridY,
        start,
        row,
        gridY,
        end,
        start,
        gridY,
        row,
        end,
        gridY,
        row,
      );
      colors.push(r, g, b, from, r, g, b, to, r, g, b, from, r, g, b, to);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    }),
  );
}

/** 增强接触阴影；不支持浮点颜色缓冲区时保留标准渲染。 */
export class RenderPipeline {
  enabled = true;
  available: boolean;
  composer: EffectComposer | null = null;
  ao: AnnotationAwareGTAOPass | null = null;
  output: OutputPass | null = null;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  ratio: number;
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.ratio = renderer.getPixelRatio();
    this.available = renderer.extensions.has("EXT_color_buffer_float");
    if (!this.available) return;
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: Math.min(4, renderer.capabilities.maxSamples),
    });
    this.composer = new EffectComposer(renderer, target);
    this.composer.setPixelRatio(this.ratio);
    this.composer.addPass(new RenderPass(scene, camera));
    this.ao = new AnnotationAwareGTAOPass(scene, camera, 1, 1);
    this.ao.blendIntensity = definition.rendering.contactShadows.intensity;
    this.ao.updateGtaoMaterial({
      radius: definition.rendering.contactShadows.roomRadius,
      samples: definition.rendering.contactShadows.samples,
      distanceExponent: 2,
      thickness: 0.5,
    });
    this.ao.updatePdMaterial({ samples: 8, rings: 2, radius: 4 });
    this.composer.addPass(this.ao);
    this.output = new OutputPass();
    this.composer.addPass(this.output);
  }
  setPixelRatio(ratio: number) {
    this.ratio = ratio;
    this.composer?.setPixelRatio(ratio);
  }
  resize(width: number, height: number) {
    this.composer?.setSize(width, height);
    const scale =
      definition.rendering.contactShadows.resolutionScale * this.ratio;
    this.ao?.setSize(
      Math.max(1, Math.round(width * scale)),
      Math.max(1, Math.round(height * scale)),
    );
  }
  render(delta: number, inspection: number, busy: boolean) {
    if (!this.composer || !this.enabled) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    if (this.ao) {
      // 透明过渡时不计算屏幕空间遮蔽，避免已淡出的结构留下暗影。
      this.ao.enabled = !busy;
      this.ao.updateGtaoMaterial({
        radius: THREE.MathUtils.lerp(
          definition.rendering.contactShadows.roomRadius,
          definition.rendering.contactShadows.deviceRadius,
          inspection,
        ),
      });
    }
    this.composer.render(delta);
  }
  dispose() {
    this.ao?.dispose();
    this.ao?.gtaoMaterial.dispose();
    this.ao?.blendMaterial.dispose();
    this.output?.dispose();
    this.composer?.dispose();
  }
}

export function createRoomLights(room: THREE.Group) {
  RectAreaLightUniformsLib.init();
  const lights: THREE.RectAreaLight[] = [];
  for (const lamp of definition.room.lights) {
    const light = new THREE.RectAreaLight(
      "#eff5ff",
      2.4,
      definition.room.lightProfile.diffuserWidth,
      lamp.length,
    );
    light.position.set(
      lamp.position[0],
      lamp.position[1] - 0.03,
      lamp.position[2],
    );
    light.lookAt(lamp.position[0], 0, lamp.position[2]);
    room.add(light);
    lights.push(light);
  }
  return lights;
}
