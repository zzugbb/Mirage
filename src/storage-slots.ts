import { deviceById } from "./installation.ts";
import { modelForDevice, subpartsForDevice } from "./catalog.ts";
import { storageAssembly, storageSlot } from "./storage-layout.ts";
import { canInspectPart } from "./part-inspection.ts";
import type { AppState } from "./domain.ts";

export const storageDriveGroup = "sto-drives";
/** 编号与建模遍历同一份子件清单，二维顺序沿用正面四列六层。 */
export function storageSlots(deviceId: string) {
  if (!deviceById(deviceId) || modelForDevice(deviceId).id !== "storage-4u")
    return [];
  return subpartsForDevice(deviceId)
    .filter((part) => part.parent === storageDriveGroup)
    .map((part, index) => ({
      ...part,
      index,
      row: Math.floor(index / storageAssembly.columns) + 1,
      column: (index % storageAssembly.columns) + 1,
      center: storageSlot(index),
    }));
}
export type StorageSlotInspection = {
  deviceId: string;
  mode: "group" | "disk" | "contact" | "board";
  diskId: string | null;
  pending: boolean;
};
export function storageSlotContext(deviceId: string, selected: string) {
  const slots = storageSlots(deviceId);
  return (
    !!slots.length &&
    (selected === deviceId ||
      selected === storageDriveGroup ||
      selected === "sto-midplane" ||
      slots.some((slot) => slot.id === selected))
  );
}
export function activeStorageSlots(
  visit: StorageSlotInspection | null,
  state: AppState,
  selected: string,
) {
  return visit &&
    state.level === "device" &&
    visit.deviceId === state.deviceId &&
    storageSlotContext(state.deviceId, selected) &&
    (selected !== "sto-midplane" ||
      visit.mode === "contact" ||
      visit.mode === "board") &&
    (visit.pending || canInspectPart(state))
    ? visit
    : null;
}
export function storageSlotKey(index: number, key: string, count: number) {
  const columns = storageAssembly.columns;
  if (key === "Home") return index - (index % columns);
  if (key === "End")
    return Math.min(count - 1, index - (index % columns) + columns - 1);
  if (key === "ArrowLeft") return index % columns ? index - 1 : index;
  if (key === "ArrowRight")
    return index % columns < columns - 1 && index + 1 < count
      ? index + 1
      : index;
  if (key === "ArrowUp") return Math.max(index % columns, index - columns);
  if (key === "ArrowDown")
    return index + columns < count ? index + columns : index;
  return index;
}
