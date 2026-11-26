import roomDefinition from "../assets/public/scenes/room-01.json" with { type: "json" };
import type { SpatialReading } from "./spatial.ts";

export type SpacePoint = [number, number, number];
export type CampusKind =
  "campus" | "building" | "floor" | "room" | "support" | "outdoor";
export type CampusNode = {
  id: string;
  parent: string | null;
  name: string;
  kind: CampusKind;
  origin: SpacePoint;
  size: SpacePoint;
  yaw: number;
  deviceCount?: number;
  description: string;
};

export const campusNodes: readonly CampusNode[] = [
  {
    id: "campus-01",
    parent: null,
    name: "样板园区",
    kind: "campus",
    origin: [0, 0, 0],
    size: [64, 0, 46],
    yaw: 0,
    description:
      "一栋数据中心建筑、服务道路、室外设备和维护场坪组成的原创样板。",
  },
  {
    id: "building-a",
    parent: "campus-01",
    name: "A 栋",
    kind: "building",
    origin: [-7, 0, -4],
    size: [34, 10, 24],
    yaw: Math.PI / 2,
    description: "样板数据中心，包含一层样板机房和二层辅助区域。",
  },
  {
    id: "floor-a-01",
    parent: "building-a",
    name: "01 层",
    kind: "floor",
    origin: [0, 0, 0],
    size: [34, 5, 24],
    yaw: 0,
    description: "机房及邻接运维区域。机房尺寸与柜内工作台共用登记。",
  },
  {
    id: "floor-a-02",
    parent: "building-a",
    name: "02 层",
    kind: "floor",
    origin: [0, 5, 0],
    size: [34, 5, 24],
    yaw: 0,
    description: "样板设备夹层，登记供配电辅助区域。",
  },
  {
    id: "room-01",
    parent: "floor-a-01",
    name: "01号机房",
    kind: "room",
    origin: [-6.5, 0, -2.5],
    size: [
      roomDefinition.room.size[0],
      roomDefinition.room.size[1],
      roomDefinition.room.size[2],
    ],
    yaw: 0,
    deviceCount: roomDefinition.installation.devices.length,
    description: "已有样板机房。进入后可继续查机柜、设备、容量和环境测点。",
  },
  {
    id: "support-a-01",
    parent: "floor-a-01",
    name: "运维支持区",
    kind: "support",
    origin: [9, 0, -2.5],
    size: [10, 4.2, 12],
    yaw: 0,
    description: "样板辅助用房，当前登记平面位置及尺寸。",
  },
  {
    id: "support-a-02",
    parent: "floor-a-02",
    name: "供配电辅助区",
    kind: "support",
    origin: [2, 0, -1],
    size: [22, 4.2, 13],
    yaw: 0,
    description: "样板辅助区，当前登记平面位置及尺寸。",
  },
  {
    id: "outdoor-heat",
    parent: "campus-01",
    name: "室外散热区",
    kind: "outdoor",
    origin: [10, 0, -12],
    size: [8, 0, 10],
    yaw: 0,
    description: "两组样板室外散热设备，预留沿东侧服务道路的维护面。",
  },
  {
    id: "outdoor-backup",
    parent: "campus-01",
    name: "备用电源区",
    kind: "outdoor",
    origin: [10, 0, 4],
    size: [8, 0, 9],
    yaw: 0,
    description: "一组样板备用电源箱体，面向东侧服务道路。",
  },
  {
    id: "outdoor-yard",
    parent: "campus-01",
    name: "维护场坪",
    kind: "outdoor",
    origin: [26, 0, 2.5],
    size: [10, 0, 15],
    yaw: 0,
    description: "沿东侧服务道路布置的临时装卸和周转场地。",
  },
];

export const campusById = (id: string) =>
  campusNodes.find((node) => node.id === id);
export const campusChildren = (id: string) =>
  campusNodes.filter((node) => node.parent === id);
export const campusRoomId = "room-01";

type PlanFootprint = {
  center: readonly [number, number];
  width: number;
  depth: number;
};

type FloorEquipment = PlanFootprint & {
  name: string;
  height: number;
  kind: "rack" | "bench" | "staging" | "ups" | "battery" | "switchgear";
};

const supportLayout = {
  "support-a-01": {
    door: { x: -1.7, width: 1.5 },
    equipment: [
      {
        name: "检修台",
        center: [2.9, -1.5],
        width: 1.1,
        depth: 4.5,
        height: 0.92,
        kind: "bench",
      },
      {
        name: "周转台",
        center: [-1.5, 3.9],
        width: 3.8,
        depth: 1.1,
        height: 0.78,
        kind: "staging",
      },
    ],
  },
  "support-a-02": {
    door: { x: -5.5, width: 1.8 },
    equipment: [
      {
        name: "UPS 柜列",
        center: [-6.6, 2.8],
        width: 4,
        depth: 1.15,
        height: 2.1,
        kind: "ups",
      },
      {
        name: "电池柜列",
        center: [0, 2.8],
        width: 4.8,
        depth: 1.1,
        height: 2.05,
        kind: "battery",
      },
      {
        name: "低压配电柜列",
        center: [6.8, 2.8],
        width: 4.1,
        depth: 1,
        height: 2.2,
        kind: "switchgear",
      },
    ],
  },
} as const satisfies Record<
  string,
  {
    door: { x: number; width: number };
    equipment: readonly FloorEquipment[];
  }
>;

const roomEntrance = roomDefinition.room.fixtures.find(
  ({ id }) => id === roomDefinition.room.entrance.fixtureId,
)!;

const roomEquipment: FloorEquipment[] = roomDefinition.installation.racks.map(
  ({ name, position }) => ({
    name,
    center: [position[0], position[2]],
    width: roomDefinition.rack.size[0],
    depth: roomDefinition.rack.size[2],
    height: roomDefinition.rack.size[1],
    kind: "rack",
  }),
);

export function campusFloorPlan(id: string) {
  const floor = campusById(id);
  if (floor?.kind !== "floor") return null;
  const corridor: PlanFootprint = {
    center: [0, -floor.size[2] / 2 + 1.6],
    width: floor.size[0] - 1.2,
    depth: 2.4,
  };
  const floors = campusChildren(floor.parent ?? "").filter(
    ({ kind }) => kind === "floor",
  );
  const levels = floors.map(({ origin }) => origin[1]);
  const stair = {
    center: [-15, -5.5],
    width: 2.2,
    depth: 6.0,
    rise: Math.max(...levels) - Math.min(...levels),
  } as const;
  const areas = campusChildren(id).flatMap((area) => {
    const support = supportLayout[area.id as keyof typeof supportLayout];
    const room = area.id === campusRoomId;
    if (!room && !support) return [];
    const doorway = room
      ? {
          x: roomEntrance.position[0],
          z: roomEntrance.position[2],
          width: roomDefinition.room.entrance.openingWidth,
        }
      : { ...support.door, z: -area.size[2] / 2 };
    const accessX = area.origin[0] + doorway.x;
    const thresholdZ = area.origin[2] + doorway.z;
    return [
      {
        id: area.id,
        doorway,
        access: {
          x: accessX,
          fromZ: corridor.center[1],
          toZ: thresholdZ,
          length: thresholdZ - corridor.center[1] - corridor.depth / 2,
        },
        equipment: room ? roomEquipment : support.equipment,
      },
    ];
  });
  return { corridor, stair, areas };
}

export function campusBuildingEntrance(
  id: string,
): { point: SpacePoint; width: number } | null {
  const building = campusById(id);
  const ground = campusChildren(id).find(
    ({ kind, origin }) => kind === "floor" && origin[1] === 0,
  );
  const plan = ground && campusFloorPlan(ground.id);
  return building?.kind === "building" && plan
    ? { point: [-building.size[0] / 2, 0, plan.corridor.center[1]], width: 1.7 }
    : null;
}

const siteZone = {
  "outdoor-heat": {
    kind: "heat",
    status: "制冷回路与机房设备的对应关系待核实。",
  },
  "outdoor-backup": {
    kind: "backup",
    status: "供电拓扑、切换和计量待核实。",
  },
  "outdoor-yard": {
    kind: "yard",
    status: "道路通行与场坪承载待现场核实。",
  },
} as const;

export function campusSitePlan(id: string) {
  const scope = campusById(id);
  if (scope?.kind !== "campus") return null;
  const mainRoad: PlanFootprint = {
    center: [0, 17],
    width: scope.size[0],
    depth: 5.8,
  };
  const serviceRoad: PlanFootprint = {
    center: [17.5, -2.15],
    width: 5,
    depth: 32.5,
  };
  const building = campusChildren(id).find(({ kind }) => kind === "building");
  const entry = building && campusBuildingEntrance(building.id);
  const entrance =
    building && entry
      ? { ...entry, point: toParentPosition(entry.point, building) }
      : null;
  const zones = campusChildren(id).flatMap((area) => {
    const item = siteZone[area.id as keyof typeof siteZone];
    if (!item) return [];
    const west = area.origin[0] < serviceRoad.center[0];
    const roadEdge =
      serviceRoad.center[0] + (serviceRoad.width / 2) * (west ? -1 : 1);
    const zoneEdge = area.origin[0] + (area.size[0] / 2) * (west ? 1 : -1);
    return [
      {
        id: area.id,
        ...item,
        access: {
          center: [(roadEdge + zoneEdge) / 2, area.origin[2]] as const,
          width: Math.abs(roadEdge - zoneEdge),
          depth: item.kind === "yard" ? 5.2 : 3.2,
        },
      },
    ];
  });
  return { mainRoad, serviceRoad, entrance, zones };
}

export function campusPath(id: string): CampusNode[] {
  const path: CampusNode[] = [];
  let node = campusById(id);
  while (node) {
    path.unshift(node);
    node = node.parent ? campusById(node.parent) : undefined;
  }
  return path;
}

/** 局部点按 Y 轴朝向逐级变换，米制高度以园区地面为零点。 */
export function campusPosition(id: string, local: SpacePoint = [0, 0, 0]) {
  const path = campusPath(id);
  if (!path.length) return null;
  return path.reduceRight<SpacePoint>(toParentPosition, local);
}

function toParentPosition(
  [x, y, z]: SpacePoint,
  { origin, yaw }: CampusNode,
): SpacePoint {
  return [
    origin[0] + x * Math.cos(yaw) + z * Math.sin(yaw),
    origin[1] + y,
    origin[2] - x * Math.sin(yaw) + z * Math.cos(yaw),
  ];
}

/** 按登记机房聚合一次，每项读数沿用机房的有效设备口径。 */
export function campusCoverage(
  id: string,
  readings: ReadonlyMap<string, SpatialReading>,
) {
  const rooms = campusNodes.filter(
    (node) =>
      node.kind === "room" &&
      campusPath(node.id).some((entry) => entry.id === id),
  );
  let devices = 0;
  let inletDevices = 0;
  let powerDevices = 0;
  let power: number | null = null;
  let temperature: number | null = null;
  for (const room of rooms) {
    devices += room.deviceCount ?? 0;
    const reading = readings.get(room.id);
    if (!reading) continue;
    inletDevices += reading.coverageTemperature;
    powerDevices += reading.coveragePower;
    if (reading.power !== null) power = (power ?? 0) + reading.power;
    if (reading.temperature !== null)
      temperature =
        temperature === null
          ? reading.temperature
          : Math.max(temperature, reading.temperature);
  }
  return {
    rooms: rooms.length,
    devices,
    inletDevices,
    powerDevices,
    power,
    temperature,
  };
}
