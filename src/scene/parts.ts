import * as THREE from "three";
import { parts, subparts } from "../domain";

type BoxFactory = (
  parent: THREE.Object3D,
  size: number[],
  position: number[],
  color: string,
  metalness?: number,
) => THREE.Mesh;
export function buildParts(
  server: THREE.Group,
  box: BoxFactory,
  glow: BoxFactory,
) {
  const groups = new Map<string, THREE.Group>();
  const rotors: THREE.Group[] = [];
  const addChild = (parent: THREE.Group, id: string) => {
    const child = new THREE.Group();
    child.userData.entityId = id;
    parent.add(child);
    groups.set(id, child);
    return child;
  };
  for (const part of parts) {
    const group = new THREE.Group();
    group.userData.entityId = part.id;
    group.position.fromArray(part.position);
    server.add(group);
    groups.set(part.id, group);
    const [w, h, d] = part.size;
    if (part.node === "fans") {
      for (let i = 0; i < 4; i++) {
        const child = addChild(
          group,
          subparts.filter((p) => p.parent === part.id)[i].id,
        );
        const x = -0.15 + i * 0.1;
        box(child, [0.087, h, d], [x, 0, 0], "#182f3b", 0.4);
        const rotor = new THREE.Group();
        rotor.position.set(x, 0, d / 2 + 0.001);
        child.add(rotor);
        rotors.push(rotor);
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.024, 0.003, 6, 24),
          new THREE.MeshStandardMaterial({
            color: "#6c8995",
            metalness: 0.7,
            roughness: 0.35,
          }),
        );
        rotor.add(ring);
        for (let j = 0; j < 5; j++) {
          const angle = (j * Math.PI * 2) / 5;
          const blade = box(
            rotor,
            [0.008, 0.024, 0.003],
            [Math.sin(angle) * 0.012, Math.cos(angle) * 0.012, 0],
            "#4e7481",
            0.55,
          );
          blade.rotation.z = -angle;
        }
        glow(
          child,
          [0.008, 0.008, 0.004],
          [x + 0.033, 0.02, d / 2 + 0.003],
          "#6ed7c2",
        );
      }
    } else if (part.node === "processor") {
      box(group, [w, 0.007, d], [0, -h / 2, 0], "#bac7c8", 0.85);
      for (let k = 0; k < 12; k++)
        box(
          group,
          [0.0038, h, d - 0.008],
          [-w / 2 + 0.005 + (k * (w - 0.01)) / 11, 0, 0],
          "#b3c4cb",
          0.82,
        );
      for (const x of [-w / 2 + 0.01, w / 2 - 0.01])
        box(group, [0.005, 0.006, d], [x, h / 2, 0], "#82aab9", 0.8);
    } else if (part.node === "memory") {
      for (let i = 0; i < 16; i++) {
        const child = addChild(
          group,
          subparts.filter((p) => p.parent === part.id)[i].id,
        );
        const x = -0.03 + (i % 4) * 0.02;
        child.position.z = (Math.floor(i / 4) - 1.5) * 0.042;
        box(child, [0.004, h, 0.034], [x, 0, 0], "#2e8169");
        box(child, [0.007, 0.009, 0.04], [x, -h / 2, 0], "#152e39");
        for (let j = 0; j < 2; j++)
          box(
            child,
            [0.005, 0.024, 0.017],
            [x + 0.004, 0.003, -0.01 + j * 0.02],
            "#192f38",
          );
        box(child, [0.005, 0.004, 0.03], [x, -0.017, 0], "#b79856", 0.65);
        for (const z of [-0.023, 0.023])
          box(child, [0.01, 0.015, 0.008], [x, -0.017, z], "#87acaa");
      }
    } else if (part.node === "board") {
      box(group, part.size, [0, 0, 0], part.color);
      for (let i = 0; i < 11; i++) {
        const x = -0.18 + i * 0.034;
        box(group, [0.014, 0.009, 0.035], [x, 0.009, -0.19], "#152d36");
        box(
          group,
          [0.0015, 0.001, 0.22],
          [x, h / 2 + 0.001, -0.01],
          "#639c84",
          0.45,
        );
      }
      for (const z of [-0.03, 0.01])
        box(group, [0.12, 0.014, 0.009], [-0.06, 0.012, z], "#203f48");
      box(group, [0.045, 0.012, 0.045], [-0.15, 0.01, 0.13], "#a7a48c", 0.7);
    } else if (part.node === "storage") {
      box(group, part.size, [0, 0, 0], "#2a4654", 0.65);
      for (let i = 0; i < 8; i++) {
        const child = addChild(
          group,
          subparts.filter((p) => p.parent === part.id)[i].id,
        );
        const x = -0.174 + i * 0.0495;
        box(child, [0.044, h - 0.009, d - 0.015], [x, 0, 0], "#728e99", 0.65);
        box(child, [0.04, 0.046, 0.012], [x, 0, d / 2 + 0.008], "#1b3542");
        box(
          child,
          [0.021, 0.006, 0.003],
          [x, 0, d / 2 + 0.016],
          "#8fa6ad",
          0.8,
        );
        glow(
          child,
          [0.003, 0.012, 0.004],
          [x - 0.015, 0, d / 2 + 0.016],
          "#79dec9",
        );
      }
    } else if (part.node === "psu") {
      box(group, part.size, [0, 0, 0], part.color, 0.7);
      for (let k = 0; k < 8; k++)
        box(
          group,
          [w - 0.02, 0.0015, 0.002],
          [0, -0.025 + k * 0.007, -d / 2 - 0.001],
          "#233e4b",
        );
      box(group, [0.03, 0.025, 0.01], [0, 0, -d / 2 - 0.003], "#112c3a");
      box(group, [0.012, 0.04, 0.018], [w / 2, 0, -d / 2], "#aad77b");
      box(
        group,
        [w - 0.02, 0.002, 0.045],
        [0, h / 2 + 0.002, 0],
        "#d7e0dd",
        0.4,
      );
    } else {
      box(group, part.size, [0, 0, 0], part.color, 0.72);
      for (let i = 0; i < 15; i++)
        for (const x of [-0.12, 0.12])
          box(
            group,
            [0.065, 0.001, 0.003],
            [x, h / 2 + 0.001, -0.2 + i * 0.015],
            "#4e6b78",
          );
      box(group, [0.12, 0.001, 0.04], [0, h / 2 + 0.001, 0.2], "#306471", 0.65);
    }
  }
  return { groups, rotors };
}
