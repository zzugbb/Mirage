import { leakDetection } from "./leak-detection.ts";
import { planarSegmentGap, type Point } from "./planar-gap.ts";

export function rectangularFootprint(position: number[], size: number[]) {
  const [x, , z] = position;
  const [width, , depth] = size;
  return [
    { x: x - width / 2, z: z - depth / 2 },
    { x: x + width / 2, z: z - depth / 2 },
    { x: x + width / 2, z: z + depth / 2 },
    { x: x - width / 2, z: z + depth / 2 },
  ];
}

/** 到实心投影的最短平面距离，默认在并列点中选最靠近段中点的一处。 */
export function footprintSegmentGap(
  corners: Point[],
  start: Point,
  end: Point,
  preferMidpoint = true,
) {
  const [min, , max] = corners;
  const projection = (point: Point) => {
    const x = Math.max(min.x, Math.min(max.x, point.x));
    const z = Math.max(min.z, Math.min(max.z, point.z));
    return {
      from: { x, z },
      to: point,
      distance: Math.hypot(x - point.x, z - point.z),
    };
  };
  const endpointGaps = [projection(start), projection(end)];
  const midpoint = { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 };
  const edgeGaps = corners.map((point, i) =>
    planarSegmentGap([point, corners[(i + 1) % corners.length]], [start, end]),
  );
  const candidates = preferMidpoint
    ? [...edgeGaps, ...endpointGaps, projection(midpoint)]
    : [...endpointGaps.filter((gap) => gap.distance === 0), ...edgeGaps];
  const toMidpoint = ({ x, z }: Point) =>
    Math.hypot(x - midpoint.x, z - midpoint.z);
  return candidates.reduce((best, gap) => {
    if (preferMidpoint && gap.distance === best.distance)
      return toMidpoint(gap.to) < toMidpoint(best.to) ? gap : best;
    return gap.distance < best.distance ? gap : best;
  });
}

export function sensingSegmentsToFootprint(
  position: number[],
  size: number[],
  { preferMidpoint = true } = {},
) {
  const corners = rectangularFootprint(position, size);
  const path = leakDetection.sensingPoints;
  const verticalStation = preferMidpoint ? 0.5 : 0;
  let traveled = 0;
  return path.slice(1).map(([bx, by, bz], i) => {
    const [ax, ay, az] = path[i];
    const gap = footprintSegmentGap(
      corners,
      { x: ax, z: az },
      { x: bx, z: bz },
      preferMidpoint,
    );
    const run = Math.hypot(bx - ax, bz - az);
    const t = run
      ? Math.hypot(gap.to.x - ax, gap.to.z - az) / run
      : verticalStation;
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
