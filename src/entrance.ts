import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

export const entranceSettings = definition.room.entrance;
export const entranceFixture = definition.room.fixtures.find(
  (fixture) => fixture.id === entranceSettings.fixtureId,
)!;
const s = entranceSettings;
export const entranceOpening = {
  left: entranceFixture.position[0] - s.openingWidth / 2,
  right: entranceFixture.position[0] + s.openingWidth / 2,
  bottom: entranceFixture.position[1] - s.openingHeight / 2,
  top: entranceFixture.position[1] + s.openingHeight / 2,
};
export const entranceLeaf = {
  width: s.openingWidth - 2 * (s.frameWidth + s.edgeGap),
  height: s.openingHeight - s.frameWidth - s.edgeGap - s.floorGap,
  pivotX: -s.openingWidth / 2 + s.frameWidth + s.edgeGap,
  bottom: -s.openingHeight / 2 + s.floorGap,
  pivotZ: s.frameDepth / 2,
};
/** 仅关联入口旁的已登记读卡器，不推断门锁接线或访问控制状态。 */
export function entranceRelations(id: string) {
  if (![s.fixtureId, s.readerId].includes(id)) return [];
  const counterpart = definition.room.fixtures.find(
    (fixture) => fixture.id === (id === s.fixtureId ? s.readerId : s.fixtureId),
  )!;
  return [
    { id: counterpart.id, name: counterpart.name, relation: "入口布置对应" },
  ];
}
/** 覆盖门框和展开门扇；所有坐标相对于入口中心，不随模拟时间变化。 */
export function entranceSightOffsets() {
  return [-1, 1].flatMap((side) => [
    [(side * s.openingWidth) / 2, (side * s.openingHeight) / 2, 0],
    [
      entranceLeaf.pivotX + entranceLeaf.width * Math.cos(s.displayAngle),
      (side * s.openingHeight) / 2,
      entranceLeaf.pivotZ - entranceLeaf.width * Math.sin(s.displayAngle),
    ],
  ]);
}
