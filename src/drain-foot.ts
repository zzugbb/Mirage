import { condensate, drainStands } from "./condensate.ts";
import { leakDetection } from "./leak-detection.ts";
import { planarSegmentGap, type Point } from "./planar-gap.ts";

export type DrainStand = (typeof drainStands)[number];

export function footCorners(stand: DrainStand) {
  const [x, , z] = stand.axis;
  const [width, , depth] = condensate.supports.footSize;
  return [
    { x: x - width / 2, z: z - depth / 2 },
    { x: x + width / 2, z: z - depth / 2 },
    { x: x + width / 2, z: z + depth / 2 },
    { x: x - width / 2, z: z + depth / 2 },
  ];
}

export function footSegmentGap(corners: Point[], start: Point, end: Point) {
  const [min, , max] = corners;
  for (const p of [start, end]) {
    if (p.x >= min.x && p.x <= max.x && p.z >= min.z && p.z <= max.z)
      return { from: p, to: p, distance: 0 };
  }
  const gaps = corners.map((c, i) =>
    planarSegmentGap([c, corners[(i + 1) % corners.length]], [start, end]),
  );
  return gaps.reduce((best, gap) =>
    gap.distance < best.distance ? gap : best,
  );
}

export function standSensingSegments(stand: DrainStand) {
  let traveled = 0;
  const corners = footCorners(stand);
  const path = leakDetection.sensingPoints;
  return path.slice(1).map(([bx, by, bz], i) => {
    const [ax, ay, az] = path[i];
    const gap = footSegmentGap(corners, { x: ax, z: az }, { x: bx, z: bz });
    const run = Math.hypot(bx - ax, bz - az);
    const t = run ? Math.hypot(gap.to.x - ax, gap.to.z - az) / run : 0;
    const length = Math.hypot(run, by - ay);
    const fromJoint = traveled + t * length;
    traveled += length;
    return {
      segment: i + 1,
      fromJoint,
      point: [gap.to.x, ay + t * (by - ay), gap.to.z],
      edge: gap.from,
      distance: gap.distance,
    };
  });
}
