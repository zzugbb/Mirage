import { modelById, partsForModel, subpartsForModel } from "./catalog.ts";
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
const switchPower = powerPair("switch-1u");
const switchFanGroup = network.find((part) => part.node === "fans")!;
const switchFans = subpartsForModel(modelById("switch-1u")).filter(
  (part) => part.parent === switchFanGroup.id,
);
const [rearLeftSupply, rearRightSupply] = [
  switchPower.primary,
  switchPower.companion,
].sort((a, b) => b.position[0] - a.position[0]);
// 风扇子件在模组内沿 +X 排列；从机后（-Z）观察时次序反转。
export const switchRear = {
  fanGroup: switchFanGroup,
  fans: switchFans,
  supplies: [switchPower.primary, switchPower.companion],
  members: [rearLeftSupply, ...[...switchFans].reverse(), rearRightSupply],
  companions: [switchPower.companion.id, switchFanGroup.id],
};
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

function serverPowerCheck(modelId: "server-1u" | "server-2u") {
  return {
    tool: "server-power",
    name: "双电源",
    entry: "核对双电源",
    detail: "从机后对照电源槽位与配置输入 A、B",
    labels: ["输入 A", "输入 B"],
    startExplosion: 0.35,
    pairs: [powerPair(modelId)],
  } as const;
}

function processorCheck(modelId: string) {
  return {
    tool: "processor-pair",
    name: "处理器装配",
    entry: "核对处理器与散热器",
    detail: "逐路查看处理器封装与同号散热器",
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
const checks = {
  "server-1u": [
    processorCheck("server-1u"),
    serverPowerCheck("server-1u"),
    {
      tool: "rear-interfaces",
      name: "机后扩展区",
      entry: "核对机后扩展区",
      detail: "对照网卡、转接架和按配置示意的管理接口",
      memberLabel: "机后扩展部件",
      labels: ["双口网卡", "转接架", "管理接口"],
      additionalPart: compactParts.find((part) => part.id === "io-01")!,
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
      detail: "对照 A/B 槽位，可分层核对所选控制器的板卡与托盘",
      layer: {
        members: "both",
        label: "控制器板卡与托盘",
        scope: "板卡姿态",
        seated: "放回支柱",
        separated: "抬起板卡",
      },
      labels: [controllerA.name, controllerB.name],
      startExplosion: 0.3,
      pairs: [{ primary: controllerA, companion: controllerB }],
    },
    rearPowerCheck("storage-4u"),
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
      name: "前置盘位",
      entry: "核对托架与硬盘",
      detail: "按柜前从左至右的槽号，对照托架和同号 SSD",
      labels: ["托架", "固态硬盘"],
      slotLabel: "前置盘位",
      startExplosion: 1,
      pairs: drivePairs,
    },
    {
      tool: "storage-harness",
      name: "背板线束",
      entry: "核对背板线束",
      detail: "沿 SAS 线束示意核对八盘背板与存储控制卡的接线端",
      memberLabel: "背板线束部件",
      labels: ["磁盘背板", "背板线束", "存储控制卡"],
      startExplosion: 0.45,
      pairs: [
        {
          primary: serverMember(harness.backplane),
          companion: serverMember(harness.harness),
        },
      ],
      additionalPart: serverMember(harness.controller),
    },
    serverPowerCheck("server-2u"),
    {
      tool: "expansion-bay",
      memberLabel: "PCIe 扩展部件",
      name: "PCIe 扩展区",
      entry: "核对网卡与转接架",
      detail: "从机后对照双口网卡、承载它的 01 架和相邻的 02 架",
      startExplosion: 0.32,
      labels: ["网卡", "01 架", "02 架"],
      pairs: [
        {
          primary: serverMember(bay.adapter),
          companion: serverMember(bay.carrier),
        },
      ],
      additionalPart: serverMember(bay.adjacent),
    },
  ],
  "switch-1u": [
    {
      tool: "switch-board",
      name: "主板装配",
      layer: {
        members: "companion",
        label: "芯片装配",
        scope: "散热器姿态",
        seated: "贴合封装",
        separated: "抬起散热器",
      },
      entry: "核对主板与交换芯片",
      detail: "对照主板安装区，可分层查看芯片封装与散热器",
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
      detail: "从机前对照端口笼与主板，可分层查看笼顶导光条和支座",
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
      tool: "switch-power",
      entry: "核对双电源与风扇",
      detail: "在同一排核对两件电源与四件风扇，可逐件查看槽位",
    },
  ],
} as const;

export type AssemblyCheck = (typeof checks)[keyof typeof checks][number];

// 从单件进入沿用该件，从模组进入选择本组第一件。
export function assemblyMember(check: AssemblyCheck, selected: string) {
  if (check.tool === "switch-power") {
    const fan = switchRear.fans.find(
      (part) => part.id === selected || part.parent === selected,
    );
    if (fan) return fan;
  }
  if ("additionalPart" in check && check.additionalPart.id === selected)
    return check.additionalPart;
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
