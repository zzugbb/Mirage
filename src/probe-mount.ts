import { Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { environmentRoundFor } from "./environment-rounds.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";
import {
  leftWallId,
  leftWallColumnCenters,
  leftWallColumnSize,
} from "./room-structure.ts";

export const probeMountSettings = definition.room.environmentProbeMount;
const {
  bodySize,
  plateFaceSize,
  ventX,
  ventSize,
  firstVentY,
  ventPitch,
  inspectionTravel,
} = probeMountSettings;

/** 承托底座沿配置立柱的室内面与探头本体后缘的间隙设置。 */
export function probeMountPlacement(probeId: string) {
  const round = environmentRoundFor(probeId);
  if (round?.probe.id !== probeId || round.probe.mountId !== leftWallId)
    return null;
  const [x, y, z] = round.probe.position;
  const [plateHeight, plateWidth] = plateFaceSize;
  const column = leftWallColumnCenters.find(
    ([, cy, cz]) =>
      Math.abs(y - cy) + plateHeight / 2 <= leftWallColumnSize[1] / 2 &&
      Math.abs(z - cz) + plateWidth / 2 <= leftWallColumnSize[2] / 2,
  );
  if (!column) return null;
  const wallX = column[0] + leftWallColumnSize[0] / 2;
  const bodyDepth = bodySize[0];
  const bodyBack = x - bodyDepth / 2;
  const plateThickness = bodyBack - wallX;
  if (plateThickness <= 0) return null;
  return {
    round,
    wallX,
    bodyBack,
    centerHeight: y,
    plateThickness,
    bodyDepth,
    plateCenterX: wallX + plateThickness / 2,
  };
}

export function probeMountInspection(probeId: string, opened = false) {
  const placement = probeMountPlacement(probeId);
  if (!placement) return null;
  const { round, wallX, bodyBack, centerHeight, plateThickness, bodyDepth } =
    placement;
  const [x, , z] = round.probe.position;
  const [plateHeight, plateWidth] = plateFaceSize;
  const bodyTravel = opened ? inspectionTravel : 0;
  const column = new Vector3(wallX, centerHeight + 0.153, z - 0.037);
  const plate = new Vector3(
    bodyBack,
    centerHeight + plateHeight * 0.32,
    z + plateWidth * 0.456,
  );
  const body = new Vector3(
    x + bodyTravel + ventX + ventSize[0] * 0.44,
    centerHeight + firstVentY + 2 * ventPitch,
    z - 0.014,
  );
  const rulerY = centerHeight - plateHeight / 2 - 0.028;
  const rulerAt = (value: number) =>
    new Vector3(value, rulerY, z + plateWidth * 0.48);
  const rulerEnds = [
    rulerAt(wallX),
    rulerAt(bodyBack),
    ...(opened ? [rulerAt(bodyBack + bodyTravel)] : []),
  ];
  const framePoints = [
    column,
    plate,
    rulerAt(wallX),
    rulerAt(bodyBack + inspectionTravel),
    new Vector3(
      x + inspectionTravel + ventX + ventSize[0] / 2,
      centerHeight - bodySize[1] / 2,
      z - bodySize[2] / 2,
    ),
  ];
  return {
    kind: "probe-mount" as const,
    id: probeId,
    title: "环境探头安装核对",
    round,
    opened,
    centerHeight,
    plateThickness,
    bodyDepth,
    bodyTravel,
    upper: { id: probeId, name: round.probe.name, surface: "固定底座" },
    lower: { id: probeId, name: round.probe.name, surface: "探头本体" },
    markers: [
      { id: "probe-mount-column", title: "墙柱内侧", point: column },
      { id: "probe-mount-plate", title: "固定底座", point: plate },
      { id: "probe-mount-body", title: "探头本体", point: body },
    ],
    points: [column, plate, body, ...rulerEnds],
    rulerEnds,
    framePoints,
  };
}

export type ProbeMountInspection = NonNullable<
  ReturnType<typeof probeMountInspection>
>;

export function probeMountViewFrame(
  pair: ProbeMountInspection,
  width: number,
  height: number,
  rect: FrameRect,
) {
  return observationFrame(
    pair.framePoints,
    new Vector3(1, 0.25, 0.9),
    width,
    height,
    rect,
    0.54,
    0.04,
  );
}
