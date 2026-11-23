import { Vector3 } from "three";
import { networkMarkers, networkLinkById } from "./network.ts";
import type { AppState } from "./domain.ts";
import type { PatchGuide, PatchSection } from "./network-patch.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

/** 同框只观察当前场景内的两个安装端点，不把隐藏对端带入部件展示台。 */
export function networkViewPoints(
  state: AppState,
  selected: string,
  linkId: string | null,
) {
  if (state.level === "device") return [];
  const markers = networkMarkers(state, selected, linkId);
  if (markers.length !== 2 || markers.some((marker) => !marker.point))
    return [];
  return markers.map((marker) => new Vector3(...marker.point!));
}
export function networkViewFrame(
  points: Vector3[],
  width: number,
  height: number,
  rect: FrameRect,
) {
  // 柜前略俯看，保留两端附近柜面；后排视线从通道上方避开前排柜体。
  const context = points.flatMap((point) => [
    point.clone().add(new Vector3(-0.24, 0, 0)),
    point.clone().add(new Vector3(0.24, 0, 0)),
  ]);
  return observationFrame(
    context,
    new Vector3(0, 0.7, 1),
    width,
    height,
    rect,
    1.5,
    0.08,
  );
}
export const networkViewSource = (linkId: string | null) =>
  networkLinkById(linkId)?.source ?? null;
export type NetworkView = "observe" | PatchSection | PatchGuide;
export type NetworkViewCommand = {
  revision: number;
  action: NetworkView | "return";
};
