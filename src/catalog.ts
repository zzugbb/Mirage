import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { deviceById } from "./installation.ts";
export const equipmentModels = definition.equipmentModels;
export const modelById = (id: string) =>
  equipmentModels.find((model) => model.id === id)!;
export const modelForDevice = (id: string) =>
  modelById(deviceById(id)?.modelId ?? "server-2u");
// 同一部件身份可装入不同机型；有槽位映射的后部模块按本机型面板装配。
const partsByModel = new Map(
  equipmentModels.map((model) => {
    const parts = definition.parts
      .filter((part) => model.parts.includes(part.id))
      .map((part) => {
        const panel = model.rearPanels.find(
          (p) => "partId" in p && p.partId === part.id,
        );
        if (!panel?.depth || !panel.explode) return part;
        return {
          ...part,
          position: [...panel.center, (panel.depth - model.depth) / 2],
          size: [...panel.size, panel.depth],
          explode: panel.explode,
          focusDirection: [0.12, 0.55, -1],
        };
      });
    return [model.id, parts] as const;
  }),
);
export const partsForModel = (modelId: string) => partsByModel.get(modelId)!;
export const partsForDevice = (id: string) =>
  partsForModel(modelForDevice(id).id);
export const subpartsForModel = (model: (typeof equipmentModels)[number]) => {
  return definition.subparts.filter(
    (part) =>
      model.parts.includes(part.parent) &&
      (part.parent !== "memory-01" ||
        Number(part.id.slice(-2)) <= model.dimms) &&
      (!["storage-01", "drives-01"].includes(part.parent) ||
        Number(part.id.slice(-2)) <= model.drives),
  );
};
export const subpartsForDevice = (id: string) =>
  subpartsForModel(modelForDevice(id));
export const categoryNames = {
  server: "服务器",
  switch: "交换机",
  storage: "存储阵列",
};
export const unitLabel = (id: string) => {
  const device = deviceById(id)!;
  const units = modelForDevice(id).units;
  return units === 1
    ? `U${device.startUnit}`
    : `U${device.startUnit}–${device.startUnit + units - 1}`;
};
export const networkLinks = definition.installation.networkLinks;
export const powerDistribution = definition.installation.powerDistribution;
