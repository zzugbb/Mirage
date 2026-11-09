import { Vector3 } from "three";
import { observationFrame, type FrameRect } from "./observation-frame.ts";
export type { FrameRect } from "./observation-frame.ts";
import type { AirflowRoute, FlowPoint } from "./airflow.ts";

export const airflowViews = [
  { id: "all", name: "全路径", direction: [-0.7, 1, 0.9] },
  { id: "supply", name: "送风与格栅", direction: [-0.25, 1, 1] },
  { id: "intake", name: "设备进风", direction: [0.35, 0.75, 1] },
  { id: "return", name: "柜后回风", direction: [-0.35, 0.9, -1] },
] as const;
export type AirflowView = (typeof airflowViews)[number]["id"];

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
  return observationFrame(
    points,
    new Vector3(...airflowViews.find((v) => v.id === view)!.direction),
    width,
    height,
    rect,
    view === "intake" ? 2.4 : 3,
    0.16,
  );
}
