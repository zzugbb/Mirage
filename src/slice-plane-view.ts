import { Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { racks } from "./installation.ts";
import {
  slicePoint,
  sliceRackRows,
  type TemperatureSlice,
} from "./temperature-slice.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

/** 整排取景包含切面四角与柜体上下沿，不随温度、有效覆盖或选择变化。 */
export function slicePlanePoints(slice: TemperatureSlice | null) {
  if (!slice || slice.orientation !== "vertical") return [];
  const row = sliceRackRows.find((item) => item.id === slice.rowId);
  if (!row) return [];
  const points: Vector3[] = [];
  for (const u of [0, 1])
    for (const v of [0, 1])
      points.push(new Vector3(...slicePoint(slice.frame, u, v)));
  // 切面内部也采样视线，避免长条顶灯从柜间穿过时漏判遮挡。
  for (const v of [0, 0.5, 1])
    points.push(new Vector3(...slicePoint(slice.frame, 0.5, v)));
  const steps = Math.ceil(Math.hypot(...slice.frame.u) / 0.4);
  for (let i = 0; i <= steps; i++)
    for (const v of [0, 0.5, 1])
      points.push(new Vector3(...slicePoint(slice.frame, i / steps, v)));
  for (const rack of racks.filter((item) => row.rackIds.includes(item.id)))
    for (const y of [0, definition.rack.size[1]])
      points.push(
        new Vector3(
          rack.position[0],
          rack.position[1] + y,
          rack.position[2] + definition.rack.size[2] / 2,
        ),
      );
  return points;
}

export function slicePlaneFrame(
  points: Vector3[],
  width: number,
  height: number,
  rect: FrameRect,
) {
  // 同向双排样板从上方看向柜前，后排视线越过前排，仍保留真实深度遮挡。
  return observationFrame(
    points,
    new Vector3(0, 0.85, 1),
    width,
    height,
    rect,
    3,
    0.1,
  );
}
