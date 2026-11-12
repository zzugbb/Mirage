import { Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { rackById } from "./installation.ts";
import { inspectRackSpace, type RackUnitRange } from "./rack-space.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

export type RangeView = "front" | "rear";
export type RangeViewCommand = {
  revision: number;
  action: RangeView | "return";
};

/** 柜面安装边界与括线短标一起取景；不跟随设备抽出或遥测变化。 */
export function rangeViewPoints(range: RackUnitRange | null, side: RangeView) {
  if (!range || !inspectRackSpace(range)) return [];
  const rack = rackById(range.rackId)!;
  const { size, unitOrigin, unitPitch } = definition.rack;
  const z = (side === "front" ? 1 : -1) * (size[2] / 2 + 0.035);
  const points: Vector3[] = [];
  for (const x of [-size[0] / 2, size[0] / 2 + 0.4])
    for (const u of [range.first - 0.5, range.last + 0.5])
      points.push(
        new Vector3(x, unitOrigin + u * unitPitch, z).add(
          new Vector3(...rack.position),
        ),
      );
  return points;
}
export function rangeViewFrame(
  points: Vector3[],
  side: RangeView,
  width: number,
  height: number,
  rect: FrameRect,
) {
  return observationFrame(
    points,
    new Vector3(side === "front" ? 0.12 : -0.12, 0, side === "front" ? 1 : -1),
    width,
    height,
    rect,
    1.1,
    0.07,
  );
}
