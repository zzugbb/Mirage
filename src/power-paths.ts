import type { PduMountInspection } from "./pdu-mounts.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  devices,
  deviceById,
  rackById,
  rackForDevice,
  deviceHeight,
} from "./installation.ts";
import { modelForDevice, partsForDevice } from "./catalog.ts";
import { entityById } from "./domain.ts";
import type { AppState } from "./domain.ts";
import {
  pdus,
  pduById,
  pduName,
  pduOutletOffsetY,
  powerLinks,
  powerSettings,
  inletPart,
} from "./power-config.ts";
import type { PowerFeed } from "./power-config.ts";
import { powerLinksForContext, powerLinkById } from "./power-trace.ts";
export type PowerPoint = [number, number, number];
export type PowerPath = { feed: PowerFeed; points: PowerPoint[] };
export type PowerLabel = {
  id: string;
  point?: PowerPoint;
  partId?: string;
  kind?: "outlet";
  title: string;
};
export type PowerScene = {
  closeUp?: boolean;
  mount?: PduMountInspection;
  unconnectedOutlet?: true;
  rackId: string;
  deviceId: string;
  caption: string;
  paths: PowerPath[];
  labels: PowerLabel[];
  traceId: string | null;
};
const add = (a: number[], b: number[]): PowerPoint => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
export const pduPosition = (id: string) => {
  const pdu = pduById(id)!;
  return add(
    rackById(pdu.rackId)!.position,
    powerSettings.layout.positions[pdu.feed],
  );
};
export function pduOutletPosition(id: string, outlet: number): PowerPoint {
  return add(pduPosition(id), [
    0,
    pduOutletOffsetY(outlet),
    powerSettings.layout.outletOffsetZ,
  ]);
}

/** 只画已配置的代表支路；A/B 实虚区分接入身份，不表示电流、分流比例或冗余。 */
export function powerScene(
  state: AppState,
  selectedId: string,
  traceId: string | null = null,
): PowerScene | null {
  if (!entityById(selectedId)) return null;
  const context = powerLinksForContext(selectedId, state.deviceId);
  if (!context.length) return null;
  const traced = context.some((link) => link.id === traceId)
    ? powerLinkById(traceId)
    : undefined;
  const pdu = pduById(selectedId),
    selectedDevice = deviceById(selectedId),
    entity = entityById(selectedId);
  const rack = traced
    ? rackForDevice(traced.deviceId)
    : pdu
      ? rackById(pdu.rackId)!
      : selectedDevice
        ? rackForDevice(selectedDevice.id)
        : (rackById(selectedId) ?? rackForDevice(state.deviceId));
  if (
    state.level === "device" &&
    selectedId !== state.deviceId &&
    entity?.kind !== "part"
  )
    return null;
  if (state.level === "rack" && rack.id !== rackForDevice(state.deviceId).id)
    return null;
  const device =
    (traced ? deviceById(traced.deviceId) : selectedDevice) ??
    (rackForDevice(state.deviceId).id === rack.id
      ? deviceById(state.deviceId)!
      : devices.find((device) => device.rackId === rack.id)!);
  const model = modelForDevice(device.id);
  const selectedFeed = (["A", "B"] as const).find(
    (feed) => inletPart(model.id, feed) === selectedId,
  );
  const feeds = traced
    ? [traced.inlet]
    : pdu
      ? [pdu.feed]
      : selectedFeed
        ? [selectedFeed]
        : (["A", "B"] as PowerFeed[]);
  const paths: PowerPath[] = [],
    labels: PowerLabel[] = [];
  const source = definition.facilities.find(
    (facility) => facility.id === powerSettings.sourceId,
  )!;
  const sourcePoint = add(source.position, powerSettings.routing.sourceOffset);
  if (state.level === "room")
    labels.push({
      id: "power-source",
      point: sourcePoint,
      title: traced
        ? `逻辑出线 ${pduById(traced.pduId)!.sourcePort}`
        : "配电柜 · 逻辑出线",
    });
  for (const feed of feeds) {
    const targetPdu = traced
      ? pduById(traced.pduId)!
      : pdus.find((pdu) => pdu.rackId === rack.id && pdu.feed === feed)!;
    const link =
      traced ??
      powerLinks.find(
        (link) => link.pduId === targetPdu.id && link.deviceId === device.id,
      )!;
    const partId = inletPart(model.id, feed);
    if (state.level === "device") {
      labels.push({
        id: `power-part-${feed}`,
        partId,
        title: `输入 ${feed} · ${model.id.startsWith("server") ? `电源 ${feed === "A" ? "01" : "02"}` : `电源 ${feed}`}`,
      });
      continue;
    }
    const inlet = add(
      pduPosition(targetPdu.id),
      powerSettings.layout.inletOffset,
    );
    const rearZ =
      rack.position[2] -
      definition.rack.size[2] / 2 -
      powerSettings.routing.rearClearance;
    const height = powerSettings.routing.height + (feed === "B" ? 0.06 : 0);
    if (state.level === "room")
      paths.push({
        feed,
        points: [
          sourcePoint,
          [sourcePoint[0], height, sourcePoint[2]],
          [powerSettings.routing.serviceAisleX, height, sourcePoint[2]],
          [powerSettings.routing.serviceAisleX, height, rearZ],
          [inlet[0], height, rearZ],
          [inlet[0], inlet[1], rearZ],
          inlet,
        ],
      });
    const outlet = pduOutletPosition(targetPdu.id, link.outlet);
    const psu = partsForDevice(device.id).find((part) => part.id === partId)!;
    const endpoint: PowerPoint = [
      rack.position[0] + psu.position[0],
      deviceHeight(device.id) + psu.position[1],
      rack.position[2] +
        0.555 -
        model.depth +
        (state.level === "rack" &&
        state.trayExtended &&
        device.id === state.deviceId
          ? definition.rack.motion.trayTravel
          : 0),
    ];
    paths.push({
      feed,
      points: [
        outlet,
        [outlet[0], outlet[1], rearZ],
        [endpoint[0], endpoint[1], rearZ],
        endpoint,
      ],
    });
    labels.push({
      id: `power-pdu-${feed}`,
      point: traced ? outlet : inlet,
      ...(traced ? { kind: "outlet" as const } : {}),
      title: traced
        ? `${pduName(targetPdu.id)} · 插座 ${String(link.outlet).padStart(2, "0")}`
        : pduName(targetPdu.id),
    });
    if (state.level === "rack" || traced)
      labels.push({
        id: `power-inlet-${feed}`,
        point: endpoint,
        title: `${device.name} / 输入 ${feed}`,
      });
  }
  return {
    rackId: rack.id,
    deviceId: device.id,
    caption: `${rack.name.split(" ")[0]} / ${device.name} · ${feeds.join("+")} ${traced ? `插座 ${String(traced.outlet).padStart(2, "0")}` : "接入示意"}`,
    traceId: traced?.id ?? null,
    paths,
    labels,
  };
}
