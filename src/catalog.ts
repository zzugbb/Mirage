import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { deviceById } from "./installation.ts";
export const equipmentModels = definition.equipmentModels;
export const modelById = (id: string) =>
  equipmentModels.find((model) => model.id === id)!;
export const modelForDevice = (id: string) =>
  modelById(deviceById(id)?.modelId ?? "server-2u");
export const partsForDevice = (id: string) =>
  definition.parts.filter((part) => modelForDevice(id).parts.includes(part.id));
export const subpartsForDevice = (id: string) => {
  const model = modelForDevice(id);
  return definition.subparts.filter(
    (part) =>
      model.parts.includes(part.parent) &&
      (part.parent !== "memory-01" ||
        Number(part.id.slice(-2)) <= model.dimms) &&
      (!["storage-01", "drives-01"].includes(part.parent) ||
        Number(part.id.slice(-2)) <= model.drives),
  );
};
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
