import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { leakDetection } from "./leak-detection.ts";
export const condensate = definition.room.condensate;
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
const fixture = { mountId: "room-01", dataStatus: "not-applicable" };
export const condensateFixtures = [
  { ...fixture, ...condensate.pipe, kind: "condensate-pipe", position: elbow },
  {
    ...fixture,
    ...condensate.receiver,
    kind: "condensate-receiver",
    position: rim,
  },
];
export const isCondensate = (id: string) =>
  condensateFixtures.some((f) => f.id === id);

// 平面距离从斗口轴线量至感应段中心线；沿线里程仍按三维配置折线累计。
function nearestSensingPoint(points: number[][]) {
  let distance = Infinity,
    fromJoint = 0,
    traveled = 0,
    segment = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay, az] = points[i - 1],
      [bx, by, bz] = points[i];
    const dx = bx - ax,
      dz = bz - az,
      lengthSq = dx * dx + dz * dz;
    const t = lengthSq
      ? Math.max(
          0,
          Math.min(1, ((rim[0] - ax) * dx + (rim[2] - az) * dz) / lengthSq),
        )
      : 0;
    const gap = Math.hypot(rim[0] - ax - t * dx, rim[2] - az - t * dz);
    const length = Math.hypot(dx, by - ay, dz);
    if (gap < distance) {
      distance = gap;
      fromJoint = traveled + t * length;
      segment = i;
    }
    traveled += length;
  }
  return { distance, fromJoint, segment };
}
export const nearestCondensateSensing = nearestSensingPoint(
  leakDetection.sensingPoints,
);
