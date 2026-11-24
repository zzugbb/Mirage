import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { Vector3 } from "three";
import { observationFrame, type FrameRect } from "./observation-frame.ts";
export type { FrameRect } from "./observation-frame.ts";
import type { AirflowRoute, FlowPoint } from "./airflow.ts";
import { airflowReturnTray } from "./airflow-return-tray.ts";

export const airflowViews = [
  { id: "all", name: "全路径", direction: [1, 1.8, 0.6] },
  { id: "supply", name: "送风与格栅", direction: [-0.25, 1, 1] },
  { id: "intake", name: "设备进风", direction: [0.35, 0.75, 1] },
  { id: "return", name: "柜后回风", direction: [-0.35, 0.9, -1] },
  { id: "return-tray", name: "回风与桥架", direction: [-1, 0.55, 1] },
  { id: "terminals", name: "制冷柜送回风", direction: [0.32, 0.22, 1] },
] as const;
export type AirflowView = (typeof airflowViews)[number]["id"];

/** 沿既有代表路径取景，进风近景同时包含格栅及前后柜面，保持位置上下文。 */
export function airflowViewPoints(
  route: AirflowRoute,
  view: AirflowView,
): FlowPoint[] {
  if (view === "return-tray") {
    const { points } = airflowReturnTray(route);
    return points.length
      ? points.map((point) => point.toArray())
      : airflowViewPoints(route, "return");
  }
  if (view === "terminals") {
    const source = definition.facilities.find(
      (item) => item.id === route.sourceId,
    )!;
    const [x, y, z] = source.position,
      [width, height, depth] = source.size;
    const corners: FlowPoint[] = [];
    for (const dx of [-width / 2, width / 2])
      for (const dy of [-height / 2, height / 2])
        for (const dz of [-depth / 2, depth / 2])
          corners.push([x + dx, y + dy, z + dz]);
    return [
      ...corners,
      ...route.endpoints
        .filter((e) => e.kind === "supply" || e.kind === "receiver")
        .map((e) => e.point),
    ];
  }
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
  legend?: Pick<FrameRect, "top" | "right">,
) {
  const tray = view === "return-tray" ? airflowReturnTray(route) : null;
  if (tray && !tray.crossings.length)
    return airflowViewFrame(route, "return", width, height, rect, legend);
  const points =
    tray?.points ??
    airflowViewPoints(route, view).map((p) => new Vector3(...p));
  const direction = new Vector3(
    ...airflowViews.find((v) => v.id === view)!.direction,
  );
  const fit = (bounds: FrameRect) =>
    observationFrame(
      points,
      direction,
      width,
      height,
      bounds,
      tray ? 1.7 : view === "intake" ? 2.4 : 3,
      tray ? 0.17 : 0.16,
    );
  if (!legend) return fit(rect);
  const beside = { ...rect, left: legend.right + 20 };
  const above = {
    ...rect,
    left: 20,
    bottom: Math.min(rect.bottom, legend.top - 20),
  };
  if (above.bottom <= above.top)
    return fit(beside.left < beside.right ? beside : rect);
  const upperFrame = fit(above);
  if (beside.left >= beside.right) return upperFrame;
  const sideFrame = fit(beside);
  return upperFrame.distance < sideFrame.distance ? upperFrame : sideFrame;
}
