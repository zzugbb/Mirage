import { racks, devices, deviceById, rackForDevice } from "./installation.ts";
import { modelForDevice, networkLinks } from "./catalog.ts";
import {
  networkEndpoints,
  supportsNetworkPatch,
  switchRole,
  switchesForRack,
  switchPorts,
  type NetworkLink,
} from "./network.ts";

export type NetworkOverviewScope = "rack" | "room" | "patch";
export type NetworkOverviewRole = "all" | "A" | "B";

// 将界面里的“端口 09”和“控制器 B”等完整字段保留为一个查找词。
function searchTerms(query: string) {
  return query
    .normalize("NFKC")
    .toLowerCase()
    .replace(/(交换机口|端口)\s+(?=\d)/g, "$1")
    .replace(/(控制器|接入)\s+([ab])(?=$|[\s/])/g, "$1$2")
    .trim()
    .split(/[\s/]+/)
    .filter(Boolean);
}

/** 多个查找词必须落在同一条配置上，不能拼接两条 A/B 接入凑出结果。 */
function connectionMatches(link: NetworkLink, terms: string[]) {
  if (!terms.length) return true;
  const rack = rackForDevice(link.source);
  const ends = networkEndpoints(link.id);
  const text = searchTerms(
    `${rack.id} ${rack.name} ${ends
      .map((e) => `${e.deviceId} ${e.name} ${e.portLabel} ${e.location}`)
      .join(" ")}`,
  ).join(" ");
  return terms.every((term) => {
    const port = /^(?:端口|交换机口)(\d+)$/.exec(term);
    if (port) return Number(port[1]) === link.targetPort;
    const unit = /^u(\d+)$/.exec(term);
    if (unit) {
      const u = Number(unit[1]);
      return ends.some(({ deviceId }) => {
        const start = deviceById(deviceId)!.startUnit;
        return u >= start && u < start + modelForDevice(deviceId).units;
      });
    }
    return text.includes(term);
  });
}

/** 全机房按安装顺序列出既有连接；未配置口不生成结果。 */
export function networkConnectionRows(
  query = "",
  role: NetworkOverviewRole = "all",
  patchOnly = false,
) {
  return networkOverview(query).flatMap(({ rack, matching }) =>
    matching.flatMap(({ matchingLinks }) =>
      matchingLinks
        .filter(
          (link) =>
            (!patchOnly || supportsNetworkPatch(link)) &&
            (role === "all" || switchRole(link.target) === role),
        )
        .map((link) => ({
          rack,
          link,
          role: switchRole(link.target),
          endpoints: networkEndpoints(link.id),
        })),
    ),
  );
}

/** 从已登记接入生成柜内关系，不把未配置端口当作可用容量。 */
export function networkOverview(query = "") {
  const terms = searchTerms(query);
  return racks.map((rack) => {
    const links = networkLinks.filter(
      (link) => devices.find((d) => d.id === link.source)?.rackId === rack.id,
    );
    const sources = devices
      .filter(
        (d) =>
          d.rackId === rack.id && modelForDevice(d.id).category !== "switch",
      )
      .sort((a, b) => b.startUnit - a.startUnit)
      .map((device) => {
        const connections = links.filter((link) => link.source === device.id);
        return {
          device,
          connections,
          matchingLinks: connections.filter((link) =>
            connectionMatches(link, terms),
          ),
        };
      });
    return {
      rack,
      links,
      sources,
      matching: sources.filter((source) => source.matchingLinks.length > 0),
      switches: switchesForRack(rack.id).map((device) => ({
        device,
        role: switchRole(device.id),
        configured: links.filter((link) => link.target === device.id).length,
        ports: switchPorts.length,
        uplinks: switchPorts.filter((port) => port.speedGbps === 100).length,
      })),
    };
  });
}
