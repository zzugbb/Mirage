import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

export const leakDetection = definition.room.leakDetection;
export const isLeakFixture = (id: string) =>
  id === leakDetection.controllerId || id === leakDetection.cableId;
/** 配置折线段长，不是实测线长或探测覆盖面积。 */
export function configuredPathLength(points: number[][]) {
  return points
    .slice(1)
    .reduce(
      (length, point, i) =>
        length +
        Math.hypot(...point.map((value, axis) => value - points[i][axis])),
      0,
    );
}
export function leakRelations(id: string) {
  if (!isLeakFixture(id)) return [];
  const counterpart = definition.room.fixtures.find(
    (f) =>
      f.id ===
      (id === leakDetection.cableId
        ? leakDetection.controllerId
        : leakDetection.cableId),
  )!;
  const nearby = definition.facilities.find(
    (f) => f.id === leakDetection.nearbyFacilityId,
  )!;
  return [
    {
      id: counterpart.id,
      name: counterpart.name,
      relation: id === leakDetection.cableId ? "接入对象" : "感应支路",
    },
    { id: nearby.id, name: nearby.name, relation: "邻近设施" },
  ];
}
