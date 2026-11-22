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
export const trayStages = [
  { id: "drive", name: "盘体与托架", open: "抬起盘体", close: "放回托架" },
  {
    id: "handle-swing",
    name: "拉手与止挡",
    open: "打开拉手",
    close: "合回止挡",
  },
  { id: "hinge-pin", name: "铰轴与轴耳", open: "抽出铰轴", close: "插回铰轴" },
  {
    id: "handle-eye",
    name: "活动耳与耳座",
    open: "移出活动耳",
    close: "对回耳座",
  },
] as const;
export type TrayStageId = (typeof trayStages)[number]["id"];

const drives = definition.parts.find((part) => part.id === "sto-drives")!;

/** 盘组与中板共用槽位中心；只是当前 4U 配置的装配示意。 */
export function storageSlot(index: number): [number, number] {
  const { columns, rows } = storageAssembly;
  return [
    ((index % columns) - (columns - 1) / 2) * (drives.size[0] / columns),
    ((rows - 1) / 2 - Math.floor(index / columns)) * (drives.size[1] / rows),
  ];
}
