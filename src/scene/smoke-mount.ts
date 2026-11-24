import * as THREE from "three";
import { environmentRounds } from "../environment-rounds.ts";
import {
  smokeMount,
  smokeMountHeights,
  type SmokeMountInspection,
} from "../smoke-mount.ts";

type Box = (
  parent: THREE.Object3D,
  size: number[],
  position: number[],
  color: string,
  metalness?: number,
) => THREE.Mesh;

export function buildSmokeMount(root: THREE.Group, box: Box) {
  const {
    bodyUpperRadius,
    bodyLowerRadius,
    bodyHeight,
    seatRadius,
    seatThickness,
    stemWidth,
    plateSize,
  } = smokeMount;
  const mountY = root.position.y;
  const { seatHeight, ceilingHeight } = smokeMountHeights(mountY);
  const seatBottom = seatHeight - mountY;
  const seatTop = seatBottom + seatThickness;
  const plateBottom = ceilingHeight - mountY - plateSize[1];
  const body = new THREE.Group();
  body.name = "smoke-mount-body-assembly";
  root.add(body);
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(
      bodyUpperRadius,
      bodyLowerRadius,
      bodyHeight,
      24,
    ),
    new THREE.MeshStandardMaterial({ color: "#d2d6d4", roughness: 0.65 }),
  );
  housing.name = "smoke-mount-body";
  housing.castShadow = housing.receiveShadow = true;
  body.add(housing);
  box(body, [0.08, 0.02, 0.06], [0, -0.035, 0], "#697577");
  const seat = new THREE.Mesh(
    new THREE.CylinderGeometry(seatRadius, seatRadius, seatThickness, 24),
    new THREE.MeshStandardMaterial({
      color: "#83979e",
      roughness: 0.62,
      metalness: 0.25,
    }),
  );
  seat.name = "smoke-mount-seat";
  seat.position.y = seatBottom + seatThickness / 2;
  seat.castShadow = seat.receiveShadow = true;
  root.add(seat);
  box(
    root,
    [stemWidth, plateBottom - seatTop, stemWidth],
    [0, (seatTop + plateBottom) / 2, 0],
    "#58676d",
    0.28,
  ).name = "smoke-mount-stem";
  box(
    root,
    plateSize,
    [0, plateBottom + plateSize[1] / 2, 0],
    "#84969b",
    0.25,
  ).name = "smoke-mount-plate";
}

/** 只移动本体装配，原位承托座与安装板保持固定。 */
export function showSmokeMount(
  fixtures: Map<string, THREE.Group>,
  pair?: SmokeMountInspection,
) {
  for (const {
    points: [smoke],
  } of environmentRounds) {
    const body = fixtures
      .get(smoke.id)
      ?.getObjectByName("smoke-mount-body-assembly");
    if (body)
      body.position.y =
        pair?.id === smoke.id && pair.opened ? -pair.bodyDrop : 0;
  }
}
