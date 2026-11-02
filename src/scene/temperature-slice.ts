import * as THREE from "three";
import {
  sliceBounds,
  sliceColumns,
  sliceRows,
  sliceSettings,
} from "../temperature-slice.ts";
import type { TemperatureSlice } from "../temperature-slice.ts";
import { temperatureColor } from "./metric-color.ts";

/** 一张可复用纹理与一个平面；保留深度遮挡，切片不参与对象拾取。 */
export class TemperatureSliceGeometry {
  root = new THREE.Group();
  pixels = new Uint8Array(sliceColumns * sliceRows * 4);
  texture = new THREE.DataTexture(this.pixels, sliceColumns, sliceRows);
  plane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  guide = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineDashedMaterial({
      color: "#8db8c4",
      transparent: true,
      opacity: 0.6,
      dashSize: 0.12,
      gapSize: 0.06,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  color = new THREE.Color();
  constructor() {
    const { minX, maxX, minZ, maxZ } = sliceBounds;
    this.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(maxX - minX, maxZ - minZ),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        opacity: sliceSettings.opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    this.plane.rotation.x = -Math.PI / 2;
    this.plane.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    this.plane.renderOrder = 2;
    this.plane.raycast = () => {};
    this.guide.raycast = () => {};
    this.guide.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(8 * 6 + 12 + 24), 3),
    );
    this.guide.geometry.setAttribute(
      "lineDistance",
      new THREE.BufferAttribute(new Float32Array(28), 1),
    );
    this.root.add(this.plane, this.guide);
    this.root.visible = false;
  }
  update(slice: TemperatureSlice | null) {
    this.root.visible = slice !== null;
    if (!slice) return;
    this.pixels.fill(0);
    slice.values.forEach((value, i) => {
      if (!Number.isFinite(value)) return;
      const color = temperatureColor(value, this.color);
      this.pixels[i * 4] = Math.round(color.r * 255);
      this.pixels[i * 4 + 1] = Math.round(color.g * 255);
      this.pixels[i * 4 + 2] = Math.round(color.b * 255);
      this.pixels[i * 4 + 3] = Math.round(255 * Math.sqrt(slice.influence[i]));
    });
    this.texture.needsUpdate = true;
    this.plane.position.y = slice.height;
    const { minX, maxX, minZ, maxZ } = sliceBounds;
    const positions: number[] = [];
    for (const x of [minX, maxX])
      for (const z of [minZ, maxZ]) {
        positions.push(
          x,
          slice.height,
          z,
          x + (x === minX ? 0.3 : -0.3),
          slice.height,
          z,
        );
        positions.push(
          x,
          slice.height,
          z,
          x,
          slice.height,
          z + (z === minZ ? 0.3 : -0.3),
        );
      }
    positions.push(
      minX,
      0.02,
      maxZ,
      minX,
      slice.height,
      maxZ,
      minX - 0.15,
      slice.height,
      maxZ,
      minX + 0.15,
      slice.height,
      maxZ,
    );
    const attribute = this.guide.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    positions.push(
      minX,
      slice.height,
      minZ,
      maxX,
      slice.height,
      minZ,
      maxX,
      slice.height,
      minZ,
      maxX,
      slice.height,
      maxZ,
      maxX,
      slice.height,
      maxZ,
      minX,
      slice.height,
      maxZ,
      minX,
      slice.height,
      maxZ,
      minX,
      slice.height,
      minZ,
    );
    attribute.array.set(positions);
    attribute.needsUpdate = true;
    this.guide.geometry.computeBoundingSphere();
    const distances = this.guide.geometry.getAttribute(
      "lineDistance",
    ) as THREE.BufferAttribute;
    for (let vertex = 0; vertex < attribute.count; vertex += 2) {
      distances.setX(vertex, 0);
      distances.setX(
        vertex + 1,
        Math.hypot(
          attribute.getX(vertex + 1) - attribute.getX(vertex),
          attribute.getY(vertex + 1) - attribute.getY(vertex),
          attribute.getZ(vertex + 1) - attribute.getZ(vertex),
        ),
      );
    }
    distances.needsUpdate = true;
  }
  dispose() {
    this.plane.geometry.dispose();
    this.plane.material.dispose();
    this.texture.dispose();
    this.guide.geometry.dispose();
    this.guide.material.dispose();
    this.root.clear();
    this.root.removeFromParent();
  }
}
