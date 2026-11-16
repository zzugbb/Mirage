import { deviceById } from "./installation.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
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
  return fans.length ? { group, fans } : null;
}
export type FanInspection = {
  deviceId: string;
  mode: "group" | "single";
  fanId: string;
  side: "front" | "rear";
  pending: boolean;
};
export function fanInspectionContext(deviceId: string, selected: string) {
  const assembly = fanAssembly(deviceId);
  return (
    !!assembly &&
    (selected === deviceId ||
      selected === assembly.group.id ||
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
