import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

export const cableTraySettings = definition.room.cableTrays;
export const traySupportCenterY =
  cableTraySettings.railCenterY -
  cableTraySettings.railSize[1] / 2 -
  cableTraySettings.supportHeight / 2;
export const trayOuterWidth =
  cableTraySettings.railSpacing +
  cableTraySettings.railSize[0] +
  cableTraySettings.capOverhang * 2;
/** 横档位置与实际生成模型共用，避免把空隙当成可核对表面。 */
export function trayRungXs() {
  const steps = Math.floor(
    (cableTraySettings.length - cableTraySettings.rungSize[0]) /
      cableTraySettings.rungPitch,
  );
  return Array.from(
    { length: steps + 1 },
    (_, i) => (i - steps / 2) * cableTraySettings.rungPitch,
  );
}
export const trayRow = (id: string) =>
  cableTraySettings.rows.find((row) => row.fixtureId === id);
/** 只有空间对应，不表示电气/网络连接或桥架服务范围。 */
export function trayRelations(id: string) {
  return (trayRow(id)?.rackIds ?? []).map((rackId) => {
    const rack = definition.installation.racks.find((r) => r.id === rackId)!;
    return { id: rack.id, name: rack.name, relation: "下方机柜 · 布置对应" };
  });
}
export const trayRungBottom = (centerY: number) =>
  centerY - cableTraySettings.rungSize[1] / 2;

/** 反向查找复用同一份柜排配置。高差以柜顶板上表面和横档底面为基准。 */
export function rackTrayRelations(rackId: string) {
  const rack = definition.installation.racks.find((r) => r.id === rackId);
  if (!rack) return [];
  const roofTop =
    rack.position[1] +
    definition.rack.size[1] +
    definition.rack.enclosure.roof.thickness / 2;
  return cableTraySettings.rows
    .filter((row) => row.rackIds.includes(rackId))
    .flatMap((row) => {
      const tray = definition.room.fixtures.find(
        (f) => f.id === row.fixtureId && f.kind === "cable-tray",
      );
      if (!tray) return [];
      const difference = trayRungBottom(tray.position[1]) - roofTop;
      return [
        {
          id: tray.id,
          name: tray.name,
          relation: `横档底面与柜顶板高差 ${difference.toFixed(2)} m`,
        },
      ];
    });
}
export function trayEndpoints(id: string) {
  const fixture = definition.room.fixtures.find((f) => f.id === id);
  if (!trayRow(id) || !fixture) return [];
  return [-1, 1].map((side) => [
    fixture.position[0] + (side * cableTraySettings.length) / 2,
    fixture.position[1],
    fixture.position[2],
  ]);
}
/** 局部坐标覆盖长边和吊装位置，选中桥架自身不参与剖切。 */
export function traySightOffsets(id: string) {
  if (!trayRow(id)) return [];
  const s = cableTraySettings;
  return [
    ...[-s.length / 2, 0, s.length / 2].flatMap((x) =>
      [-s.railSpacing / 2, s.railSpacing / 2].map((z) => [x, 0, z]),
    ),
    ...s.supportXs.map((x) => [x, s.rodTopY, 0]),
  ];
}
