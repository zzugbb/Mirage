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
    const panels: (typeof equipmentModels)[number]["rearPanels"][number][] =
      model.rearPanels;
    const bay = model.expansionBay;
    const adapterPanel =
      bay &&
      panels.find((panel) => "partId" in panel && panel.partId === bay.adapter);
    const parts = definition.parts
      .filter((part) => model.parts.includes(part.id))
      .map((part) => {
        if (
          bay &&
          adapterPanel &&
          [bay.adapter, bay.carrier, bay.adjacent].includes(part.id)
        ) {
          const [x, y] = adapterPanel.center;
          return {
            ...part,
            position: [
              x + (part.id === bay.adjacent ? bay.spacing : 0),
              y,
              (bay.depth - model.depth) / 2 + 0.002,
            ],
            size: [...adapterPanel.size, bay.depth],
            explode:
              part.id === bay.adapter
                ? bay.adapterTravel
                : part.id === bay.carrier
                  ? bay.carrierTravel
                  : bay.adjacentTravel,
            focusDirection: [0.55, 0.88, -1],
          };
        }
        const mount = model.controllerMount;
        if (
          mount &&
          (part.id === mount.boardId || part.id === mount.controllerId)
        ) {
          const card = part.id === mount.controllerId;
          return {
            ...part,
            position: card ? mount.controllerCenter : mount.boardCenter,
            size: card ? mount.controllerSize : mount.boardSize,
            explode: card ? mount.controllerTravel : part.explode,
            focusDirection: [0.32, 1, -0.85],
          };
        }
        const panel = panels.find((p) => "partId" in p && p.partId === part.id);
        if (!panel || !("depth" in panel) || !panel.depth || !panel.explode)
          return part;
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
