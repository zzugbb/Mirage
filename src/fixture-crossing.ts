import { Vector3 } from "three";
import {
  lightTrayCrossings,
  diffuserBottom,
  lightProfile,
} from "./ceiling-lights.ts";
import { cableTraySettings } from "./cable-trays.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

/** 水平投影交叉处的配置表面高差，不代表构件最小净距或安全结论。 */
export function fixtureCrossing(first: string, second: string) {
  const crossing = lightTrayCrossings.find(
    ({ light, tray }) =>
      (light.id === first && tray.id === second) ||
      (tray.id === first && light.id === second),
  );
  if (!crossing) return null;
  const { light, tray, difference } = crossing;
  const x = light.position[0] + lightProfile.diffuserWidth / 2;
  const z = tray.position[2] + cableTraySettings.railSpacing / 2;
  const upper = new Vector3(x, light.position[1] + diffuserBottom, z);
  const lower = new Vector3(x, upper.y - difference, z);
  return {
    ...crossing,
    id: `${light.id}:${tray.id}`,
    points: [upper, lower],
    markers: [
      { id: "crossing-light", title: "① 灯罩底面", point: upper },
      { id: "crossing-tray", title: "② 侧梁顶面", point: lower },
    ],
  };
}
export type FixtureCrossing = NonNullable<ReturnType<typeof fixtureCrossing>>;
export type CrossingViewCommand = {
  revision: number;
  pair: FixtureCrossing | null;
};
export function crossingViewFrame(
  points: Vector3[],
  width: number,
  height: number,
  rect: FrameRect,
) {
  const context = points.flatMap((point) => [
    point.clone().add(new Vector3(-0.55, 0, -0.4)),
    point.clone().add(new Vector3(0.55, 0, 0.4)),
  ]);
  return observationFrame(
    context,
    new Vector3(0.55, 0.08, 1),
    width,
    height,
    rect,
    2.4,
    0.08,
  );
}
