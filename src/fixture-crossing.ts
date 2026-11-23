import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import type { EnvironmentRound } from "./environment-rounds.ts";
import { rackById } from "./installation.ts";
import { trayRow, trayRungBottom, trayRungXs } from "./cable-trays.ts";
import { Vector3 } from "three";
import {
  lightTrayCrossings,
  diffuserBottom,
  housingLength,
  lightProfile,
  type CeilingLight,
} from "./ceiling-lights.ts";
import {
  cableTraySettings,
  traySupportCenterY,
  trayOuterWidth,
} from "./cable-trays.ts";
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
  const x = light.position[0];
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
/** 沿桥架长轴量取端帽外端到最近横托外边；端柜只在本排登记的机柜中选择。 */
export function trayEndSupport(trayId: string, side: -1 | 1) {
  const tray = definition.room.fixtures.find(
    (f) => f.kind === "cable-tray" && f.id === trayId,
  );
  const row = trayRow(trayId);
  if (!tray || !row) return null;
  const s = cableTraySettings;
  const endX = (side * s.length) / 2;
  const supportX = [...s.supportXs].sort(
    (a, b) => Math.abs(a - endX) - Math.abs(b - endX),
  )[0];
  const worldX = tray.position[0] + endX;
  const rack = row.rackIds
    .map(rackById)
    .filter((r) => !!r)
    .sort(
      (a, b) =>
        Math.abs(a.position[0] - worldX) - Math.abs(b.position[0] - worldX),
    )[0];
  if (supportX === undefined || !rack) return null;
  const [x, y, z] = tray.position;
  const cap = new Vector3(worldX, y + s.railCenterY, z + trayOuterWidth / 2);
  const support = new Vector3(
    x + supportX + (side * s.supportDepth) / 2,
    y + traySupportCenterY,
    z + s.supportWidth / 2,
  );
  return {
    kind: "tray-support" as const,
    id: trayId + ":support:" + side,
    title: "桥架端部支吊核对",
    side,
    rack,
    upper: { id: trayId, name: tray.name, surface: "端帽外端" },
    lower: { id: trayId, name: tray.name, surface: "横托外边" },
    horizontal: Math.abs(cap.x - support.x),
    toAxis: Math.abs(endX - supportX),
    points: [cap, support],
    markers: [
      { id: "tray-end-cap", title: "① 端帽外端", point: cap },
      { id: "tray-end-support", title: "② 横托外边", point: support },
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
  // 取侧梁轴线下方的横档底面，避免把正好落在几何外缘的射线算到背景。
  const z = tray.position[2] + cableTraySettings.railSpacing / 2;
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
export const rackRoof = definition.rack.enclosure.roof;

/** 在开口中心的 X 截面比较 Z 坐标。矩形表示开口配置，折线只量取投影。 */
export function roofEntryPlacement(
  trayId: string,
  rackId: string,
  index: number,
) {
  const rack = rackById(rackId);
  const tray = definition.room.fixtures.find(
    (f) => f.id === trayId && f.kind === "cable-tray",
  );
  const offset = rackRoof.entryXs[index];
  if (
    !rack ||
    !tray ||
    !trayRow(trayId)?.rackIds.includes(rackId) ||
    offset === undefined
  )
    return null;
  const x = rack.position[0] + offset;
  const fromEnd = cableTraySettings.length / 2 - Math.abs(x - tray.position[0]);
  if (fromEnd < 0) return null;
  const z = rack.position[2] + rackRoof.entryZ;
  const side = z < tray.position[2] ? -1 : 1;
  const halfWidth =
    (cableTraySettings.railSpacing + cableTraySettings.railSize[0]) / 2 +
    (fromEnd <= cableTraySettings.capLength
      ? cableTraySettings.capOverhang
      : 0);
  const rail = new Vector3(
    x,
    tray.position[1] +
      cableTraySettings.railCenterY +
      cableTraySettings.railSize[1] / 2,
    tray.position[2] + side * halfWidth,
  );
  const roofY =
    rack.position[1] + definition.rack.size[1] + rackRoof.thickness / 2;
  const edge = new Vector3(x, roofY, z - (side * rackRoof.entryDepth) / 2);
  const outline = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(
    ([dx, dz]) =>
      new Vector3(
        x + (dx * rackRoof.entryWidth) / 2,
        roofY,
        z + (dz * rackRoof.entryDepth) / 2,
      ),
  );
  return {
    kind: "roof-entry" as const,
    id: tray.id + ":" + rack.id + ":entry-" + index,
    title: "桥架与柜顶进线口",
    index,
    outline,
    upper: { id: tray.id, name: tray.name, surface: "侧梁外缘" },
    lower: { id: rack.id, name: rack.name, surface: "进线口近缘" },
    points: [rail, edge],
    horizontal: Math.abs(edge.z - rail.z),
    markers: [
      { id: "roof-entry-rail", title: "① 侧梁外缘", point: rail },
      { id: "roof-entry-mouth", title: "② 进线口近缘", point: edge },
    ],
  };
}
/** 配置中心与水平轴线的相对位置。两点不在同一铅垂线上。 */
export function smokeTrayPlacement(round: EnvironmentRound) {
  const [smoke, tray] = round.points;
  const center = new Vector3().fromArray(smoke.position);
  const axis = new Vector3().fromArray(round.trayReference);
  return {
    kind: "smoke-tray" as const,
    round,
    id: `${smoke.id}:${tray.id}`,
    title: "烟感与桥架位置",
    upper: { id: smoke.id, name: smoke.name, surface: "烟感中心" },
    lower: { id: tray.id, name: tray.name, surface: "桥架轴线" },
    difference: center.y - axis.y,
    horizontal: round.smokeOffset,
    boundary: "距离按布置中心计算，构件外缘净距和烟感探测范围未配置。",
    points: [center, axis],
    markers: [
      { id: "placement-smoke", title: "① 烟感中心", point: center },
      { id: "placement-tray", title: "② 桥架轴线", point: axis },
    ],
  };
}
/** 按灯壳底面矩形取水平最近点，烟感使用配置中心。 */
export function nearestHousingPoint(position: number[], light: CeilingLight) {
  const [x, y, z] = light.position;
  const dx = lightProfile.bodyWidth / 2,
    dz = housingLength(light) / 2;
  return new Vector3(
    Math.max(x - dx, Math.min(x + dx, position[0])),
    y + lightProfile.bodyCenterY - lightProfile.bodyHeight / 2,
    Math.max(z - dz, Math.min(z + dz, position[2])),
  );
}

export function smokeLightInspection(
  round: EnvironmentRound,
  lightId?: string,
  view: "housing" | "crossing" = "housing",
) {
  const [smoke, tray] = round.points;
  const center = new Vector3().fromArray(smoke.position);
  const candidates = lightTrayCrossings
    .filter((c) => c.tray.id === tray.id)
    .map(({ light }) => {
      const edge = nearestHousingPoint(smoke.position, light);
      return {
        light,
        edge,
        horizontal: Math.hypot(center.x - edge.x, center.z - edge.z),
      };
    })
    .sort((a, b) => a.horizontal - b.horizontal);
  const target =
    lightId === undefined
      ? candidates[0]
      : candidates.find((c) => c.light.id === lightId);
  if (!target) return null;
  const { light, edge, horizontal } = target;
  const source = fixtureCrossing(light.id, tray.id);
  if (source?.kind !== "light-tray") return null;
  const measurement =
    view === "crossing"
      ? source
      : {
          upper: { id: light.id, name: light.name, surface: "灯壳底面近缘" },
          lower: { id: smoke.id, name: smoke.name, surface: "烟感中心" },
          points: [edge, center],
          markers: [
            { id: "smoke-light-edge", title: "① 灯壳近缘", point: edge },
            { id: "smoke-light-center", title: "② 烟感中心", point: center },
          ],
          difference: edge.y - center.y,
          boundary: "烟感信号未接入，现场净距与探测范围未实测。",
        };
  return {
    ...measurement,
    kind: "smoke-light" as const,
    id: smoke.id + ":" + source.id + ":" + view,
    title: view === "crossing" ? "本排灯桥交叉高度" : "烟感与顶灯位置",
    round,
    light,
    view,
    candidates,
    horizontal,
  };
}
export type SmokeLightInspection = NonNullable<
  ReturnType<typeof smokeLightInspection>
>;

/** 同一桥架上的两处独立取样，保留各自的水平位置与高度基准。 */
export function lightingRound(lightId: string, trayId: string, rackId: string) {
  const source = fixtureCrossing(lightId, trayId);
  const cabinet = rackTrayCrossing(trayId, rackId);
  if (source?.kind !== "light-tray" || source.light.id !== lightId || !cabinet)
    return null;
  const alongX = cabinet.points[0].x - source.points[1].x;
  return {
    ...cabinet,
    kind: "lighting-round" as const,
    title: "顶灯、桥架与柜顶",
    id: source.id + ":" + rackId,
    source,
    alongX,
    points: [...cabinet.points, ...source.points],
    markers: [
      {
        id: "round-light",
        title: `${source.light.name} · 高差 ${Math.abs(source.difference).toFixed(2)} m`,
        point: source.points[0],
      },
      {
        id: "round-roof",
        title: `${cabinet.lower.name} · 高差 ${Math.abs(cabinet.difference).toFixed(2)} m`,
        point: cabinet.points[1],
      },
    ],
  };
}
export const crossingObjectIds = (pair: FixtureCrossing) =>
  pair.kind === "tray-support"
    ? [pair.upper.id]
    : pair.kind === "smoke-light"
      ? [pair.round.points[0].id, pair.round.points[1].id, pair.light.id]
      : pair.kind === "lighting-round"
        ? [pair.source.light.id, pair.upper.id, pair.lower.id]
        : [pair.upper.id, pair.lower.id];
type RackRoofOverview =
  | NonNullable<ReturnType<typeof lightingRound>>
  | NonNullable<ReturnType<typeof rackTrayCrossing>>;
export type RackRoofView =
  | RackRoofOverview
  | (NonNullable<ReturnType<typeof roofEntryPlacement>> & {
      overview: RackRoofOverview;
    });
export type FixtureCrossing =
  | RackRoofView
  | SmokeLightInspection
  | NonNullable<ReturnType<typeof trayEndSupport>>
  | NonNullable<ReturnType<typeof fixtureCrossing>>
  | ReturnType<typeof smokeTrayPlacement>;

export function selectRoofView(
  current: RackRoofView,
  index: number | null,
): RackRoofView | null {
  const overview = current.kind === "roof-entry" ? current.overview : current;
  if (index === null) return overview;
  const entry = roofEntryPlacement(overview.upper.id, overview.lower.id, index);
  return entry && { ...entry, overview };
}
export type CrossingViewCommand = {
  revision: number;
  pair: FixtureCrossing | null;
  dismiss?: boolean;
};
export function crossingDirection(pair: FixtureCrossing) {
  if (pair.kind === "tray-support")
    return new Vector3(pair.side * 0.34, 0.12, 1);
  if (pair.kind === "roof-entry") return new Vector3(0.15, 1, -0.36);
  if (pair.kind === "smoke-light") {
    // 从开敞一侧略向上观察，避开后墙及同排桥架。
    if (pair.view === "crossing") return new Vector3(0.45, -0.14, 1);
    return pair.round.points[0].position[2] < 0
      ? new Vector3(0, -0.2, 1)
      : new Vector3(0.15, -0.1, 1);
  }
  if (pair.kind === "smoke-tray") return new Vector3(0.85, -0.34, -0.9);
  if (pair.kind === "lighting-round" || pair.kind === "light-tray") {
    const tray = pair.kind === "lighting-round" ? pair.source.tray : pair.tray;
    // 从当前柜排的外侧看向桥架，保持少量俯角以兼容轨道相机的极角限制。
    return new Vector3(0.25, 0.1, Math.sign(tray.position[2]) || 1);
  }
  return new Vector3(0.55, 0.08, 1);
}
export function crossingViewFrame(
  points: Vector3[],
  width: number,
  height: number,
  rect: FrameRect,
  direction = new Vector3(0.55, 0.08, 1),
) {
  const context = points.flatMap((point) => [
    point.clone().add(new Vector3(-0.55, 0, -0.4)),
    point.clone().add(new Vector3(0.55, 0, 0.4)),
  ]);
  return observationFrame(context, direction, width, height, rect, 2.4, 0.08);
}
