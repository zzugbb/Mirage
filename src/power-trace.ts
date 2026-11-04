import { entityById } from "./domain.ts";
import { deviceById, rackById, rackForDevice } from "./installation.ts";
import {
  modelForDevice,
  unitLabel,
  partsForDevice,
  subpartsForDevice,
} from "./catalog.ts";
import {
  powerLinks,
  powerSettings,
  pduById,
  pduName,
  inletPart,
} from "./power-config.ts";

export const powerLinkById = (id: string | null) =>
  powerLinks.find((link) => link.id === id);
/** 只有显式追踪的配置接入才提供导航，三处位置共用同一条连接。 */
export function powerTraceStops(linkId: string | null) {
  const link = powerLinkById(linkId);
  if (!link) return [];
  const pdu = pduById(link.pduId)!,
    device = deviceById(link.deviceId)!;
  const part = entityById(inletPart(device.modelId, link.inlet))!;
  return [
    {
      id: powerSettings.sourceId,
      name: entityById(powerSettings.sourceId)!.name,
      location: `逻辑出线 ${pdu.sourcePort}`,
    },
    {
      id: pdu.id,
      name: pduName(pdu.id),
      location: `后置 0U · 插座 ${String(link.outlet).padStart(2, "0")}`,
    },
    {
      id: device.id,
      name: device.name,
      location: `${rackForDevice(device.id).name} / ${unitLabel(device.id)}`,
      input: `输入 ${link.inlet} · ${part.name}`,
    },
  ];
}
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
