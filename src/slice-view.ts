import { Vector3 } from "three";
import type { SliceDeviceInspection } from "./slice-device.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

/** 取景只依赖安装和切片位置，包含无效输入；时钟与质量变化不移动镜头。 */
export function sliceViewPoints(context: SliceDeviceInspection | null) {
  if (!context?.point) return [];
  const points = [
    context.point,
    ...(context.evidence?.inputs.map((input) => input.position) ?? []),
  ].map((point) => new Vector3(...point));
  // 为标记两侧保留少量柜面，避免变成没有空间上下文的孤立点。
  points.push(
    new Vector3(...context.point).add(new Vector3(-0.12, 0, 0)),
    new Vector3(...context.point).add(new Vector3(0.12, 0, 0)),
  );
  return points;
}
export function sliceViewFrame(
  points: Vector3[],
  width: number,
  height: number,
  rect: FrameRect,
) {
  return observationFrame(
    points,
    new Vector3(0, 0.12, 1),
    width,
    height,
    rect,
    1.15,
    0.04,
  );
}
export type SliceViewCommand = {
  revision: number;
  action: "observe" | "return";
};
