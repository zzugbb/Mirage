import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
export const installedFrontZ =
  definition.server.position[2] + definition.server.size[2] / 2;
export const racks = definition.installation.racks;
export const devices = definition.installation.devices;
export const deviceById = (id: string) =>
  devices.find((device) => device.id === id);
export const rackById = (id: string) => racks.find((rack) => rack.id === id);
export const deviceHeight = (id: string) =>
  definition.rack.unitOrigin +
  ((deviceById(id)?.startUnit ?? 23) +
    ((definition.equipmentModels.find(
      (model) => model.id === deviceById(id)?.modelId,
    )?.units ?? 2) -
      1) /
      2) *
    definition.rack.unitPitch;
export const rackForDevice = (id: string) =>
  rackById(deviceById(id)?.rackId ?? "rack-a01")!;

export const coolingRelationFor = (deviceId: string) =>
  definition.installation.relations.find(
    (relation) => relation.target === deviceId,
  )!;
