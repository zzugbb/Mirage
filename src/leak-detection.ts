import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

export const leakDetection = definition.room.leakDetection;
export const leakCable = definition.room.fixtures.find(
  (f) => f.id === leakDetection.cableId,
)!;
export const leakController = definition.room.fixtures.find(
  (f) => f.id === leakDetection.controllerId,
)!;
export const nearbyCooling = definition.facilities.find(
  (f) => f.id === leakDetection.nearbyFacilityId,
)!;
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
  if (id === leakDetection.nearbyFacilityId)
    return definition.room.fixtures
      .filter((f) => isLeakFixture(f.id))
      .map((f) => ({
        id: f.id,
        name: f.name,
        relation: "邻近布置 · 未接入数据",
      }));
  if (!isLeakFixture(id)) return [];
  const counterpart = id === leakCable.id ? leakController : leakCable;
  return [
    {
      id: counterpart.id,
      name: counterpart.name,
      relation: id === leakDetection.cableId ? "接入对象" : "感应支路",
    },
    { id: nearbyCooling.id, name: nearbyCooling.name, relation: "邻近设施" },
  ];
}
