import { buildLeakCable } from "./leak-detection.ts";
import { leakDetection } from "../leak-detection.ts";
import * as THREE from "three";
import { roomFixtures } from "../fixtures.ts";
type Box = (
  parent: THREE.Object3D,
  size: number[],
  position: number[],
  color: string,
  metalness?: number,
) => THREE.Mesh;
export function buildRoomFixtures(mounts: Map<string, THREE.Group>, box: Box) {
  const fixtures = new Map<string, THREE.Group>();
  // 结构设施：仅表示布置，不带状态灯、数值或监测覆盖推断。
  for (const fixture of roomFixtures) {
    const group = new THREE.Group();
    group.name = fixture.id;
    group.position.fromArray(fixture.position);
    group.userData = { entityId: fixture.id, dataStatus: fixture.dataStatus };
    fixtures.set(fixture.id, group);
    mounts.get(fixture.mountId)!.add(group);
    if (fixture.kind === "leak-cable") {
      buildLeakCable(group);
    } else if (fixture.kind === "leak-controller") {
      box(group, leakDetection.controllerSize, [0, 0, 0], "#68757b", 0.25);
      box(group, [0.008, 0.08, 0.12], [0.053, 0.02, 0], "#2c3840", 0.1);
      box(group, [0.026, 0.018, 0.026], [0.02, -0.11, 0], "#303d45", 0.15);
    } else if (fixture.kind === "smoke") {
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.085, 0.055, 16),
        new THREE.MeshStandardMaterial({ color: "#d2d6d4", roughness: 0.65 }),
      );
      group.add(shell);
      box(group, [0.08, 0.02, 0.06], [0, -0.035, 0], "#697577");
      box(group, [0.025, 0.5, 0.025], [0, 0.26, 0], "#58676d", 0.5);
    } else if (fixture.kind === "access") {
      box(group, [0.13, 0.23, 0.055], [0, 0, 0], "#26383d", 0.3);
      box(group, [0.085, 0.07, 0.008], [0, 0.04, 0.031], "#7d9697");
      box(group, [0.045, 0.045, 0.009], [0, -0.055, 0.032], "#131e23");
    } else {
      box(group, [0.065, 0.16, 0.11], [0, 0, 0], "#ccd4d0");
      for (let k = 0; k < 4; k++)
        box(
          group,
          [0.008, 0.008, 0.07],
          [0.036, -0.04 + k * 0.025, 0],
          "#52686e",
        );
    }
  }
  return fixtures;
}
