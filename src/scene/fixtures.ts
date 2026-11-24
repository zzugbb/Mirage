import { buildEntranceLighting } from "./entrance-lighting.ts";
import { buildCondensate } from "./condensate.ts";
import { floorGrilleSettings } from "../floor-grilles.ts";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import {
  lightProfile as lamp,
  housingLength,
  diffuserBottom,
  lightHangerAxis,
  lightHangerSides,
} from "../ceiling-lights.ts";
import { buildRaceway } from "./raceway.ts";
import { buildPatchPanel } from "./patch-panels.ts";
import { buildEntrance } from "./entrance.ts";
import { buildLeakCable, buildLeakFitting } from "./leak-detection.ts";
import { buildCableTray } from "./cable-trays.ts";
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
export function buildRoomFixtures(
  mounts: Map<string, THREE.Group>,
  box: Box,
  glow: Box = box,
) {
  const fixtures = new Map<string, THREE.Group>();
  // 结构设施：仅表示布置，不带状态灯、数值或监测覆盖推断。
  for (const fixture of roomFixtures) {
    const group = new THREE.Group();
    group.name = fixture.id;
    group.position.fromArray(fixture.position);
    group.userData = { entityId: fixture.id, dataStatus: fixture.dataStatus };
    fixtures.set(fixture.id, group);
    mounts.get(fixture.mountId)!.add(group);
    if (fixture.kind.startsWith("condensate-")) {
      buildCondensate(group, fixture.id);
    } else if ("sectionSize" in fixture) {
      buildRaceway(group, fixture, box);
    } else if ("span" in fixture) {
      // 可见几何仍由地面实例批次统一绘制；此包围体只用于整排取景和选中角标。
      const bounds = box(
        group,
        [
          fixture.span,
          floorGrilleSettings.recessDepth,
          floorGrilleSettings.depth,
        ],
        [0, -floorGrilleSettings.recessDepth / 2, 0],
        "#84959b",
      );
      bounds.visible = false;
    } else if ("length" in fixture) {
      box(
        group,
        [lamp.bodyWidth, lamp.bodyHeight, housingLength(fixture)],
        [0, lamp.bodyCenterY, 0],
        "#8391a0",
        0.55,
      ).name = "light-housing";
      glow(
        group,
        [lamp.diffuserWidth, lamp.diffuserHeight, fixture.length],
        [0, diffuserBottom + lamp.diffuserHeight / 2, 0],
        "#d9e7f3",
      ).name = "light-diffuser";
      for (const side of lightHangerSides) {
        const { bottom, drop, z } = lightHangerAxis(fixture, side);
        box(
          group,
          [lamp.hangerWidth, drop, lamp.hangerWidth],
          [0, bottom + drop / 2, z],
          "#74818b",
          0.45,
        ).name = side < 0 ? "light-hanger-negative" : "light-hanger-positive";
      }
    } else if (fixture.kind === "patch-panel") {
      buildPatchPanel(group, fixture.name.split(" ")[0]);
    } else if (
      fixture.kind === "exit-sign" ||
      fixture.kind === "emergency-light"
    ) {
      buildEntranceLighting(group, fixture.kind === "exit-sign");
    } else if (fixture.kind === "entrance") {
      buildEntrance(group);
    } else if (fixture.kind === "cable-tray") {
      buildCableTray(group);
    } else if (fixture.kind === "leak-cable") {
      buildLeakCable(group);
    } else if (fixture.kind === "leak-controller") {
      box(
        group,
        leakDetection.controllerSize,
        [0, 0, 0],
        "#68757b",
        0.25,
      ).name = "leak-controller-body";
      box(group, [0.008, 0.08, 0.12], [0.053, 0.02, 0], "#2c3840", 0.1);
      buildLeakFitting(group, "controller");
    } else if (fixture.kind === "smoke") {
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.085, 0.055, 16),
        new THREE.MeshStandardMaterial({ color: "#d2d6d4", roughness: 0.65 }),
      );
      group.add(shell);
      box(group, [0.08, 0.02, 0.06], [0, -0.035, 0], "#697577");
      box(group, [0.025, 0.5, 0.025], [0, 0.26, 0], "#58676d", 0.5);
    } else if (fixture.kind === "access") {
      box(
        group,
        definition.room.entrance.readerBodySize,
        [0, 0, 0],
        "#26383d",
        0.3,
      );
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
