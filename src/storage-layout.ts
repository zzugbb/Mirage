import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

export const storageAssembly = definition.storageAssembly;
export const controllerPortsFor = (id: string) =>
  definition.installation.networkAccess.sourcePorts["storage-4u"].filter(
    (port) => port.partId === id,
  );

// 相同的局部口位可跨控制器切换，逻辑口号与名称仍取所选控制器的配置。
export function controllerPortStages(index: number) {
  return [
    {
      id: "port-" + index + "-hood",
      name: "屏蔽罩与底座",
      seated: "装回罩脚",
      separated: "抬起屏蔽罩",
    },
    {
      id: "port-" + index + "-tongue",
      name: "承片与尾座",
      seated: "推回尾座",
      separated: "抽出承片",
    },
  ] as const;
}
const drives = definition.parts.find((part) => part.id === "sto-drives")!;

/** 盘组与中板共用槽位中心；只是当前 4U 配置的装配示意。 */
export function storageSlot(index: number): [number, number] {
  const { columns, rows } = storageAssembly;
  return [
    ((index % columns) - (columns - 1) / 2) * (drives.size[0] / columns),
    ((rows - 1) / 2 - Math.floor(index / columns)) * (drives.size[1] / rows),
  ];
}
