import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { rackById } from "./installation.ts";
import { trayRow, trayRungBottom, trayRungXs } from "./cable-trays.ts";
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
  if (!crossing) return rackTrayCrossing(first, second);
  const { light, tray, difference } = crossing;
  const x = light.position[0] + lightProfile.diffuserWidth / 2;
  const z = tray.position[2] + cableTraySettings.railSpacing / 2;
  const upper = new Vector3(x, light.position[1] + diffuserBottom, z);
  const lower = new Vector3(x, upper.y - difference, z);
  return {
    ...crossing,
    kind: "light-tray" as const,
    title: "交叉高度核对",
    upper: { id: light.id, name: light.name, surface: "灯罩底面" },
    lower: { id: tray.id, name: tray.name, surface: "侧梁顶面" },
    boundary:
      "仅比较交叉处两种配置表面，不含吊杆、横档及附件的最小净距，不作施工或安全判断。",
    id: `${light.id}:${tray.id}`,
    points: [upper, lower],
    markers: [
      { id: "crossing-light", title: "① 灯罩底面", point: upper },
      { id: "crossing-tray", title: "② 侧梁顶面", point: lower },
    ],
  };
}
/** 只核对已登记柜排对应；上端必须落在实际横档，下端位于实心柜顶板。 */
function rackTrayCrossing(first: string, second: string) {
  const rack = rackById(first) ?? rackById(second);
  const trayId = rack?.id === first ? second : first;
  const tray = definition.room.fixtures.find(
    (f) => f.id === trayId && f.kind === "cable-tray",
  );
  if (!rack || !tray || !trayRow(trayId)?.rackIds.includes(rack.id))
    return null;
  const halfWidth = definition.rack.size[0] / 2;
  const xs = trayRungXs()
    .map((x) => x + tray.position[0])
    .filter((x) => Math.abs(x - rack.position[0]) <= halfWidth)
    .sort(
      (a, b) => Math.abs(a - rack.position[0]) - Math.abs(b - rack.position[0]),
    );
  if (!xs.length) return null;
  const z = tray.position[2] + cableTraySettings.rungSize[2] / 2;
  if (Math.abs(z - rack.position[2]) > definition.rack.size[2] / 2) return null;
  const upper = new Vector3(xs[0], trayRungBottom(tray.position[1]), z);
  const lower = new Vector3(
    xs[0],
    rack.position[1] +
      definition.rack.size[1] +
      definition.rack.enclosure.roof.thickness / 2,
    z,
  );
  return {
    kind: "rack-tray" as const,
    title: "柜顶与桥架核对",
    id: `${tray.id}:${rack.id}`,
    upper: { id: tray.id, name: tray.name, surface: "横档底面" },
    lower: { id: rack.id, name: rack.name, surface: "柜顶板表面" },
    difference: upper.y - lower.y,
    points: [upper, lower],
    markers: [
      { id: "crossing-tray", title: "① 横档底面", point: upper },
      { id: "crossing-rack", title: "② 柜顶板表面", point: lower },
    ],
    boundary:
      "只比较当前配置横档底面与柜顶板表面的高度，不含线缆、吊装附件或其他障碍物；不是最小净距、施工或安全结论，也不表示桥架与机柜已接线。",
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
