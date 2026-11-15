import { racks, devices } from "./installation.ts";
import { modelForDevice, networkLinks } from "./catalog.ts";
import {
  networkEndpoints,
  switchRole,
  switchesForRack,
  switchPorts,
  type NetworkLink,
} from "./network.ts";

export type NetworkOverviewScope = "rack" | "room";
export type NetworkOverviewRole = "all" | "A" | "B";

/** 多个查找词必须落在同一条配置上，不能拼接两条 A/B 接入凑出结果。 */
function connectionMatches(link: NetworkLink, query: string) {
  const rack = racks.find(
    (item) => item.id === devices.find((d) => d.id === link.source)?.rackId,
  )!;
  const text = `${rack.id} ${rack.name} ${networkEndpoints(link.id)
    .map((e) => `${e.deviceId} ${e.name} ${e.portLabel} ${e.location}`)
    .join(" ")}`.toLowerCase();
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => text.includes(term));
}

/** 全机房按安装顺序列出既有连接；未配置口不生成结果。 */
export function networkConnectionRows(
  query = "",
  role: NetworkOverviewRole = "all",
) {
  return networkOverview().flatMap(({ rack, sources }) =>
    sources.flatMap(({ connections }) =>
      connections
        .filter(
          (link) =>
            (role === "all" || switchRole(link.target) === role) &&
            connectionMatches(link, query),
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
          matches: connections.some((link) => connectionMatches(link, query)),
        };
      });
    return {
      rack,
      links,
      sources,
      matching: sources.filter((source) => source.matches),
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
