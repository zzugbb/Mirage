import { modelById } from "./catalog.ts";
import { deviceById } from "./installation.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

const modelParts = (id: string) =>
  definition.parts.filter((part) => modelById(id).parts.includes(part.id));

const server = modelParts("server-2u");
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

const network = modelParts("switch-1u");
const checks = {
  "server-2u": {
    tool: "processor-pair",
    name: "处理器装配",
    entry: "核对处理器与散热器",
    detail: "逐路查看处理器封装与同号散热器",
    labels: ["封装", "散热器"],
    pairs: processorPairs,
  },
  "switch-1u": {
    tool: "switch-board",
    name: "主板装配",
    entry: "核对主板与交换芯片",
    detail: "对照板上安装区与芯片散热组件",
    labels: ["控制主板", "芯片与散热器"],
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
  return model === "server-2u" || model === "switch-1u" ? checks[model] : null;
}

export type AssemblyCheck = NonNullable<ReturnType<typeof assemblyCheck>>;
