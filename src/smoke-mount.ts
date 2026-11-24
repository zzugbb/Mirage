import { Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import type { EnvironmentRound } from "./environment-rounds.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

export const smokeMount = definition.room.smokeMount;

/** 就位时本体上表面与承托座底面重合，安装板上表面与机房顶标高齐平。 */
export function smokeMountHeights(originY: number, opened = false) {
  const bodyDrop = opened ? smokeMount.inspectionDrop : 0;
  const seatHeight = originY + smokeMount.bodyHeight / 2;
  return {
    bodyDrop,
    bodyTop: seatHeight - bodyDrop,
    seatHeight,
    ceilingHeight: definition.room.size[1],
  };
}

export function smokeMountInspection(round: EnvironmentRound, opened = false) {
  const [smoke, tray] = round.points;
  const [x, y, z] = smoke.position;
  const heights = smokeMountHeights(y, opened);
  const { bodyTop, seatHeight, ceilingHeight } = heights;
  const direction = new Vector3(
    x < 0 ? 0.39 : -0.39,
    0.14,
    Math.sign(z - tray.position[2]) || -1,
  );
  const facing = direction.clone().setY(0).normalize();
  const screenRight = new Vector3(facing.z, 0, -facing.x);
  const at = (height: number, face = 0, side = 0) =>
    new Vector3(x, height, z)
      .addScaledVector(facing, face)
      .addScaledVector(screenRight, side);
  const body = at(bodyTop, 0.054, -0.073);
  const seat = at(seatHeight + smokeMount.seatThickness * 0.55, 0.051, 0.043);
  const [plateWidth, plateHeight, plateDepth] = smokeMount.plateSize;
  const plate = at(ceilingHeight - plateHeight / 2, 0.049, 0.016);
  const ceiling = [
    [-1, -1],
    [-1, 1],
    [1, 1],
    [1, -1],
  ].map(
    ([sideX, sideZ]) =>
      new Vector3(
        x + sideX * (plateWidth / 2 + 0.047),
        ceilingHeight,
        z + sideZ * (plateDepth / 2 + 0.047),
      ),
  );
  const ruler = [...new Set([bodyTop, seatHeight, ceilingHeight])].map(
    (height) => [at(height, 0, 0.164), at(height, 0, 0.189)],
  );
  const framePoints = [
    ...ceiling,
    at(ceilingHeight, 0, 0.189),
    at(y - smokeMount.bodyHeight / 2 - smokeMount.inspectionDrop, 0, 0.189),
    at(y - smokeMount.bodyHeight / 2 - smokeMount.inspectionDrop, 0, -0.105),
  ];
  return {
    kind: "smoke-mount" as const,
    id: smoke.id,
    title: "烟感安装座核对",
    round,
    opened,
    ...heights,
    configuredDrop: smokeMount.inspectionDrop,
    upper: { id: smoke.id, name: smoke.name, surface: "顶板底面" },
    lower: { id: smoke.id, name: smoke.name, surface: "本体上表面" },
    boundary: "原创安装示意。烟感信号未接入，现场安装参数与消防联动待核实。",
    points: [at(ceilingHeight), at(bodyTop), body, seat, plate],
    markers: [
      { id: "smoke-mount-body", title: "本体上表面", point: body },
      { id: "smoke-mount-seat", title: "固定承托座", point: seat },
      { id: "smoke-mount-ceiling", title: "顶板安装面", point: plate },
    ],
    direction,
    ceiling,
    ruler,
    framePoints,
  };
}

export type SmokeMountInspection = ReturnType<typeof smokeMountInspection>;

export function smokeMountViewFrame(
  pair: SmokeMountInspection,
  width: number,
  height: number,
  rect: FrameRect,
) {
  return observationFrame(
    pair.framePoints,
    pair.direction,
    width,
    height,
    rect,
    1.28,
    0.056,
  );
}
