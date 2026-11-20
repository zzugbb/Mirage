import * as THREE from "three";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };

import { createRackDial, createAssemblyDatum } from "./inspection-platforms.ts";
import { createStudioSky } from "./studio-sky.ts";

const studio = definition.rendering.inspectionStudio;

// 中心细分较密，远端渐隐，让方位盘和装配工位融入远景。
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
      opacity: 0.4,
      depthWrite: false,
    }),
  );
  floor.position.y = definition.rendering.floor.surfaceY;
  floor.receiveShadow = true;
  return floor;
}

export class InspectionBackdrop extends THREE.Group {
  readonly dial = createRackDial();
  readonly datum = createAssemblyDatum();
  private skies: Partial<Record<"rack" | "device", THREE.Texture>> = {};
  sky(device: boolean, azimuth: number, explosion: number, reduced: boolean) {
    const key = device ? "device" : "rack";
    const sky = (this.skies[key] ??= createStudioSky(device));
    if (device) {
      sky.repeat.set(0.978, 0.99);
      sky.offset.set(
        0.011 + (reduced ? 0 : 0.01 * Math.sin(azimuth)),
        0.005 + (reduced ? 0 : 0.004 * explosion),
      );
    }
    return sky;
  }
  disposeSkies() {
    for (const sky of Object.values(this.skies)) sky.dispose();
  }
  update(
    relocation: number,
    withdrawal: number,
    isolated: boolean,
    azimuth: number,
    delta: number,
    reduced: boolean,
  ) {
    const dial = this.dial;
    const scale = 1 - THREE.MathUtils.smoothstep(relocation, 0, 0.58);
    dial.root.visible = scale > 0.001;
    const radius = scale * studio.dialWidthScale;
    dial.root.scale.set(radius, scale, radius);
    dial.bearing.rotation.y = azimuth;
    if (reduced) dial.rotor.rotation.y = 0;
    else if (dial.root.visible)
      dial.rotor.rotation.y =
        (dial.rotor.rotation.y + delta * studio.orientation.radiansPerSecond) %
        (2 * Math.PI);
    this.datum.visible = relocation > 0.98 && withdrawal > 0.8 && !isolated;
  }
  constructor() {
    super();
    this.add(studioFloor(), this.dial.root, this.datum);
    this.datum.visible = false;
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
