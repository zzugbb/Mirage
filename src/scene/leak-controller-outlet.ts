import * as THREE from "three";
import {
  leakControllerOutlet as s,
  leakControllerOutletPlacement,
} from "../leak-controller-outlet.ts";
import { leakDetection } from "../leak-detection.ts";

type Box = (
  parent: THREE.Object3D,
  size: number[],
  position: number[],
  color: string,
  metalness?: number,
) => THREE.Mesh;

/** 保持原外廓的样板空箱，固定底板同轴留孔，内引线独立于登记支路。 */
export function buildLeakControllerOutlet(root: THREE.Group, box: Box) {
  const [width, height, depth] = leakDetection.controllerSize;
  const wall = s.wallThickness;
  const bottomY = -height / 2;
  const innerHeight = height - s.bottomThickness - wall;
  const innerY = bottomY + s.bottomThickness + innerHeight / 2;
  const casing = "#68757b";
  box(
    root,
    [wall, innerHeight, depth],
    [(wall - width) / 2, innerY, 0],
    casing,
    0.25,
  ).name = "leak-controller-back";
  box(
    root,
    [width, wall, depth],
    [0, (height - wall) / 2, 0],
    casing,
    0.25,
  ).name = "leak-controller-top";
  for (const side of [-1, 1])
    box(
      root,
      [width - 2 * wall, innerHeight, wall],
      [0, innerY, (side * (depth - wall)) / 2],
      casing,
      0.25,
    ).name = "leak-controller-side";
  const cover = new THREE.Group();
  cover.name = "leak-controller-cover";
  root.add(cover);
  box(
    cover,
    [wall, innerHeight, depth],
    [(width - wall) / 2, innerY, 0],
    casing,
    0.25,
  ).name = "leak-controller-body";
  box(cover, [0.008, 0.08, 0.12], [0.053, 0.02, 0], "#2c3840", 0.1).name =
    "leak-controller-inset";

  const { origin, inward, innerEnd } = leakControllerOutletPlacement();
  const start = origin.clone().sub(root.position);
  const bore = s.boreDiameter / 2;
  const plate = new THREE.Shape([
    new THREE.Vector2(-width / 2, -depth / 2),
    new THREE.Vector2(width / 2, -depth / 2),
    new THREE.Vector2(width / 2, depth / 2),
    new THREE.Vector2(-width / 2, depth / 2),
  ]);
  const opening = new THREE.Path();
  opening.absarc(start.x, -start.z, bore, 0, Math.PI * 2, true);
  plate.holes.push(opening);
  const add = (
    geometry: THREE.BufferGeometry,
    name: string,
    color: string,
    metalness: number,
  ) => {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.68 }),
    );
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const bottom = add(
    new THREE.ExtrudeGeometry(plate, {
      depth: s.bottomThickness,
      bevelEnabled: false,
      curveSegments: 14,
    }).rotateX(-Math.PI / 2),
    "leak-controller-outlet-plate",
    "#819097",
    0.25,
  );
  bottom.position.y = start.y;
  const outer = s.guideOuterDiameter / 2;
  const profile = [
    [bore, 0],
    [outer, 0],
    [outer, s.guideHeight],
    [bore, s.guideHeight],
    [bore, 0],
  ];
  const guide = add(
    new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(r, y)),
      32,
    ),
    "leak-controller-outlet-guide",
    "#bab09a",
    0.42,
  );
  guide.position.copy(start).addScaledVector(inward, s.bottomThickness);
  guide.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), inward);
  const innerLead = add(
    new THREE.CylinderGeometry(
      leakDetection.leadRadius,
      leakDetection.leadRadius,
      s.innerLeadLength,
      24,
    ),
    "leak-controller-inner-lead",
    leakDetection.leadColor,
    0.05,
  );
  innerLead.position.copy(start).lerp(innerEnd.clone().sub(root.position), 0.5);
  innerLead.quaternion.copy(guide.quaternion);
}
