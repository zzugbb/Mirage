import { entityById } from "./domain.ts";
import type { AppState } from "./domain.ts";
import { devices, racks, deviceById, rackForDevice } from "./installation.ts";
import {
  modelForDevice,
  partsForDevice,
  subpartsForDevice,
  unitLabel,
} from "./catalog.ts";

export type ResourceKind =
  "room" | "rack" | "server" | "switch" | "storage" | "facility" | "part";
export type Resource = {
  id: string;
  name: string;
  kind: ResourceKind;
  location: string;
  detail: string;
  parent?: string;
  group?: string;
};
export const resourceFilters = [
  ["all", "全部类型"],
  ["server", "所有服务器"],
  ["switch", "所有交换机"],
  ["storage", "所有存储"],
  ["rack", "所有机柜"],
  ["facility", "机房设施"],
] as const;
export type ResourceFilter = (typeof resourceFilters)[number][0];
export const componentGroups = [
  "计算与内存",
  "磁盘与背板",
  "散热组件",
  "电源模块",
  "网络与扩展",
  "机箱与主板",
];
const groups: Record<string, string> = {
  "processor-01": "计算与内存",
  "processor-02": "计算与内存",
  "memory-01": "计算与内存",
  "storage-01": "磁盘与背板",
  "drives-01": "磁盘与背板",
  "backplane-01": "磁盘与背板",
  "sto-drives": "磁盘与背板",
  "sto-midplane": "磁盘与背板",
  "cables-01": "磁盘与背板",
  "cpu-01": "散热组件",
  "cpu-02": "散热组件",
  "fans-01": "散热组件",
  "duct-01": "散热组件",
  "net-fans": "散热组件",
  "sto-fans": "散热组件",
  "psu-01": "电源模块",
  "psu-02": "电源模块",
  "net-psu-a": "电源模块",
  "net-psu-b": "电源模块",
  "sto-psu-a": "电源模块",
  "sto-psu-b": "电源模块",
  "nic-01": "网络与扩展",
  "raid-01": "网络与扩展",
  "riser-01": "网络与扩展",
  "riser-02": "网络与扩展",
  "io-01": "网络与扩展",
  "net-ports": "网络与扩展",
  "net-asic": "网络与扩展",
  "sto-controller-a": "网络与扩展",
  "sto-controller-b": "网络与扩展",
};
export function resourceCatalog(deviceId: string): Resource[] {
  const modules = partsForDevice(deviceId),
    children = subpartsForDevice(deviceId);
  return [
    {
      id: "room-01",
      name: "01号机房",
      kind: "room",
      location: "浮城演示空间",
      detail: "8 个机柜 · 84 台设备",
    },
    ...racks.map((rack) => ({
      id: rack.id,
      name: rack.name,
      kind: "rack" as const,
      location: "01号机房",
      detail: `42U · ${devices.filter((d) => d.rackId === rack.id).length} 台设备 · ${devices.some((d) => d.rackId === rack.id && modelForDevice(d.id).category === "storage") ? "计算 / 存储混合" : "计算与接入"}`,
    })),
    ...devices
      .toSorted(
        (a, b) => a.rackId.localeCompare(b.rackId) || b.startUnit - a.startUnit,
      )
      .map((device) => {
        const model = modelForDevice(device.id);
        const type =
          model.category === "server"
            ? `${model.units}U 服务器`
            : model.category === "switch"
              ? "接入交换机"
              : "双控存储";
        return {
          id: device.id,
          name: `${type} · ${device.name}`,
          kind: model.category as ResourceKind,
          location: `${rackForDevice(device.id).name} / ${unitLabel(device.id)}`,
          detail: `${model.name} · ${model.units}U`,
        };
      }),
    ...["cooling-01", "power-01"].map((id) => ({
      id,
      name: entityById(id)!.name,
      kind: "facility" as const,
      location: "01号机房",
      detail: "机房设施 · 结构示意",
    })),
    ...modules.map((part) => ({
      id: part.id,
      name: part.name,
      kind: "part" as const,
      location: `${deviceId.toUpperCase()} / ${part.slot}`,
      detail: `${part.slot}${children.some((c) => c.parent === part.id) ? ` · ${children.filter((c) => c.parent === part.id).length} 个子件` : " · 独立部件"}`,
      group: groups[part.id] ?? "机箱与主板",
    })),
    ...children.map((part) => ({
      id: part.id,
      name: part.name,
      kind: "part" as const,
      parent: part.parent,
      location: `${deviceId.toUpperCase()} / ${modules.find((p) => p.id === part.parent)!.name} / ${part.slot}`,
      detail: part.slot,
      group: groups[part.parent] ?? "机箱与主板",
    })),
  ];
}
const normalize = (text: string) => text.toLowerCase().replace(/[\s\-–_]/g, "");
export function findResources(
  state: AppState,
  query: string,
  filter: ResourceFilter,
): Resource[] {
  const catalog = resourceCatalog(state.deviceId);
  const terms = query.trim().split(/\s+/).filter(Boolean).map(normalize);
  if (terms.length === 1) {
    const exact = catalog.find(
      (resource) =>
        resource.kind !== "part" &&
        normalize(resource.id) === terms[0] &&
        (filter === "all" || resource.kind === filter),
    );
    if (exact) return [exact];
  }
  if (terms.length || filter !== "all")
    return catalog.filter(
      (resource) =>
        (resource.kind !== "part" || state.level === "device") &&
        (filter === "all" || resource.kind === filter) &&
        terms.every((term) =>
          normalize(
            `${resource.id} ${resource.name} ${resource.location} ${resource.detail}`,
          ).includes(term),
        ),
    );
  if (state.level === "room")
    return catalog.filter((r) => r.kind === "rack" || r.kind === "facility");
  if (state.level === "rack")
    return catalog.filter(
      (r) => deviceById(r.id)?.rackId === rackForDevice(state.deviceId).id,
    );
  return catalog.filter((r) => r.kind === "part");
}
export function canSelectInScene(state: AppState, id: string) {
  const entity = entityById(id);
  if (!entity) return false;
  if (state.level === "room") return entity.kind !== "part";
  if (state.level === "device")
    return (
      id === state.deviceId ||
      [
        ...partsForDevice(state.deviceId),
        ...subpartsForDevice(state.deviceId),
      ].some((p) => p.id === id)
    );
  return (
    id === rackForDevice(state.deviceId).id ||
    (deviceById(id)?.rackId === rackForDevice(state.deviceId).id &&
      (!state.trayExtended || id === state.deviceId))
  );
}
export function resourceOpenLabel(state: AppState, id: string) {
  const entity = entityById(id);
  if (entity?.kind === "rack") return "查看机柜";
  if (entity?.kind === "device")
    return state.level === "rack" &&
      rackForDevice(id).id === rackForDevice(state.deviceId).id
      ? modelForDevice(id).category === "server"
        ? "查看设备内部"
        : "查看设备"
      : state.level === "device" && id === state.deviceId
        ? "聚焦设备"
        : "查看所在机柜";
  if (entity?.kind === "part") return "定位部件";
  return entity?.kind === "room" ? "返回机房" : "定位设施";
}
