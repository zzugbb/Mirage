import { buildEntranceLighting } from "./entrance-lighting.ts";
import { buildCondensate } from "./condensate.ts";
import { floorGrilleSettings } from "../floor-grilles.ts";
import definition from "../../assets/public/scenes/room-01.json" with { type: "json" };
import {
  lightProfile as lamp,
  housingLength,
  diffuserBottom,
} from "../ceiling-lights.ts";
import { racewayCoverThickness } from "../panel-raceway.ts";
import { buildPatchPanel } from "./patch-panels.ts";
import { buildEntrance } from "./entrance.ts";
import { buildLeakCable } from "./leak-detection.ts";
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
      const [w, h, d] = fixture.sectionSize;
      const cover = racewayCoverThickness;
      box(group, [w, h, d - cover], [0, 0, -cover / 2], "#596d76", 0.35);
      const cap = box(
        group,
        [w - 0.004, h - 0.004, cover],
        [0, 0, (d - cover) / 2],
        "#afbab9",
        0.35,
      );
      cap.name = "raceway-cover";
      // 接缝压条随槽盖转向。底端压条紧邻入盒处，横段两端压条标出转折。
      const horizontal = w > h;
      for (const side of [-1, 1]) {
        const along = side * ((horizontal ? w : h) / 2 - 0.044);
        box(
          group,
          horizontal ? [0.022, h, 0.004] : [w, 0.022, 0.004],
          horizontal ? [along, 0, d / 2 + 0.002] : [0, along, d / 2 + 0.002],
          "#7a898f",
          0.4,
        );
      }
    } else if ("span" in fixture) {
      // 可见几何仍由三个实例批次统一绘制；此包围体只用于整排取景和选中角标。
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
      );
      glow(
        group,
        [lamp.diffuserWidth, lamp.diffuserHeight, fixture.length],
        [0, diffuserBottom + lamp.diffuserHeight / 2, 0],
        "#d9e7f3",
      );
      const housingTop = lamp.bodyCenterY + lamp.bodyHeight / 2;
      const drop = definition.room.size[1] - fixture.position[1] - housingTop;
      for (const side of [-1, 1])
        box(
          group,
          [lamp.hangerWidth, drop, lamp.hangerWidth],
          [
            0,
            housingTop + drop / 2,
            side * (fixture.length / 2 - lamp.hangerInset),
          ],
          "#74818b",
          0.45,
        );
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
