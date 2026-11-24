import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { leakDetection } from "./leak-detection.ts";
export const condensate = definition.room.condensate;
export const condensateSocket = {
  length: 0.035,
  radius: condensate.pipeRadius * 1.45,
};
export const condensateRimLip = {
  width: 0.006,
  outerDepth: 0.009,
  innerDepth: 0.008,
};
export const condensateOpeningRadius =
  condensate.rimRadius - condensateRimLip.width;
export const condensateMouthInnerRadius = condensate.pipeRadius * 0.78;
export const condensateSource = definition.facilities.find(
  (f) => f.id === condensate.sourceId,
)!;
const [x, , z] = condensateSource.position;
export const outlet = [
  x + condensateSource.size[0] / 2,
  condensate.outletHeight,
  z + condensate.offsetZ,
];
export const sleeveStart = [
  outlet[0] - condensate.sleeveInset,
  outlet[1],
  outlet[2],
];
export const turn = [outlet[0] + condensate.sideReach, outlet[1], outlet[2]];
export const elbow = [
  turn[0],
  outlet[1] - condensate.fall,
  turn[2] + condensate.run,
];
export const mouth = [elbow[0], condensate.mouthHeight, elbow[2]];
export const rim = [mouth[0], condensate.rimHeight, mouth[2]];
export const mouthGap = mouth[1] - rim[1];
export const condensateFloorY = definition.rendering.floor.surfaceY;
export const condensateReceiverBaseThickness = 0.012;
export const condensateReceiverOutletRadius = condensate.stemRadius - 0.005;
const receiverBaseY = condensateFloorY - condensate.rimHeight;
/** 接水斗绕同一剖面生成完整外形与半剖，标高相对斗口。 */
export const condensateReceiverProfile = [
  [condensate.stemRadius * 1.55, receiverBaseY],
  [
    condensate.stemRadius * 1.55,
    receiverBaseY + condensateReceiverBaseThickness,
  ],
  [condensate.stemRadius, receiverBaseY + condensateReceiverBaseThickness],
  [condensate.stemRadius, -condensate.bowlDepth],
  [condensate.rimRadius, -condensateRimLip.outerDepth],
  [condensate.rimRadius, 0],
  [condensateOpeningRadius, 0],
  [condensateOpeningRadius, -condensateRimLip.innerDepth],
  [condensateReceiverOutletRadius, -condensate.bowlDepth],
  [condensateReceiverOutletRadius, receiverBaseY],
];
const fixture = { mountId: "room-01", dataStatus: "not-applicable" };
export const drainStands = condensate.supports.stations.map((station) => {
  const axis = [
    turn[0],
    turn[1] - (condensate.fall * station.offset) / condensate.run,
    turn[2] + station.offset,
  ];
  return {
    ...fixture,
    ...station,
    kind: "condensate-stand",
    location: "制冷单元东侧 · 排水斜管下方",
    focus: condensate.supports.focus,
    axis,
    position: [axis[0], (axis[1] + condensateFloorY) / 2, axis[2]],
  };
});
export const condensateFixtures = [
  { ...fixture, ...condensate.pipe, kind: "condensate-pipe", position: elbow },
  {
    ...fixture,
    ...condensate.receiver,
    kind: "condensate-receiver",
    position: rim,
  },
  ...drainStands,
];
export const isCondensate = (id: string) =>
  condensateFixtures.some((f) => f.id === id);

// 平面距离从斗口轴线量至感应段中心线；沿线里程仍按三维配置折线累计。
function sensingProjections(points: number[][]) {
  let traveled = 0;
  return points.slice(1).map(([bx, by, bz], index) => {
    const [ax, ay, az] = points[index];
    const dx = bx - ax,
      dy = by - ay,
      dz = bz - az;
    const planarLengthSq = dx * dx + dz * dz;
    const t = planarLengthSq
      ? Math.max(
          0,
          Math.min(
            1,
            ((rim[0] - ax) * dx + (rim[2] - az) * dz) / planarLengthSq,
          ),
        )
      : 0;
    const point = [ax + t * dx, ay + t * dy, az + t * dz];
    const length = Math.hypot(dx, dy, dz);
    const fromJoint = traveled + t * length;
    traveled += length;
    return {
      segment: index + 1,
      point,
      fromJoint,
      distance: distanceToReceiver(point),
    };
  });
}
export function distanceToReceiver(point: number[]) {
  return Math.hypot(point[0] - rim[0], point[2] - rim[2]);
}
export const condensateSensingSegments = sensingProjections(
  leakDetection.sensingPoints,
);
export const nearestCondensateSensing = condensateSensingSegments.reduce(
  (nearest, candidate) =>
    candidate.distance < nearest.distance ? candidate : nearest,
);
