import { networkLinks } from "./catalog.ts";
import { deviceById } from "./installation.ts";
import {
  modelForDevice,
  partsForDevice,
  subpartsForDevice,
} from "./catalog.ts";
import { supportsNetworkPatch, switchPorts } from "./network.ts";

export type SwitchPortCheck = {
  switchId: string;
  port: number | null;
  query: string;
};
/** 逻辑编号图，不能据此推断外观模型的物理接口位置或空闲容量。 */
export function switchPortRows(switchId: string, query = "") {
  if (!deviceById(switchId) || modelForDevice(switchId).category !== "switch")
    return [];
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return switchPorts.map((port) => {
    const link = networkLinks.find(
      (link) => link.target === switchId && link.targetPort === port.port,
    );
    const peer = link ? deviceById(link.source)! : null;
    const patchSupported = !!link && supportsNetworkPatch(link);
    const text =
      `${port.label} ${port.speedGbps}g ${peer?.name ?? ""} ${peer?.id ?? ""} ${link ? "已配置" : "未配置"} ${patchSupported ? "可看走线" : ""}`.toLowerCase();
    return {
      ...port,
      link: link ?? null,
      peer,
      patchSupported,
      matches: terms.every((term) =>
        /^\d+$/.test(term) ? port.port === Number(term) : text.includes(term),
      ),
    };
  });
}
export function switchPortNeighbor(port: number, key: string) {
  const group = switchPorts.filter(
    (item) =>
      item.speedGbps ===
      switchPorts.find((item) => item.port === port)?.speedGbps,
  );
  const index = group.findIndex((item) => item.port === port);
  if (index < 0) return port;
  const columns = group.length === 48 ? 8 : 6;
  const delta =
    key === "ArrowLeft"
      ? -1
      : key === "ArrowRight"
        ? 1
        : key === "ArrowUp"
          ? -columns
          : key === "ArrowDown"
            ? columns
            : 0;
  const next =
    key === "Home"
      ? 0
      : key === "End"
        ? group.length - 1
        : Math.max(0, Math.min(group.length - 1, index + delta));
  return group[next].port;
}
export function switchPortIncludes(
  check: SwitchPortCheck,
  selected: string,
  deviceId: string,
) {
  const row = switchPortRows(check.switchId).find(
    (row) => row.port === check.port,
  );
  const ids = [check.switchId, ...(row?.peer ? [row.peer.id] : [])];
  return (
    ids.includes(selected) ||
    (ids.includes(deviceId) &&
      [...partsForDevice(deviceId), ...subpartsForDevice(deviceId)].some(
        (part) => part.id === selected,
      ))
  );
}
