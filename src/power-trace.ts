import { deviceById, rackById, rackForDevice } from "./installation.ts";
import {
  modelForDevice,
  partsForDevice,
  subpartsForDevice,
} from "./catalog.ts";
import {
  powerLinks,
  powerSettings,
  pduById,
  inletPart,
} from "./power-config.ts";

export const powerLinkById = (id: string | null) =>
  powerLinks.find((link) => link.id === id);
/** 只认配置关系；背景设施不能借用活动设备的默认支路。 */
export function powerLinksForContext(id: string, activeDeviceId: string) {
  if (id === "room-01" || id === powerSettings.sourceId) return powerLinks;
  const pdu = pduById(id);
  if (pdu) return powerLinks.filter((link) => link.pduId === id);
  if (rackById(id))
    return powerLinks.filter((link) => rackForDevice(link.deviceId).id === id);
  const device = deviceById(id);
  if (device) return powerLinks.filter((link) => link.deviceId === id);
  if (
    ![
      ...partsForDevice(activeDeviceId),
      ...subpartsForDevice(activeDeviceId),
    ].some((part) => part.id === id)
  )
    return [];
  const model = modelForDevice(activeDeviceId);
  const feed = (["A", "B"] as const).find(
    (feed) => inletPart(model.id, feed) === id,
  );
  return powerLinks.filter(
    (link) =>
      link.deviceId === activeDeviceId && (!feed || link.inlet === feed),
  );
}
export const powerContextIncludes = (
  id: string,
  activeDeviceId: string,
  linkId: string | null,
) =>
  !!linkId &&
  powerLinksForContext(id, activeDeviceId).some((link) => link.id === linkId);
