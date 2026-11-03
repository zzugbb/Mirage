import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

export const storageAssembly = definition.storageAssembly;
const drives = definition.parts.find((part) => part.id === "sto-drives")!;

/** 盘组与中板共用槽位中心；只是当前 4U 配置的装配示意。 */
export function storageSlot(index: number): [number, number] {
  const { columns, rows } = storageAssembly;
  return [
    ((index % columns) - (columns - 1) / 2) * (drives.size[0] / columns),
    ((rows - 1) / 2 - Math.floor(index / columns)) * (drives.size[1] / rows),
  ];
}
