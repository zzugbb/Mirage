import { racks, devices } from "./installation.ts";
import { modelForDevice, networkLinks } from "./catalog.ts";
import {
  networkEndpoints,
  switchRole,
  switchesForRack,
  switchPorts,
} from "./network.ts";

/** 从已登记接入生成柜内关系，不把未配置端口当作可用容量。 */
export function networkOverview(query = "") {
  const term = query.trim().toLowerCase();
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
          matches:
            !term ||
            `${device.id} ${device.name} ${connections.flatMap((link) => networkEndpoints(link.id).map((e) => `${e.name} ${e.portLabel}`)).join(" ")}`
              .toLowerCase()
              .includes(term),
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
