import { Group, type Mesh, type Object3D } from "three";
import { environmentRounds } from "../environment-rounds.ts";
import {
  probeMountPlacement,
  probeMountSettings as s,
  type ProbeMountInspection,
} from "../probe-mount.ts";

type Box = (
  parent: Object3D,
  size: number[],
  position: number[],
  color: string,
  metalness?: number,
) => Mesh;

export function buildProbeMount(root: Group, box: Box) {
  const placement = probeMountPlacement(root.name);
  if (placement)
    box(
      root,
      [placement.plateThickness, ...s.plateFaceSize],
      [placement.plateCenterX - root.position.x, 0, 0],
      "#6c8087",
      0.4,
    ).name = "probe-mount-plate";
  const movable = new Group();
  movable.name = "probe-mount-body-assembly";
  root.add(movable);
  box(movable, s.bodySize, [0, 0, 0], "#ccd4d0").name = "probe-mount-housing";
  for (let i = 0; i < s.ventCount; i++)
    box(
      movable,
      s.ventSize,
      [s.ventX, s.firstVentY + i * s.ventPitch, 0],
      "#52686e",
    ).name = "probe-mount-vent";
}

export function showProbeMount(
  fixtures: Map<string, Group>,
  pair?: ProbeMountInspection,
) {
  for (const { probe } of environmentRounds) {
    const body = fixtures
      .get(probe.id)
      ?.getObjectByName("probe-mount-body-assembly");
    if (body) body.position.x = pair?.id === probe.id ? pair.bodyTravel : 0;
  }
}
