import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  devices,
  deviceById,
  rackForDevice,
  deviceHeight,
} from "./installation.ts";
import {
  modelForDevice,
  networkLinks,
  partsForDevice,
  subpartsForDevice,
  unitLabel,
} from "./catalog.ts";
import type { AppState } from "./domain.ts";
export const networkSettings = definition.installation.networkAccess;
export type NetworkLink = (typeof networkLinks)[number];
export function supportsNetworkPatch(link: NetworkLink) {
  return (
    networkSettings.patchIllustration.sourceIds.includes(link.source) &&
    rackForDevice(link.source).id === rackForDevice(link.target).id
  );
}
export const networkLinkById = (id: string | null) =>
  networkLinks.find((link) => link.id === id);
export const switchRole = (id: string) =>
  networkSettings.switchRoles.find((role) => role.deviceId === id)?.role;
export const sourcePorts = (id: string) =>
  networkSettings.sourcePorts[
    modelForDevice(id).id as keyof typeof networkSettings.sourcePorts
  ] ?? [];
export const switchPorts = networkSettings.switchPortGroups.flatMap((group) =>
  Array.from({ length: group.last - group.first + 1 }, (_, i) => ({
    port: group.first + i,
    speedGbps: group.speedGbps,
    label: group.label,
  })),
);
export function networkDeviceId(id: string, activeDeviceId: string) {
  if (deviceById(id)) return id;
  return [
    ...partsForDevice(activeDeviceId),
    ...subpartsForDevice(activeDeviceId),
  ].some((part) => part.id === id)
    ? activeDeviceId
    : null;
}
export function networkLinksFor(id: string, activeDeviceId: string) {
  const device = networkDeviceId(id, activeDeviceId);
  return networkLinks.filter((link) =>
    device
      ? link.source === device || link.target === device
      : rackForDevice(link.source).id === id,
  );
}
export function networkContextIncludes(
  id: string,
  activeDeviceId: string,
  linkId: string | null,
) {
  return (
    !!linkId &&
    networkLinksFor(id, activeDeviceId).some((link) => link.id === linkId)
  );
}
/** 两端编号固定跟随连接配置，不随当前选择翻转，也不表示数据方向。 */
export function networkEndpoints(linkId: string | null) {
  const link = networkLinkById(linkId);
  if (!link) return [];
  return (["source", "target"] as const).map((side) => {
    const device = deviceById(link[side])!;
    const port = side === "source" ? link.sourcePort : link.targetPort;
    const source =
      side === "source"
        ? sourcePorts(device.id).find((item) => item.port === port)!
        : null;
    return {
      side,
      deviceId: device.id,
      name: device.name,
      ordinal: side === "source" ? "①" : "②",
      port,
      portLabel:
        source?.name ??
        `接入 ${switchRole(device.id)} / 端口 ${String(port).padStart(2, "0")}`,
      partId: source?.partId ?? networkSettings.switchPartId,
      partName: partsForDevice(device.id).find(
        (part) => part.id === (source?.partId ?? networkSettings.switchPartId),
      )!.name,
      location: `${rackForDevice(device.id).name} / ${unitLabel(device.id)}`,
    };
  });
}
export type NetworkMarker = {
  id: string;
  title: string;
  deviceId: string;
  point?: [number, number, number];
  partId?: string;
};
export function networkMarkers(
  state: AppState,
  selectedId: string,
  linkId: string | null,
): NetworkMarker[] {
  const link = networkLinkById(linkId);
  if (!link || !networkContextIncludes(selectedId, state.deviceId, linkId))
    return [];
  if (
    state.level === "rack" &&
    rackForDevice(link.source).id !== rackForDevice(state.deviceId).id
  )
    return [];
  if (
    state.level === "device" &&
    ![link.source, link.target].includes(state.deviceId)
  )
    return [];
  return networkEndpoints(linkId).flatMap((endpoint) => {
    const { side, deviceId: id, partId } = endpoint;
    if (state.level === "device" && id !== state.deviceId) return [];
    const rack = rackForDevice(id);
    const point: [number, number, number] = [
      rack.position[0] + networkSettings.objectMarkerOffset[0],
      deviceHeight(id) + networkSettings.objectMarkerOffset[1],
      rack.position[2] +
        networkSettings.objectMarkerOffset[2] +
        (state.level === "rack" && state.trayExtended && id === state.deviceId
          ? definition.rack.motion.trayTravel
          : 0),
    ];
    return [
      {
        id: `network-${side}`,
        deviceId: id,
        title: `${endpoint.ordinal} ${endpoint.name}`,
        ...(state.level === "device" ? { partId } : { point }),
      },
    ];
  });
}
export const switchesForRack = (rackId: string) =>
  devices.filter(
    (d) => d.rackId === rackId && modelForDevice(d.id).category === "switch",
  );
