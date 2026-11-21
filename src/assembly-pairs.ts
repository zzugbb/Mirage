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
const storage = modelParts("storage-4u").filter(
  (part) => part.node === "controller",
);
const controllerA = storage.find((part) => part.slot === "CTRL-A")!;
const controllerB = storage.find((part) => part.slot === "CTRL-B")!;
const checks = {
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
  return model === "server-2u" ||
    model === "switch-1u" ||
    model === "storage-4u"
    ? checks[model]
    : null;
}

export type AssemblyCheck = NonNullable<ReturnType<typeof assemblyCheck>>;
