import { partsForDevice, subpartsForDevice } from "./catalog.ts";
/** 每个配置的维护部件清单；数量来自明确配置，不从模型网格数猜测。 */
export function componentCoverageFor(deviceId: string) {
  const children = subpartsForDevice(deviceId);
  return partsForDevice(deviceId).map((part) => {
    const ids = children
      .filter((child) => child.parent === part.id)
      .map((child) => child.id);
    return {
      name: part.name,
      quantity: ids.length || 1,
      partIds: [part.id, ...ids],
    };
  });
}
