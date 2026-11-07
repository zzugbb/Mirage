import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import type { AppState } from "./domain.ts";

// 与外观/内部示意切换的过渡边界一致，避免尚在显示外观时隔离内部空分支。
export const internalStructureThreshold = 0.015;
export const canInspectPart = (state: AppState) =>
  state.level === "device" && state.explosion > internalStructureThreshold;

/** 单部件检视只作用于当前已展开的设备；换实例或复原即结束。 */
export function isolatedPart(
  state: AppState,
  selected: string,
  inspectionDevice: string | null,
) {
  return canInspectPart(state) &&
    state.deviceId === inspectionDevice &&
    [
      ...partsForDevice(state.deviceId),
      ...subpartsForDevice(state.deviceId),
    ].some((part) => part.id === selected)
    ? selected
    : null;
}
