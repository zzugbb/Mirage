import { createAnnotationGroup } from "./annotations.ts";
import * as THREE from "three";
import {
  slicePoint,
  sliceColumns,
  sliceRows,
  sliceSettings,
} from "../temperature-slice.ts";
import type { TemperatureSlice } from "../temperature-slice.ts";
import { temperatureColor } from "./metric-color.ts";

/** 一张可复用纹理与一个平面；保留深度遮挡，切片不参与对象拾取。 */
export class TemperatureSliceGeometry {
  root = createAnnotationGroup("temperature-slice");
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
    this.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        opacity: sliceSettings.opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
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
    const width = Math.hypot(...slice.frame.u),
      height = Math.hypot(...slice.frame.v);
    this.plane.rotation.x =
      slice.orientation === "horizontal" ? -Math.PI / 2 : 0;
    this.plane.position.fromArray(slicePoint(slice.frame, 0.5, 0.5));
    this.plane.scale.set(width, height, 1);
    const positions: number[] = [];
    const line = (a: number[], b: number[]) => positions.push(...a, ...b);
    const point = (u: number, v: number) => slicePoint(slice.frame, u, v);
    for (const u of [0, 1])
      for (const v of [0, 1]) {
        line(point(u, v), point(u + (u === 0 ? 0.3 : -0.3) / width, v));
        line(point(u, v), point(u, v + (v === 0 ? 0.3 : -0.3) / height));
      }
    const marker = point(0, slice.orientation === "horizontal" ? 0 : 1);
    line([marker[0], 0.02, marker[2]], marker);
    line(
      [marker[0] - 0.15, marker[1], marker[2]],
      [marker[0] + 0.15, marker[1], marker[2]],
    );
    const attribute = this.guide.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    line(point(0, 0), point(1, 0));
    line(point(1, 0), point(1, 1));
    line(point(1, 1), point(0, 1));
    line(point(0, 1), point(0, 0));
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
