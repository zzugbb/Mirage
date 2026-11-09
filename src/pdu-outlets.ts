import { pduById, pduName, powerLinks, powerSettings } from "./power-config.ts";
import { deviceById, rackForDevice } from "./installation.ts";
import { unitLabel, partsForDevice, subpartsForDevice } from "./catalog.ts";
import {
  pduOutletPosition,
  powerScene,
  type PowerScene,
} from "./power-paths.ts";
import type { AppState } from "./domain.ts";

export type PduInspection = {
  pduId: string;
  outlet: number | null;
  query: string;
  scroll: number;
};

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
    paths: [],
    caption: `${pduName(pdu.id)} · 插座 ${String(row.outlet).padStart(2, "0")} · 未连接`,
    labels: [
      {
        id: `power-empty-${pdu.id}-${row.outlet}`,
        kind: "outlet",
        point: pduOutletPosition(pdu.id, row.outlet),
        title: `插座 ${String(row.outlet).padStart(2, "0")} · 未连接`,
        detail: "配置位置 · 非可用容量或运行读数",
      },
    ],
  };
}
