import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { devices, racks, deviceById } from "./installation.ts";
import {
  partsForDevice,
  subpartsForDevice,
  modelForDevice,
} from "./catalog.ts";
import { pduById } from "./power-config.ts";

export type RoomLayoutItem = {
  id: string;
  name: string;
  short: string;
  kind: "rack" | "facility" | "entrance";
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
export function roomLayoutObject(id: string, deviceId: string) {
  if (roomLayoutItems.some((item) => item.id === id)) return id;
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
export function roomLayoutMatches(item: RoomLayoutItem, query: string) {
  const content = [
    item.id,
    item.name,
    item.short,
    ...devices
      .filter((d) => d.rackId === item.id)
      .flatMap((d) => [d.id, d.name, modelForDevice(d.id).name]),
  ]
    .join(" ")
    .toLocaleLowerCase();
  return query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .every((word) => content.includes(word));
}
/** 图上方向按固定 X/Z 投影，不声称地理朝向；键盘只移动焦点，Enter 才选择。 */
export function roomLayoutNeighbor(id: string, key: string) {
  const current = roomLayoutItems.find((item) => item.id === id);
  const axis = key === "ArrowLeft" || key === "ArrowRight" ? "x" : "z";
  const sign = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  if (
    !current ||
    !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)
  )
    return id;
  const other = axis === "x" ? "z" : "x";
  return (
    roomLayoutItems
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
