import { modelById, partsForModel, subpartsForModel } from "./catalog.ts";
import { inletPart } from "./power-config.ts";
import { deviceById } from "./installation.ts";

const server = partsForModel("server-2u");
export const processorPairs = server
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
const checks = {
  "server-1u": [
    {
      tool: "compact-power",
      name: "双电源",
      entry: "核对双电源",
      detail: "从机后对照电源槽位与配置输入 A、B",
      labels: ["输入 A", "输入 B"],
      startExplosion: 0.35,
      pairs: [powerPair("server-1u")],
    },
  ],
  "storage-4u": [
    {
      tool: "storage-controllers",
      name: "双控制器",
      entry: "核对双控制器",
      detail: "从机后对照两个控制器及其槽位",
      labels: [controllerA.name, controllerB.name],
      startExplosion: 0.3,
      pairs: [{ primary: controllerA, companion: controllerB }],
    },
  ],
  "server-2u": [
    {
      tool: "processor-pair",
      name: "处理器装配",
      entry: "核对处理器与散热器",
      detail: "逐路查看处理器封装与同号散热器",
      labels: ["封装", "散热器"],
      startExplosion: 0.55,
      slotLabel: "处理器槽位",
      pairs: processorPairs,
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
  ],
  "switch-1u": [
    {
      tool: "switch-board",
      name: "主板装配",
      entry: "核对主板与交换芯片",
      detail: "对照板上安装区与芯片散热组件",
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
      tool: "switch-power",
      name: "双电源",
      entry: "核对双电源",
      detail: "从机后对照两个电源模块及其输入槽位",
      labels: ["电源 A", "电源 B"],
      startExplosion: 0.2,
      pairs: [powerPair("switch-1u")],
    },
  ],
} as const;

export type AssemblyCheck = (typeof checks)[keyof typeof checks][number];

// 从单件进入沿用该件，从模组进入选择本组第一件。
export function assemblyMember(check: AssemblyCheck, selected: string) {
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
