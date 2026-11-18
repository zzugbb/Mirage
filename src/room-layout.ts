import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { devices, racks, deviceById } from "./installation.ts";
import {
  partsForDevice,
  subpartsForDevice,
  modelForDevice,
  categoryNames,
  unitLabel,
} from "./catalog.ts";
import { pduById } from "./power-config.ts";
import {
  lightTrayCrossings,
  ceilingLights,
  housingLength,
  lightProfile,
} from "./ceiling-lights.ts";
import { cableTraySettings, trayOuterWidth } from "./cable-trays.ts";

import { grilleBranches } from "./grille-inspection.ts";
import { floorGrilleRows } from "./floor-grilles.ts";

export type RoomLayoutItem = {
  id: string;
  name: string;
  short: string;
  kind: "rack" | "facility" | "entrance" | "point" | "crossing" | "branch";
  location?: string;
  height?: number;
  labelOffset?: readonly [number, number];
  x: number;
  z: number;
  width: number;
  depth: number;
};
/** 与布置图同向：X向右、Z向下，微小Z偏移避免正俯视的上方向退化。 */
export const roomLayoutCameraDirection = [0, 1, 0.001] as const;
export const roomLayoutSize = {
  width: definition.room.size[0],
  depth: definition.room.size[2],
};
const entrance = definition.room.fixtures.find(
  (item) => item.id === definition.room.entrance.fixtureId,
)!;
/** 仅投影已登记柜体、主要设施与入口；不把空白解释为通道或可用容量。 */
export const roomLayoutItems: RoomLayoutItem[] = [
  ...racks.map((rack) => ({
    id: rack.id,
    name: rack.name,
    short: rack.name.split(" ")[0],
    kind: "rack" as const,
    x: rack.position[0],
    z: rack.position[2],
    width: definition.rack.size[0],
    depth: definition.rack.size[2],
  })),
  ...definition.facilities.map((item) => ({
    id: item.id,
    name: item.name,
    short: item.name === "制冷单元" ? "制冷" : item.name,
    kind: "facility" as const,
    x: item.position[0],
    z: item.position[2],
    width: item.size[0],
    depth: item.size[2],
  })),
  {
    id: entrance.id,
    name: entrance.name,
    short: "入口",
    kind: "entrance",
    x: entrance.position[0],
    z: entrance.position[2],
    width: definition.room.entrance.openingWidth,
    depth: definition.room.wallThickness,
  },
];
export type RoomLayoutScope = "equipment" | "fixtures" | "ceiling" | "grilles";

export const roomLayoutBranches = floorGrilleRows.flatMap((row) =>
  grilleBranches(row.id).map((branch) => ({
    id: branch.rack.id,
    name: branch.rack.name,
    short: branch.rack.name.split(" ")[0],
    kind: "branch" as const,
    x: branch.rack.position[0],
    z: branch.rack.position[2],
    width: definition.rack.size[0],
    depth: definition.rack.size[2],
    location: [
      row.name,
      branch.device.name,
      branch.device.id,
      branch.grille.id,
    ].join(" "),
    branch,
  })),
);
// 图上选择的是关系，两端始终使用已登记的三维设施 ID。
export const roomLayoutCrossings = lightTrayCrossings.map(
  ({ light, tray, difference }) => ({
    id: `${light.id}:${tray.id}`,
    kind: "crossing" as const,
    name: `${light.name} × ${tray.name}`,
    short: tray.name.split(" ")[0],
    x: light.position[0],
    z: tray.position[2],
    width: 0,
    depth: 0,
    lightId: light.id,
    trayId: tray.id,
    difference,
    location: `${light.location} ${tray.location}`,
  }),
);
export const roomLayoutCeilingFootprints = [
  ...ceilingLights.map((light) => ({
    id: light.id,
    name: light.name,
    kind: "light",
    x: light.position[0],
    z: light.position[2],
    width: lightProfile.bodyWidth,
    depth: housingLength(light),
  })),
  ...definition.room.fixtures
    .filter((f) => f.kind === "cable-tray")
    .map((tray) => ({
      id: tray.id,
      name: tray.name,
      kind: "tray",
      x: tray.position[0],
      z: tray.position[2],
      width: cableTraySettings.length,
      depth: trayOuterWidth,
    })),
];
/** 点位只投影配置中心；按钮偏移以避让相邻点，不表示占地或覆盖。 */
export const roomLayoutFixtures: RoomLayoutItem[] = definition.room.fixtures
  .filter((item) =>
    [
      "environment",
      "smoke",
      "access",
      "leak-controller",
      "leak-cable",
    ].includes(item.kind),
  )
  .map((item) => ({
    id: item.id,
    name: item.name,
    short: item.name
      .replace("环境探头", "环境")
      .replace("门禁读卡器", "门禁")
      .replace("漏水检测控制器", "检漏控制")
      .replace("漏水感应线", "感应线"),
    kind: "point",
    x: item.position[0],
    z: item.position[2],
    width: 0,
    depth: 0,
    height: item.position[1],
    location: item.location,
    labelOffset:
      item.kind === "environment"
        ? [40, 20]
        : item.kind === "leak-controller"
          ? [70, -15]
          : item.kind === "leak-cable"
            ? [70, 18]
            : item.id === "smoke-01"
              ? [52, 16]
              : [0, 16],
  }));
export const roomLayoutLeakPath = {
  id: definition.room.leakDetection.cableId,
  lead: definition.room.leakDetection.leadPoints.map(([x, , z]) => [x, z]),
  sensing: definition.room.leakDetection.sensingPoints.map(([x, , z]) => [
    x,
    z,
  ]),
};
export function roomLayoutScopeItems(scope: RoomLayoutScope): RoomLayoutItem[] {
  if (scope === "grilles") return roomLayoutBranches;
  return scope === "ceiling"
    ? roomLayoutCrossings
    : scope === "fixtures"
      ? roomLayoutFixtures
      : roomLayoutItems;
}
export function roomLayoutObject(id: string, deviceId: string) {
  if (
    [...roomLayoutItems, ...roomLayoutFixtures].some((item) => item.id === id)
  )
    return id;
  const device = deviceById(id);
  if (device) return device.rackId;
  const pdu = pduById(id);
  if (pdu) return pdu.rackId;
  if (
    [...partsForDevice(deviceId), ...subpartsForDevice(deviceId)].some(
      (part) => part.id === id,
    )
  )
    return deviceById(deviceId)?.rackId ?? null;
  return null;
}
// 同一行绑定柜位、设备和机型，跨设备的词不能拼成命中。
export const layoutDeviceRows = devices
  .map((device) => {
    const rack = roomLayoutItems.find((item) => item.id === device.rackId)!;
    const model = modelForDevice(device.id);
    const units = unitLabel(device.id);
    return {
      id: device.id,
      name: device.name,
      rackId: rack.id,
      model: model.name,
      units,
      start: device.startUnit,
      search: [
        rack.name,
        rack.id,
        device.id,
        device.name,
        model.name,
        categoryNames[model.category as keyof typeof categoryNames],
        model.units + "U",
      ]
        .join(" ")
        .toLowerCase(),
    };
  })
  .sort((a, b) => b.start - a.start);
export function layoutDeviceMatches(rackId: string, query: string) {
  const words = query.trim().toLowerCase().split(/\s+/);
  return layoutDeviceRows.filter(
    (d) =>
      d.rackId === rackId && words.every((word) => d.search.includes(word)),
  );
}
export function roomLayoutMatches(item: RoomLayoutItem, query: string) {
  if (item.kind === "rack")
    return layoutDeviceMatches(item.id, query).length > 0;
  const content = [item.id, item.name, item.short, item.location ?? ""]
    .join(" ")
    .toLocaleLowerCase();
  return query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .every((word) =>
      (item.kind === "crossing" || item.kind === "branch") &&
      /^[ab]$/.test(word)
        ? item.short[0].toLowerCase() === word
        : content.includes(word),
    );
}
/** 图上方向按固定 X/Z 投影，不声称地理朝向；键盘只移动焦点，Enter 才选择。 */
export function roomLayoutNeighbor(
  id: string,
  key: string,
  scope: RoomLayoutScope = "equipment",
) {
  const items = roomLayoutScopeItems(scope);
  const current = items.find((item) => item.id === id);
  const axis = key === "ArrowLeft" || key === "ArrowRight" ? "x" : "z";
  const sign = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  if (
    !current ||
    !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)
  )
    return id;
  const other = axis === "x" ? "z" : "x";
  return (
    items
      .filter((item) => (item[axis] - current[axis]) * sign > 0.01)
      .sort(
        (a, b) =>
          Math.abs(a[other] - current[other]) * 3 +
          Math.abs(a[axis] - current[axis]) -
          (Math.abs(b[other] - current[other]) * 3 +
            Math.abs(b[axis] - current[axis])),
      )[0]?.id ?? id
  );
}
