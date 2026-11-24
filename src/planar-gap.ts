export type Point = { x: number; z: number };
const difference = (a: Point, b: Point) => ({ x: a.x - b.x, z: a.z - b.z });
const cross = (a: Point, b: Point) => a.x * b.z - a.z * b.x;
function project(p: Point, [a, b]: [Point, Point]) {
  const d = difference(b, a),
    v = difference(p, a);
  const length2 = d.x * d.x + d.z * d.z;
  const t = length2
    ? Math.min(1, Math.max(0, (v.x * d.x + v.z * d.z) / length2))
    : 0;
  return { x: a.x + t * d.x, z: a.z + t * d.z };
}

/** 两条有限线段在机房 X/Z 平面上的最近点对。 */
export function planarSegmentGap(
  first: [Point, Point],
  second: [Point, Point],
) {
  const f = difference(first[1], first[0]),
    r = difference(second[1], second[0]);
  const between = difference(second[0], first[0]);
  const determinant = cross(f, r);
  if (determinant !== 0) {
    const t = cross(between, r) / determinant,
      u = cross(between, f) / determinant;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const point = { x: first[0].x + t * f.x, z: first[0].z + t * f.z };
      return { from: point, to: point, distance: 0 };
    }
  }
  const candidates = [
    ...first.map((p) => ({ from: p, to: project(p, second) })),
    ...second.map((p) => ({ from: project(p, first), to: p })),
  ].map((pair) => ({
    ...pair,
    distance: Math.hypot(pair.from.x - pair.to.x, pair.from.z - pair.to.z),
  }));
  return candidates.reduce((best, pair) =>
    pair.distance < best.distance ? pair : best,
  );
}

type Rectangle = [Point, Point, Point, Point];

/** 两个实心矩形的平面间距；边缘相交、接触或一方包含另一方时为零。 */
export function planarRectangleGap(first: Rectangle, second: Rectangle) {
  const edges = (rectangle: Rectangle): [Point, Point][] =>
    rectangle.map((point, i) => [point, rectangle[(i + 1) % 4]]);
  const inside = (point: Point, sidesOfRectangle: [Point, Point][]) => {
    const sides = sidesOfRectangle.map(([a, b]) =>
      cross(difference(b, a), difference(point, a)),
    );
    return sides.every((side) => side >= 0) || sides.every((side) => side <= 0);
  };
  const firstEdges = edges(first);
  const secondEdges = edges(second);
  if (inside(first[0], secondEdges))
    return { from: first[0], to: first[0], distance: 0 };
  if (inside(second[0], firstEdges))
    return { from: second[0], to: second[0], distance: 0 };
  return firstEdges
    .flatMap((a) => secondEdges.map((b) => planarSegmentGap(a, b)))
    .reduce((best, pair) => (pair.distance < best.distance ? pair : best));
}
