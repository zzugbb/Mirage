import { modelById, partsForModel, subpartsForModel } from "./catalog.ts";
import { compactDriveBays } from "./compact-drive-bays.ts";
import { inletPart } from "./power-config.ts";
import { deviceById } from "./installation.ts";

export function processorPairs(modelId: string) {
  const server = partsForModel(modelId);
  return server
    .filter((part) => part.node === "chip" && part.slot.startsWith("CPU-"))
    .map((primary) => {
      const companion = server.find(
        (part) =>
          part.node === "processor" &&
          part.slot === primary.slot.replace("CPU-", "HS-"),
      );
      if (!companion) throw Error(primary.slot + " 缺少对应的散热器配置");
      return { primary, companion };
    });
}

const serverChildren = subpartsForModel(modelById("server-2u"));
export const drivePairs = serverChildren
  .filter((part) => part.parent === "storage-01")
  .map((primary) => {
    const companion = serverChildren.find(
      (part) =>
        part.parent === "drives-01" &&
        part.slot === primary.slot.replace("BAY-", "SSD-"),
    );
    if (!companion) throw Error(primary.slot + " 缺少对应的硬盘配置");
    return { primary, companion };
  })
  .sort((a, b) => a.primary.slot.localeCompare(b.primary.slot));

export function isAsicBoardStage(id?: string) {
  return id === "asic-lands" || id === "asic-corner";
}

const network = partsForModel("switch-1u");
const storage = partsForModel("storage-4u").filter(
  (part) => part.node === "controller",
);
const controllerA = storage.find((part) => part.slot === "CTRL-A")!;
const controllerB = storage.find((part) => part.slot === "CTRL-B")!;
function powerPair(modelId: string) {
  const parts = partsForModel(modelId);
  const psu = (feed: "A" | "B") =>
    parts.find((part) => part.id === inletPart(modelId, feed))!;
  return { primary: psu("A"), companion: psu("B") };
}
function rearModules(modelId: string, controllers: typeof storage) {
  const power = powerPair(modelId);
  const supplies = [power.primary, power.companion];
  const fanGroup = partsForModel(modelId).find((part) => part.node === "fans")!;
  const fans = subpartsForModel(modelById(modelId)).filter(
    (part) => part.parent === fanGroup.id,
  );
  // 从机后看 +X 在左。S4 上层为控制器，下层和 N1 一样由电源夹着风扇排。
  const fromRear = (a: typeof power.primary, b: typeof power.primary) =>
    b.position[0] - a.position[0];
  const [left, right] = [...supplies].sort(fromRear);
  return {
    fanGroup,
    fans,
    supplies,
    controllers,
    members: [
      ...[...controllers].sort(fromRear),
      left,
      ...[...fans].reverse(),
      right,
    ],
    companions: [
      power.companion.id,
      fanGroup.id,
      ...controllers.map((p) => p.id),
    ],
  };
}
const serverSupplies = new Map(
  ["server-1u", "server-2u"].map((id) => {
    const { primary, companion } = powerPair(id);
    return [id, [primary, companion]] as const;
  }),
);
export const serverSuppliesFor = (id: string) => serverSupplies.get(id)!;
export const switchRear = rearModules("switch-1u", []);
const storageRear = rearModules("storage-4u", storage);
export const rearLayoutFor = (modelId: string) =>
  modelId === "storage-4u"
    ? storageRear
    : modelId === "switch-1u"
      ? switchRear
      : undefined;
export const fanContactStages = [
  {
    id: "fan-bank",
    name: "整排与板缘",
    boardOnly: false,
    seated: "接合触点",
    separated: "分开触点",
  },
  {
    id: "fan-contact",
    name: "本槽触点",
    boardOnly: false,
    seated: "接合触点",
    separated: "分开触点",
  },
  {
    id: "fan-probes",
    name: "触头与筒孔",
    boardOnly: true,
    seated: "装回触头",
    separated: "抽出触头",
  },
  {
    id: "fan-sleeves",
    name: "双套筒与座孔",
    boardOnly: true,
    seated: "压回套筒",
    separated: "取出套筒",
  },
] as const;
export type FanContactView = (typeof fanContactStages)[number]["id"];
const rotorLayer = {
  fanContacts: true,
  entry: "查看风扇装配",
  description:
    "四个风扇的编号与机后顺序来自 N1 配置。触片归风扇，含双触头和套筒的固定座归控制主板。板端座孔、风扇轴座及拆装行程为原创装配示意。时间分析沿用所选部件的模拟读数。",
  label: "风扇装配",
  scope: "风扇核查范围与姿态",
  seated: "放回轴座",
  separated: "移出叶轮",
} as const;
export const controllerLayer = {
  entry: "查看控制器板卡",
  description:
    "控制器身份与双口归属来自 S4 配置。板卡孔柱、端口屏蔽罩、承片与尾座、芯片封装、散热器与拆装行程为原创装配示意。时间分析使用所选控制器的模拟读数。",
  members: "both",
  label: "控制器板卡与托盘",
  scope: "板卡姿态",
  seated: "放回支柱",
  separated: "抬起板卡",
} as const;
const powerTrayLayer = {
  entry: "查看电源内托",
  description:
    "输入 A、B 与电源身份沿用当前机型配置。内托、导轨、止挡和行程为原创装配示意。时间分析使用部件模型读数，支路未计量。",
  label: "电源内托与导轨",
  scope: "内托姿态",
  seated: "推回壳体",
  separated: "拉出内托",
} as const;
const powerStages = [
  {
    id: "",
    name: "内托与导轨",
    seated: powerTrayLayer.seated,
    separated: powerTrayLayer.separated,
  },
  {
    id: "board-mount",
    name: "板卡与四柱",
    seated: "放回四柱",
    separated: "抬起板卡",
  },
  {
    id: "board-contact",
    name: "板端接合",
    seated: "插入固定座",
    separated: "退出固定座",
  },
] as const;
const inputStages = [
  {
    id: "input-panel",
    name: "输入座与面板",
    seated: "装回输入座",
    separated: "取出输入座",
  },
  {
    id: "input-core",
    name: "芯座与座套",
    seated: "压回芯座",
    separated: "取出芯座",
  },
  {
    id: "input-blades",
    name: "端子与芯孔",
    seated: "插回端子",
    separated: "退出端子",
  },
] as const;
const bayContactStage = {
  id: "bay-contact",
  name: "槽内插片与固定座",
  seated: "接合槽内插片",
  separated: "退出槽内插片",
} as const;
const switchPowerTrayLayer = {
  ...powerTrayLayer,
  stageLabel: "电源核查位置",
  stages: [
    powerStages[0],
    bayContactStage,
    ...powerStages.slice(1),
    ...inputStages,
  ],
  description:
    "电源身份与输入 A、B 来自 N1 配置。槽内插片与固定座、内托四柱、板端接合、输入座削角与三片端子的装配均为原创示意。时间分析沿用部件模拟值，支路未计量。",
} as const;
const storagePowerTrayLayer = {
  ...switchPowerTrayLayer,
  description:
    "可在两侧电源间切换，对照槽内接点、输入座、芯座与端子、板卡四柱和板端宽窄插片。输入 A、B 归属来自配置。内部装配与行程为原创示意，时间分析沿用部件模拟值，支路未计量。",
} as const;
const fanGuardLayer = {
  stageLabel: "风扇核查位置",
  stages: [
    { id: "", name: "护网与定位柱", seated: "装回护网", separated: "取下护网" },
    {
      id: "storage-rotor",
      name: "叶轮与轴头",
      seated: "放回叶轮",
      separated: "移出叶轮",
    },
    {
      id: "storage-hub",
      name: "轮毂背孔",
      seated: "放回叶轮",
      separated: "移出叶轮",
    },
    {
      id: "storage-spindle",
      name: "轴套与电机座",
      seated: "压回轴套",
      separated: "取出轴套",
    },
  ],
  entry: "查看护网与定位柱",
  description:
    "FAN-01、FAN-02 的槽位和归属来自 S4 配置。护网、叶轮背孔、带肩轴套、电机座和拆装行程为原创装配示意。时间分析沿用所选风扇的模拟读数。",
  label: "风扇护网与定位柱",
  scope: "护网姿态",
  seated: "装回护网",
  separated: "取下护网",
} as const;
export function rearMemberLayer(layout: typeof switchRear, selected: string) {
  if (layout.supplies.some((part) => part.id === selected))
    return layout === storageRear
      ? storagePowerTrayLayer
      : switchPowerTrayLayer;
  if (layout.controllers.some((part) => part.id === selected))
    return controllerLayer;
  if (layout.fans.some((part) => part.id === selected))
    return layout === storageRear ? fanGuardLayer : rotorLayer;
}

function rearPowerCheck(modelId: "switch-1u" | "storage-4u") {
  return {
    tool: modelId === "switch-1u" ? "switch-power" : "storage-power",
    name: "双电源",
    entry: "核对双电源",
    detail: "从机后对照两个电源模块及其输入槽位",
    labels: ["电源 A", "电源 B"],
    startExplosion: 0.2,
    pairs: [powerPair(modelId)],
  } as const;
}

export const serverPowerStages = [
  bayContactStage,
  { ...powerStages[0], id: "tray" },
  powerStages[1],
  powerStages[2],
  ...inputStages,
] as const;
function serverPowerCheck(modelId: "server-1u" | "server-2u") {
  return {
    tool: "server-power",
    powerBays: modelById(modelId).powerBays!,
    layer: {
      members: "both",
      label: "电源接合与内部装配",
      scope: "电源装配姿态",
      stageLabel: "电源核查位置",
      stages: serverPowerStages,
      seated: bayContactStage.seated,
      separated: bayContactStage.separated,
    },
    name: "双电源",
    entry: "核对双电源",
    detail:
      "对照输入 A、B 和原槽，可抽出电源，连续核对槽内接点、内托板件和机后输入座",
    labels: ["输入 A", "输入 B"],
    startExplosion: 0.35,
    pairs: [powerPair(modelId)],
  } as const;
}

export const processorLayer = {
  members: "both",
  label: "处理器安装面",
  scope: "处理器安装面姿态",
  seated: "放回座框",
  separated: "抬起封装",
} as const;
function processorCheck(modelId: string) {
  return {
    tool: "processor-pair",
    layer: processorLayer,
    name: "处理器装配",
    entry: "核对处理器与散热器",
    detail: "逐路核对封装座框与散热器接触面",
    labels: ["封装", "散热器"],
    startExplosion: modelId === "server-1u" ? 0.75 : 0.55,
    slotLabel: "处理器槽位",
    pairs: processorPairs(modelId),
  } as const;
}
const bay = modelById("server-2u").expansionBay!;
const rtc = modelById("server-2u").rtcMount!;
const harness = modelById("server-2u").storageHarness!;
const serverMember = (id: string) =>
  partsForModel("server-2u").find((part) => part.id === id)!;
const compact = modelById("server-1u").controllerMount!;
const compactParts = partsForModel("server-1u");
const compactManagement = modelById("server-1u").managementSlide!;
const compactHarness = modelById("server-1u").compactHarness!;
function storageHarnessCheck(
  modelId: string,
  backplane: string,
  cable: string,
  controller: string,
  detail: string,
) {
  const parts = partsForModel(modelId);
  const member = (id: string) => parts.find((p) => p.id === id)!;
  return {
    tool: "storage-harness",
    name: "背板线束",
    entry: "核对背板线束",
    detail,
    memberLabel: "背板线束部件",
    labels: ["磁盘背板", "背板线束", "存储控制卡"],
    startExplosion: 0.45,
    pairs: [{ primary: member(backplane), companion: member(cable) }],
    additionalParts: [member(controller)],
  } as const;
}
const diskLayer = {
  members: "companion",
  stageLabel: "盘体核查位置",
  stages: [
    {
      id: "",
      name: "上盖与底壳",
      seated: "合回上盖",
      separated: "抬起上盖",
    },
    {
      id: "ssd-pads",
      name: "导热垫与封装",
      seated: "贴合封装",
      separated: "分开导热垫",
    },
    {
      id: "ssd-board",
      name: "盘内板与四柱",
      seated: "放回四柱",
      separated: "抬起盘内板",
    },
    {
      id: "ssd-tail",
      name: "盘尾与壳口",
      seated: "落回壳口",
      separated: "抬出盘尾",
    },
  ],
  label: "硬盘上盖与盘内板",
  scope: "硬盘上盖姿态",
  seated: "合回上盖",
  separated: "抬起上盖",
} as const;
const managementPortStages = [
  {
    id: "management-mouth",
    name: "孔缘与笼口",
    seated: "对准面板",
    separated: "退出孔缘",
  },
  {
    id: "management-shield",
    name: "屏蔽罩与绝缘座",
    seated: "放回屏蔽罩",
    separated: "抬起屏蔽罩",
  },
  {
    id: "management-feet",
    name: "板底四个插脚",
    seated: "插脚归位",
    separated: "退出板孔",
  },
] as const;
export const adapterMountLayer = {
  label: "机后安装位",
  scope: "安装位姿态",
  seated: "放回安装位",
  separated: "移开部件",
} as const;
const checks = {
  "server-1u": [
    {
      tool: "compact-drive",
      name: "前置盘位",
      entry: "对照托架与硬盘",
      detail: "按同号盘位对照，分层核对盖底导热垫、盘内板四柱与尾端接口",
      slotLabel: "前置盘位",
      labels: ["托架", "固态硬盘"],
      layer: diskLayer,
      startExplosion: 0.65,
      pairs: compactDriveBays.map(({ tray, disk }) => ({
        primary: tray,
        companion: disk,
      })),
    },
    processorCheck("server-1u"),
    storageHarnessCheck(
      "server-1u",
      compactHarness.backplane,
      compactHarness.harness,
      compact.controllerId,
      "从四盘背板沿机箱侧边查看 SAS 线束示意及控制卡接线端",
    ),
    serverPowerCheck("server-1u"),
    {
      tool: "rear-interfaces",
      name: "机后扩展区",
      entry: "核对机后扩展区",
      detail: "对照网卡、转接架和管理接口，可核对笼口、屏蔽罩与板孔",
      layer: {
        partId: compactManagement.partId,
        stageLabel: "管理接口核查位置",
        stages: [
          {
            id: "",
            name: "接口板与双轨",
            seated: "推回接口板",
            separated: "滑出接口板",
          },
          ...managementPortStages,
        ],
        label: "管理接口板与导轨",
        scope: "管理接口板姿态",
        seated: "推回接口板",
        separated: "滑出接口板",
      },
      memberLabel: "机后扩展部件",
      labels: ["双口网卡", "转接架", "管理接口"],
      additionalParts: [
        compactParts.find((part) => part.id === compactManagement.partId)!,
      ],
      startExplosion: 0.45,
      pairs: [
        {
          primary: compactParts.find((part) => part.id === "nic-01")!,
          companion: compactParts.find((part) => part.id === "riser-01")!,
        },
      ],
    },
    {
      tool: "controller-mount",
      name: "控制卡装配",
      entry: "核对存储控制卡与主板",
      detail: "从机后上方查看控制卡及其在主板上的安装位置",
      labels: ["控制卡", "主板"],
      startExplosion: 0.4,
      pairs: [
        {
          primary: compactParts.find(
            (part) => part.id === compact.controllerId,
          )!,
          companion: compactParts.find((part) => part.id === compact.boardId)!,
        },
      ],
    },
  ],
  "storage-4u": [
    {
      tool: "storage-controllers",
      name: "双控制器",
      entry: "核对双控制器",
      detail: "对照 A/B 槽位，核对四角支柱、芯片散热器及每个端口的罩脚与承片",
      layer: controllerLayer,
      labels: [controllerA.name, controllerB.name],
      startExplosion: 0.3,
      pairs: [{ primary: controllerA, companion: controllerB }],
    },
    {
      ...rearPowerCheck("storage-4u"),
      rear: storageRear,
      tool: "storage-power",
      entry: "核对机后模块",
      summary: "机后模块",
      detail: "逐槽核对控制器板卡、电源内托与风扇轴系",
    },
  ],
  "server-2u": [
    processorCheck("server-2u"),
    {
      tool: "rtc-mount",
      name: "时钟电池装配",
      entry: "核对主板与时钟电池",
      detail: "在主板上找电池位置，抬起电池查看座底触片",
      labels: ["时钟电池", "主板"],
      layer: {
        members: "primary",
        label: "电池与固定座",
        scope: "电池姿态",
        seated: "放回电池座",
        separated: "抬起电池",
      },
      startExplosion: 0.35,
      pairs: [
        {
          primary: serverMember(rtc.batteryId),
          companion: serverMember(rtc.boardId),
        },
      ],
    },
    {
      tool: "drive-tray",
      layer: diskLayer,
      name: "前置盘位",
      entry: "核对托架与硬盘",
      detail: "按柜前槽号对照托架和竖装 SSD，可继续核对侧盖、板卡与盘尾",
      labels: ["托架", "固态硬盘"],
      slotLabel: "前置盘位",
      startExplosion: 1,
      pairs: drivePairs,
    },
    storageHarnessCheck(
      "server-2u",
      harness.backplane,
      harness.harness,
      harness.controller,
      "沿 SAS 线束示意核对八盘背板与存储控制卡的接线端",
    ),
    serverPowerCheck("server-2u"),
    {
      tool: "expansion-bay",
      memberLabel: "机后接口与扩展部件",
      name: "机后接口与扩展区",
      entry: "核对管理接口、网卡与转接架",
      detail: "从机后对照管理接口、双口网卡和两只转接架，可分层查看管理接口板",
      layer: {
        members: "companion",
        stageLabel: "接口核查位置",
        stages: [
          {
            id: "",
            name: "接口板与四柱",
            seated: "放回支架",
            separated: "抬起接口板",
          },
          ...managementPortStages,
        ],
        label: "管理接口板与支架",
        scope: "管理接口板姿态",
        seated: "放回支架",
        separated: "抬起接口板",
      },
      startExplosion: 0.32,
      labels: ["网卡", "管理接口", "01 架", "02 架"],
      pairs: [
        {
          primary: serverMember(bay.adapter),
          companion: serverMember(bay.management),
        },
      ],
      additionalParts: [serverMember(bay.carrier), serverMember(bay.adjacent)],
    },
  ],
  "switch-1u": [
    {
      tool: "switch-board",
      name: "主板装配",
      layer: {
        members: "both",
        label: "芯片装配",
        scope: "芯片装配姿态",
        stageLabel: "芯片核查位置",
        stages: [
          {
            id: "",
            name: "散热底座与四柱",
            seated: "贴合封装",
            separated: "抬起散热器",
          },
          {
            id: "asic-lid",
            name: "封装盖与裸片",
            seated: "合回封装盖",
            separated: "抬起封装盖",
          },
          {
            id: "asic-lands",
            name: "基板与主板",
            seated: "对回安装区",
            separated: "分开基板",
          },
          {
            id: "asic-corner",
            name: "方向角焊点",
            seated: "对合焊点",
            separated: "分开焊点",
          },
        ],
        seated: "贴合封装",
        separated: "抬起散热器",
      },
      entry: "核对主板与交换芯片",
      detail:
        "对照主板安装区、方向角焊点、封装盖与裸片，以及散热底座四孔与定位柱",
      labels: ["控制主板", "芯片与散热器"],
      startExplosion: 1,
      pairs: [
        {
          primary: network.find((part) => part.id === "net-board")!,
          companion: network.find((part) => part.id === "net-asic")!,
        },
      ],
    },
    {
      tool: "switch-front",
      name: "前置端口笼",
      entry: "核对端口笼与主板",
      detail:
        "从机前对照端口笼与主板，可分组核对导光条，也可逐列抽出上下排承片、对照固定座键槽",
      layer: {
        members: "primary",
        label: "端口笼与导光条",
        scope: "导光组件姿态",
        seated: "放回支座",
        separated: "抬起导光条",
      },
      labels: ["端口笼", "控制主板"],
      startExplosion: 0.35,
      pairs: [
        {
          primary: network.find((part) => part.id === "net-ports")!,
          companion: network.find((part) => part.id === "net-board")!,
        },
      ],
    },
    {
      ...rearPowerCheck("switch-1u"),
      rear: switchRear,
      tool: "switch-power",
      entry: "核对双电源与风扇",
      detail: "逐槽核对电源板卡、内托与板端接合，以及风扇叶轮与轴座",
    },
  ],
} as const;

export type AssemblyCheck = (typeof checks)[keyof typeof checks][number];

// 从单件进入沿用该件，从模组进入选择本组第一件。
export function assemblyMember(check: AssemblyCheck, selected: string) {
  if ("rear" in check) {
    const controller = check.rear.controllers.find(
      (part) => part.id === selected,
    );
    if (controller) return controller;
    const fan = check.rear.fans.find(
      (part) => part.id === selected || part.parent === selected,
    );
    if (fan) return fan;
  }
  if ("additionalParts" in check) {
    const member = check.additionalParts.find((part) => part.id === selected);
    if (member) return member;
  }
  for (const { primary, companion } of check.pairs) {
    const member = [primary, companion].find(
      (part) =>
        part.id === selected || ("parent" in part && part.parent === selected),
    );
    if (member) return member;
  }
}

export function assemblyChecks(
  deviceId: string,
  selected = deviceId,
): readonly AssemblyCheck[] {
  const model = deviceById(deviceId)?.modelId;
  if (!model || !Object.hasOwn(checks, model)) return [];
  const list = checks[model as keyof typeof checks];
  if (selected === deviceId) return list;
  return list.filter((check) => assemblyMember(check, selected));
}
