import { partsForModel } from "./catalog.ts";
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

const network = partsForModel("switch-1u");
const storage = partsForModel("storage-4u").filter(
  (part) => part.node === "controller",
);
const controllerA = storage.find((part) => part.slot === "CTRL-A")!;
const controllerB = storage.find((part) => part.slot === "CTRL-B")!;
const compact = partsForModel("server-1u");
const compactPsu = (feed: "A" | "B") =>
  compact.find((part) => part.id === inletPart("server-1u", feed))!;
const checks = {
  "server-1u": {
    tool: "compact-power",
    name: "双电源",
    entry: "核对双电源",
    detail: "从机后对照电源槽位与配置输入 A、B",
    labels: ["输入 A", "输入 B"],
    startExplosion: 0.35,
    pairs: [{ primary: compactPsu("A"), companion: compactPsu("B") }],
  },
  "storage-4u": {
    tool: "storage-controllers",
    name: "双控制器",
    entry: "核对双控制器",
    detail: "从机后对照两个控制器及其槽位",
    labels: [controllerA.name, controllerB.name],
    startExplosion: 0.3,
    pairs: [{ primary: controllerA, companion: controllerB }],
  },
  "server-2u": {
    tool: "processor-pair",
    name: "处理器装配",
    entry: "核对处理器与散热器",
    detail: "逐路查看处理器封装与同号散热器",
    labels: ["封装", "散热器"],
    startExplosion: 0.55,
    pairs: processorPairs,
  },
  "switch-1u": {
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
} as const;

export function assemblyCheck(deviceId: string) {
  const model = deviceById(deviceId)?.modelId;
  return model === "server-1u" ||
    model === "server-2u" ||
    model === "switch-1u" ||
    model === "storage-4u"
    ? checks[model]
    : null;
}

export type AssemblyCheck = NonNullable<ReturnType<typeof assemblyCheck>>;
