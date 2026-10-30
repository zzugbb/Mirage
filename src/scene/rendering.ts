import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };

/** 线性纹理背景与模型经过同一色调映射，标准和后处理画质保持一致。 */
export function createBackdrop() {
  const backdrop = new THREE.DataTexture(new Uint8Array([7, 8, 10, 255]), 1, 1);
  backdrop.colorSpace = THREE.LinearSRGBColorSpace;
  backdrop.needsUpdate = true;
  return backdrop;
}

/** 增强接触阴影；不支持浮点颜色缓冲区时保留标准渲染。 */
export class RenderPipeline {
  enabled = true;
  available: boolean;
  composer: EffectComposer | null = null;
  ao: GTAOPass | null = null;
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
    this.ao = new GTAOPass(scene, camera, 1, 1);
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

export function createFloorMaterial() {
  const settings = definition.rendering.floor;
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  let seed = 4217;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 204 + ((seed >>> 24) % 30);
    pixels.set([value, value, value, 255], i * 4);
  }
  const grain = new THREE.DataTexture(pixels, size, size);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(settings.grainRepeat, settings.grainRepeat);
  grain.generateMipmaps = true;
  grain.minFilter = THREE.LinearMipmapLinearFilter;
  grain.magFilter = THREE.LinearFilter;
  grain.anisotropy = 4;
  grain.needsUpdate = true;
  return new THREE.MeshPhysicalMaterial({
    color: settings.color,
    metalness: settings.metalness,
    roughness: settings.roughness,
    roughnessMap: grain,
    bumpMap: grain,
    bumpScale: settings.bumpScale,
    clearcoat: 0.08,
    clearcoatRoughness: 0.55,
  });
}

export function createRoomLights(room: THREE.Group) {
  RectAreaLightUniformsLib.init();
  const lights: THREE.RectAreaLight[] = [];
  for (const x of [-2.4, 1.7]) {
    const light = new THREE.RectAreaLight("#fff8ed", 3, 0.095, 3.05);
    light.position.set(x, 2.825, -0.55);
    light.lookAt(x, 0, -0.55);
    room.add(light);
    lights.push(light);
  }
  return lights;
}
