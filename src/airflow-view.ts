import { Vector3 } from "three";
import type { AirflowRoute, FlowPoint } from "./airflow.ts";

export const airflowViews = [
  { id: "all", name: "全路径", direction: [-0.7, 1, 0.9] },
  { id: "supply", name: "送风与格栅", direction: [-0.25, 1, 1] },
  { id: "intake", name: "设备进风", direction: [0.35, 0.75, 1] },
  { id: "return", name: "柜后回风", direction: [-0.35, 0.9, -1] },
] as const;
export type AirflowView = (typeof airflowViews)[number]["id"];
export type FrameRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** 沿既有代表路径取景，进风近景同时包含格栅及前后柜面，保持位置上下文。 */
export function airflowViewPoints(
  route: AirflowRoute,
  view: AirflowView,
): FlowPoint[] {
  if (view === "intake")
    return [
      route.floorGrille.position,
      ...route.segments.find((s) => s.kind === "through")!.points,
    ];
  return route.segments
    .filter((s) => view === "all" || s.kind === view)
    .flatMap((s) => s.points);
}

/** 补齐长直段中点，避免只检查转折点而漏过横穿路径的灯具与桥架。 */
export function airflowViewSightPoints(route: AirflowRoute, view: AirflowView) {
  const points = airflowViewPoints(route, view).map((p) => new Vector3(...p));
  const samples: Vector3[] = [];
  for (let i = 1; i < points.length; i++) {
    const steps = Math.max(
      1,
      Math.ceil(points[i - 1].distanceTo(points[i]) / 0.15),
    );
    for (let step = 0; step < steps; step++)
      samples.push(points[i - 1].clone().lerp(points[i], step / steps));
  }
  if (points.length) samples.push(points.at(-1)!);
  return samples;
}

/** 将路径投影到控件之外的矩形。偏移观察中心，保留原透视与深度遮挡。 */
export function airflowViewFrame(
  route: AirflowRoute,
  view: AirflowView,
  width: number,
  height: number,
  rect: FrameRect,
) {
  const points = airflowViewPoints(route, view).map((p) => new Vector3(...p));
  const min = new Vector3(Infinity, Infinity, Infinity),
    max = min.clone().negate();
  for (const point of points) {
    min.min(point);
    max.max(point);
  }
  const center = min.clone().add(max).multiplyScalar(0.5);
  const direction = new Vector3(
    ...airflowViews.find((v) => v.id === view)!.direction,
  ).normalize();
  const right = new Vector3(direction.z, 0, -direction.x).normalize();
  const up = direction.clone().cross(right);
  const tangent = Math.tan((40 * Math.PI) / 360),
    horizontal = (tangent * width) / height;
  const l = (2 * rect.left) / width - 1,
    r = (2 * rect.right) / width - 1;
  const b = 1 - (2 * rect.bottom) / height,
    t = 1 - (2 * rect.top) / height;
  const cx = (l + r) / 2,
    cy = (b + t) / 2;
  let distance = view === "intake" ? 2.4 : 3;
  // 端点外留少量空间，容纳方向标、柜面细框及地板格栅。
  for (const point of points)
    for (const dx of [-0.16, 0.16])
      for (const dy of [-0.16, 0.16])
        for (const dz of [-0.16, 0.16]) {
          const p = point
            .clone()
            .add(new Vector3(dx, dy, dz))
            .sub(center);
          const x = p.dot(right),
            y = p.dot(up),
            z = p.dot(direction);
          distance = Math.max(
            distance,
            (x + r * z * horizontal) / ((r - cx) * horizontal),
            (-x - l * z * horizontal) / ((cx - l) * horizontal),
            (y + t * z * tangent) / ((t - cy) * tangent),
            (-y - b * z * tangent) / ((cy - b) * tangent),
          );
        }
  const target = center
    .addScaledVector(right, -cx * distance * horizontal)
    .addScaledVector(up, -cy * distance * tangent);
  return {
    target,
    position: target.clone().addScaledVector(direction, distance),
    distance,
  };
}
