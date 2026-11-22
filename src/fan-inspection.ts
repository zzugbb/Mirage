import { deviceById } from "./installation.ts";
import {
  modelForDevice,
  partsForDevice,
  subpartsForDevice,
} from "./catalog.ts";
import { canInspectPart } from "./part-inspection.ts";
import type { AppState } from "./domain.ts";

/** 沿当前机型的显式模块与子件契约，不把编号解释为物理排列或维修顺序。 */
export function fanAssembly(deviceId: string) {
  if (!deviceById(deviceId)) return null;
  const group = partsForDevice(deviceId).find((part) => part.node === "fans");
  if (!group) return null;
  const fans = subpartsForDevice(deviceId).filter(
    (part) => part.parent === group.id,
  );
  const ductId = modelForDevice(deviceId).fanDuctLayout?.ductId;
  const duct = ductId
    ? partsForDevice(deviceId).find((part) => part.id === ductId)
    : undefined;
  return fans.length ? { group, fans, duct } : null;
}
export const shaftStages = [
  { id: "guard", name: "护网与定位柱", open: "取下护网", close: "装回护网" },
  { id: "rotor", name: "叶轮与轴头", open: "移出叶轮", close: "放回叶轮" },
  { id: "hub", name: "轮毂背孔", open: "移出叶轮", close: "放回叶轮" },
  { id: "spindle", name: "轴套与电机座", open: "取出轴套", close: "压回轴套" },
] as const;
export type FanInspection = {
  shaft?: {
    stage: (typeof shaftStages)[number]["id"];
    rotor: number;
    open: boolean;
  };
  deviceId: string;
  mode: "group" | "single";
  fanId: string;
  side: "front" | "rear" | "duct";
  pending: boolean;
};
export function fanInspectionContext(deviceId: string, selected: string) {
  const assembly = fanAssembly(deviceId);
  return (
    !!assembly &&
    (selected === deviceId ||
      selected === assembly.group.id ||
      selected === assembly.duct?.id ||
      assembly.fans.some((fan) => fan.id === selected))
  );
}
export function activeFanInspection(
  visit: FanInspection | null,
  state: AppState,
  selected: string,
) {
  return visit &&
    state.level === "device" &&
    visit.deviceId === state.deviceId &&
    fanInspectionContext(state.deviceId, selected) &&
    (visit.pending || canInspectPart(state))
    ? visit
    : null;
}
export function fanInspectionNeighbor(
  index: number,
  key: string,
  count: number,
) {
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowLeft" || key === "ArrowUp") return Math.max(0, index - 1);
  if (key === "ArrowRight" || key === "ArrowDown")
    return Math.min(count - 1, index + 1);
  return index;
}
