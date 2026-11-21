import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { deviceById } from "./installation.ts";
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

/** 只遍历当前机型的同级配置，不把子件与模块混排或编造维修顺序。 */
export function partInspectionSequence(deviceId: string, selected: string) {
  if (!deviceById(deviceId)) return null;
  const modules = partsForDevice(deviceId),
    children = subpartsForDevice(deviceId);
  const child = children.find((part) => part.id === selected);
  const parent = child
    ? modules.find((part) => part.id === child.parent)!
    : null;
  const siblings = parent
    ? children.filter((part) => part.parent === parent.id)
    : modules;
  const index = siblings.findIndex((part) => part.id === selected);
  if (index < 0) return null;
  return {
    parent,
    siblings,
    index,
    previous: siblings[index - 1] ?? null,
    next: siblings[index + 1] ?? null,
    children: children.filter((part) => part.parent === selected),
  };
}
