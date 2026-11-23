import { assemblyChecks } from "./assembly-pairs.ts";
import { partsForDevice, subpartsForDevice } from "./catalog.ts";
import { fanAssembly, fanInspectionContext } from "./fan-inspection.ts";
import { storageSlotContext, storageSlots } from "./storage-slots.ts";
import { deviceById } from "./installation.ts";

/** 设备和单件详情共用一份已装部件清单，专用工具保留所在机型及模组的归属。 */
export function structureOptions(deviceId: string, selected: string) {
  if (!deviceById(deviceId)) return;
  const device = selected === deviceId;
  const cover = partsForDevice(deviceId).find((part) => part.node === "lid");
  const dimms = subpartsForDevice(deviceId).filter(
    (part) => part.parent === "memory-01",
  );
  return {
    assemblies: assemblyChecks(deviceId, selected),
    cover: device || selected === cover?.id ? cover : undefined,
    memory:
      device ||
      selected === "memory-01" ||
      dimms.some((part) => part.id === selected)
        ? dimms.length
        : 0,
    fans: fanInspectionContext(deviceId, selected)
      ? fanAssembly(deviceId)!.fans.length
      : 0,
    slots: storageSlotContext(deviceId, selected)
      ? storageSlots(deviceId).length
      : 0,
  };
}
