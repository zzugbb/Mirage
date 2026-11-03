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
} from "./catalog.ts";
import type { AppState } from "./domain.ts";
export const networkSettings = definition.installation.networkAccess;
export type NetworkLink = (typeof networkLinks)[number];
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
export type NetworkMarker = {
  id: string;
  title: string;
  detail: string;
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
  return (["source", "target"] as const).flatMap((side) => {
    const id = link[side],
      device = deviceById(id)!,
      port = side === "source" ? link.sourcePort : link.targetPort;
    if (state.level === "device" && id !== state.deviceId) return [];
    const partId =
      side === "source"
        ? sourcePorts(id).find((p) => p.port === port)!.partId
        : networkSettings.switchPartId;
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
        title: `${device.name} · ${side === "source" ? sourcePorts(id).find((p) => p.port === port)!.name : `接入 ${switchRole(id)} / 端口 ${String(port).padStart(2, "0")}`}`,
        detail:
          state.level === "device"
            ? "所属部件 · 配置示意，非物理端口定位"
            : `${link.speedGbps} Gb/s 配置 · 设备代表位置`,
        ...(state.level === "device" ? { partId } : { point }),
      },
    ];
  });
}
export const switchesForRack = (rackId: string) =>
  devices.filter(
    (d) => d.rackId === rackId && modelForDevice(d.id).category === "switch",
  );
