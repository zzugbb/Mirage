import * as THREE from "three";
import { entranceSettings } from "../entrance.ts";
import {
  emergencyHeadSides,
  emergencyHeadTransform,
} from "../emergency-light.ts";

const settings = entranceSettings.lighting;

function withoutCap(geometry: THREE.BufferGeometry, materialIndex: number) {
  const index = geometry.getIndex()!;
  const kept: number[] = [];
  for (const face of geometry.groups) {
    if (face.materialIndex === materialIndex) continue;
    for (let i = face.start; i < face.start + face.count; i++)
      kept.push(index.getX(i));
  }
  geometry.setIndex(kept);
  geometry.clearGroups();
  return geometry;
}

function faceRim(
  width: number,
  height: number,
  innerWidth: number,
  innerHeight: number,
) {
  const corners = (w: number, h: number) => [
    new THREE.Vector2(-w / 2, -h / 2),
    new THREE.Vector2(w / 2, -h / 2),
    new THREE.Vector2(w / 2, h / 2),
    new THREE.Vector2(-w / 2, h / 2),
  ];
  const rim = new THREE.Shape(corners(width, height));
  rim.holes.push(new THREE.Path(corners(innerWidth, innerHeight).reverse()));
  return rim;
}

function lensMaterial(radius: number) {
  const material = new THREE.MeshStandardMaterial({
    color: "#d6dad5",
    metalness: 0.12,
    roughness: 0.48,
  });
  if (typeof document === "undefined") return material;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#d6dad5";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#72818a";
  ctx.lineWidth = (0.0014 * 128) / radius;
  for (const fraction of [0.42, 0.76]) {
    ctx.beginPath();
    ctx.arc(64, 64, (64 * fraction) / 0.85, 0, Math.PI * 2);
    ctx.stroke();
  }
  material.map = new THREE.CanvasTexture(canvas);
  material.map.colorSpace = THREE.SRGBColorSpace;
  material.color.set("#ffffff");
  return material;
}

export function buildEntranceLighting(group: THREE.Group, sign: boolean) {
  const [w, h, d] = sign ? settings.signSize : settings.lampBodySize;
  const shell = new THREE.MeshStandardMaterial({
    color: sign ? "#4b575b" : "#a9b3b4",
    metalness: 0.45,
    roughness: 0.58,
  });
  // 前面由边框和面板拼合，移除箱体的 +Z 封面以免远景深度竞争。
  const box = new THREE.Mesh(
    withoutCap(new THREE.BoxGeometry(w, h, d), 4),
    shell,
  );
  const panelWidth = sign ? w - 0.012 : w * 0.94;
  const panelHeight = sign ? h - 0.012 : h * 0.89;
  const frame = new THREE.Mesh(
    new THREE.ShapeGeometry(faceRim(w, h, panelWidth, panelHeight)),
    shell,
  );
  frame.position.z = d / 2;
  box.add(frame);
  box.name = sign ? "exit-sign-case" : "emergency-light-case";
  group.add(box);
  if (sign) {
    const face = new THREE.MeshStandardMaterial({
      color: "#277654",
      roughness: 0.75,
    });
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = 768;
      canvas.height = 288;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#256346";
      ctx.fillRect(0, 0, 768, 288);
      ctx.strokeStyle = "#e2ebe4";
      ctx.lineWidth = 5;
      ctx.strokeRect(11, 11, 746, 266);
      ctx.fillStyle = "#edf3ec";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 156px sans-serif";
      ctx.fillText("出口", 384, 148);
      face.map = new THREE.CanvasTexture(canvas);
      face.map.colorSpace = THREE.SRGBColorSpace;
      face.color.set("#ffffff");
    }
    const print = new THREE.Mesh(
      new THREE.PlaneGeometry(panelWidth, panelHeight),
      face,
    );
    print.name = "exit-sign-face";
    print.position.z = d / 2;
    group.add(print);
    return;
  }
  const { headRadius: r, headDepth: depth } = settings;
  const lensRadius = r * 0.85;
  const lens = lensMaterial(lensRadius);
  const trim = new THREE.MeshStandardMaterial({
    color: "#72818a",
    metalness: 0.48,
    roughness: 0.55,
  });
  const coverWidth = w * 0.92;
  const coverHeight = h * 0.85;
  const front = new THREE.Mesh(
    new THREE.ShapeGeometry(
      faceRim(panelWidth, panelHeight, coverWidth, coverHeight),
    ),
    trim,
  );
  front.position.z = d / 2;
  group.add(front);
  const cover = new THREE.Mesh(
    new THREE.PlaneGeometry(coverWidth, coverHeight),
    shell,
  );
  cover.name = "emergency-light-cover";
  cover.position.z = d / 2;
  group.add(cover);
  for (const side of emergencyHeadSides) {
    const transform = emergencyHeadTransform(side);
    const stem = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, r * 0.8, 0.022),
      shell,
    );
    stem.position.set(transform.center.x, h / 2 + r * 0.36, 0);
    group.add(stem);
    const aim = new THREE.Group();
    aim.position.copy(transform.center);
    aim.rotation.copy(transform.rotation);
    group.add(aim);
    // 镜面中心与检视法线沿用登记位置，外壳在同一处结束于环形边框。
    const extension = transform.lensZ - depth / 2;
    const head = new THREE.Mesh(
      withoutCap(
        new THREE.CylinderGeometry(r, r * 0.82, depth + extension, 24),
        1,
      ),
      shell,
    );
    head.rotation.x = Math.PI / 2;
    head.position.z = extension / 2;
    aim.add(head);
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(lensRadius, r, 24),
      shell,
    );
    rim.position.z = transform.lensZ;
    aim.add(rim);
    const face = new THREE.Mesh(new THREE.CircleGeometry(lensRadius, 24), lens);
    face.position.z = transform.lensZ;
    face.name =
      side < 0 ? "emergency-light-lens-left" : "emergency-light-lens-right";
    aim.add(face);
  }
}
