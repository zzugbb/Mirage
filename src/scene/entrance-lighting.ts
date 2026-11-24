import * as THREE from "three";
import { entranceSettings } from "../entrance.ts";
import {
  emergencyHeadSides,
  emergencyHeadTransform,
} from "../emergency-light.ts";

const settings = entranceSettings.lighting;

export function buildEntranceLighting(group: THREE.Group, sign: boolean) {
  const [w, h, d] = sign ? settings.signSize : settings.lampBodySize;
  const shell = new THREE.MeshStandardMaterial({
    color: sign ? "#4b575b" : "#a9b3b4",
    metalness: 0.45,
    roughness: 0.58,
  });
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shell);
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
      new THREE.PlaneGeometry(w - 0.012, h - 0.012),
      face,
    );
    print.name = "exit-sign-face";
    print.position.z = d / 2 + 0.0005;
    group.add(print);
    return;
  }
  const { headRadius: r, headDepth: depth } = settings;
  const lens = new THREE.MeshStandardMaterial({
    color: "#d6dad5",
    metalness: 0.12,
    roughness: 0.48,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: "#72818a",
    metalness: 0.48,
    roughness: 0.55,
  });
  const front = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.94, h * 0.89, 0.004),
    trim,
  );
  front.position.z = d / 2;
  group.add(front);
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.92, h * 0.85, 0.005),
    shell,
  );
  cover.position.z = d / 2 + 0.002;
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
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r * 0.82, depth, 24),
      shell,
    );
    head.rotation.x = Math.PI / 2;
    aim.add(head);
    const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.85, 24), lens);
    face.position.z = transform.lensZ;
    face.name =
      side < 0 ? "emergency-light-lens-left" : "emergency-light-lens-right";
    aim.add(face);
    for (const fraction of [0.42, 0.76]) {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(r * fraction, 0.0014, 5, 24),
        trim,
      );
      rib.position.z = face.position.z + 0.0006;
      aim.add(rib);
    }
  }
}
