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
/** 门扇局部坐标。两面的底板、轴座和握杆使用同一组配置。 */
export const entranceHandles = ([1, -1] as const).map((side, index) => {
  const x = entranceLeaf.width - s.handleInset;
  const y = s.handleHeight - s.openingHeight / 2;
  const faceZ = side === 1 ? 0 : -s.leafThickness;
  return {
    side,
    index,
    label: side === 1 ? "室内侧" : "室外侧",
    faceZ,
    parts: {
      plate: {
        name: `entrance-handle-plate-${side}`,
        size: s.handlePlateSize,
        position: [x, y, faceZ + (side * s.handlePlateSize[2]) / 2],
      },
      stem: {
        name: `entrance-handle-stem-${side}`,
        size: [s.handleSize[1], s.handleSize[1], s.handleStandOff],
        position: [x, y, faceZ + (side * s.handleStandOff) / 2],
      },
      bar: {
        name: `entrance-handle-${side}`,
        size: s.handleSize,
        position: [x - s.handleSize[0] / 2, y, faceZ + side * s.handleStandOff],
      },
    },
  };
});
export const entranceHinges = s.hingeHeights.map((fromBottom, index) => ({
  index,
  name: `entrance-hinge-${index}`,
  fromBottom,
  offset: [
    entranceLeaf.pivotX,
    fromBottom - s.openingHeight / 2,
    entranceLeaf.pivotZ,
  ],
}));
export const exitSign = definition.room.fixtures.find(
  (f) => f.id === s.lighting.signId,
)!;
export const emergencyLight = definition.room.fixtures.find(
  (f) => f.id === s.lighting.lampId,
)!;
// 配对只用于门区位置核对。门锁接线与灯具供电未登记。
const pairs = [
  [s.fixtureId, s.readerId, "入口布置对应"],
  [s.fixtureId, exitSign.id, "门楣与标志"],
  [exitSign.id, emergencyLight.id, "同墙安装"],
];
export function entranceRelations(id: string) {
  return pairs.flatMap(([a, b, relation]) => {
    if (a !== id && b !== id) return [];
    const peer = definition.room.fixtures.find(
      (f) => f.id === (a === id ? b : a),
    )!;
    return [{ id: peer.id, name: peer.name, relation }];
  });
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
