import {
  pduById,
  pduName,
  powerLinks,
  powerSettings,
  type PowerLink,
} from "./power-config.ts";
import { deviceById, rackForDevice } from "./installation.ts";
import { unitLabel, partsForDevice, subpartsForDevice } from "./catalog.ts";
import {
  pduOutletPosition,
  powerScene,
  type PowerScene,
} from "./power-paths.ts";
import { powerPairLinks } from "./power-view.ts";
import type { AppState } from "./domain.ts";

type OutletPosition = {
  pduId: string;
  outlet: number | null;
  query: string;
  scroll: number;
};

export type PduInspection = OutletPosition & { peer?: OutletPosition };

export function peerOutlet(link: PowerLink) {
  const peer = powerPairLinks(link.id).find(
    (candidate) => candidate.id !== link.id,
  );
  if (!peer) return null;
  const from = pduOutletPosition(link.pduId, link.outlet);
  const to = pduOutletPosition(peer.pduId, peer.outlet);
  const rack = rackForDevice(link.deviceId);
  const side = (x: number) =>
    x > rack.position[0]
      ? "柜后左侧"
      : x < rack.position[0]
        ? "柜后右侧"
        : "柜后中央";
  return {
    link: peer,
    fromSide: side(from[0]),
    toSide: side(to[0]),
    lateral: Math.abs(to[0] - from[0]),
    heightDifference: Math.abs(to[1] - from[1]),
  };
}

/** 两侧各记自己的插座查找和滚动；换设备或选择空位后重新开始。 */
export function locatePduOutlet(
  current: PduInspection | null,
  link: PowerLink,
): PduInspection {
  const target = {
    pduId: link.pduId,
    outlet: link.outlet,
    query: "",
    scroll: 0,
  };
  if (!current) return target;
  if (current.pduId === link.pduId && current.outlet === link.outlet)
    return current;
  const origin = pduOutlet(current.pduId, current.outlet)?.link;
  if (
    !origin ||
    origin.deviceId !== link.deviceId ||
    origin.inlet === link.inlet
  )
    return target;
  const saved = current.peer;
  return {
    ...(saved?.pduId === link.pduId && saved.outlet === link.outlet
      ? saved
      : target),
    peer: {
      pduId: current.pduId,
      outlet: current.outlet,
      query: current.query,
      scroll: current.scroll,
    },
  };
}

export function pduOutlet(pduId: string, outlet: number | null) {
  if (
    !pduById(pduId) ||
    outlet === null ||
    !Number.isInteger(outlet) ||
    outlet < 1 ||
    outlet > powerSettings.outletsPerPdu
  )
    return null;
  const link =
    powerLinks.find((link) => link.pduId === pduId && link.outlet === outlet) ??
    null;
  return { outlet, link, device: link ? deviceById(link.deviceId)! : null };
}

/** 编号随配置高度递增，俯看列表按高到低排列；查找只淡化，不重排插座。 */
export function pduOutlets(pduId: string, query = "") {
  if (!pduById(pduId)) return [];
  const term = query.trim().toLowerCase();
  return Array.from({ length: powerSettings.outletsPerPdu }, (_, index) => {
    const row = pduOutlet(pduId, powerSettings.outletsPerPdu - index)!;
    const text = [
      String(row.outlet).padStart(2, "0"),
      row.device?.id,
      row.device?.name,
      row.link ? `输入 ${row.link.inlet}` : "未连接",
      row.device ? unitLabel(row.device.id) : "",
    ]
      .join(" ")
      .toLowerCase();
    return {
      ...row,
      matches:
        !term ||
        (/^\d+$/.test(term)
          ? row.outlet === Number(term)
          : text.includes(term)),
    };
  });
}

/** 只在当前插座的端点及所属机柜内延续核对；部件必须属于当前设备。 */
export function pduInspectionIncludes(
  visit: PduInspection,
  selected: string,
  activeDeviceId: string,
) {
  const pdu = pduById(visit.pduId);
  if (!pdu) return false;
  if ([pdu.id, pdu.rackId, powerSettings.sourceId].includes(selected))
    return true;
  const row = pduOutlet(visit.pduId, visit.outlet);
  if (!row?.device) return false;
  if (selected === row.device.id) return true;
  return (
    activeDeviceId === row.device.id &&
    [
      ...partsForDevice(activeDeviceId),
      ...subpartsForDevice(activeDeviceId),
    ].some((part) => part.id === selected)
  );
}

/** 未连接位置只能有框标，不借用活动设备的默认支路，不生成零功耗。 */
export function pduInspectionScene(
  state: AppState,
  selected: string,
  visit: PduInspection | null,
): PowerScene | null {
  if (!visit || selected !== visit.pduId || state.level === "device")
    return null;
  const row = pduOutlet(visit.pduId, visit.outlet),
    pdu = pduById(visit.pduId);
  if (
    !row ||
    !pdu ||
    (state.level === "rack" && rackForDevice(state.deviceId).id !== pdu.rackId)
  )
    return null;
  if (row.link) return powerScene(state, selected, row.link.id);
  return {
    rackId: pdu.rackId,
    deviceId: state.deviceId,
    traceId: null,
    unconnectedOutlet: true,
    paths: [],
    caption: `${pduName(pdu.id)} · 插座 ${String(row.outlet).padStart(2, "0")} · 未连接`,
    labels: [
      {
        id: `power-empty-${pdu.id}-${row.outlet}`,
        kind: "outlet",
        point: pduOutletPosition(pdu.id, row.outlet),
        title: `插座 ${String(row.outlet).padStart(2, "0")} · 未连接`,
      },
    ],
  };
}
