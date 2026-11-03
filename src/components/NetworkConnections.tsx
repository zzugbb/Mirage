import { useState } from "react";
import type { AppState } from "../domain";
import { deviceById, rackById } from "../installation";
import { modelForDevice, unitLabel } from "../catalog";
import {
  networkLinksFor,
  networkDeviceId,
  networkSettings,
  sourcePorts,
  switchPorts,
  switchRole,
  switchesForRack,
  networkMarkers,
} from "../network";

export function NetworkConnections({
  state,
  selectedId,
  activeLinkId,
  ready,
  onSelect,
  onLocate,
  onTrace,
  onInteract,
}: {
  state: AppState;
  selectedId: string;
  activeLinkId: string | null;
  ready: boolean;
  onSelect: (id: string) => void;
  onLocate: (id: string) => void;
  onTrace: (id: string | null) => void;
  onInteract: () => void;
}) {
  const [allPorts, setAllPorts] = useState(false);
  const [query, setQuery] = useState("");
  const links = networkLinksFor(selectedId, state.deviceId);
  const id = networkDeviceId(selectedId, state.deviceId),
    rack = rackById(selectedId);
  if (!id && !rack) return null;
  const device = id ? deviceById(id)! : null;
  const isSwitch = device && modelForDevice(device.id).category === "switch";
  const ports = device
    ? isSwitch
      ? switchPorts
      : sourcePorts(device.id).map((p) => ({
          ...p,
          speedGbps: p.speedGbps,
          label: p.name,
        }))
    : [];
  const filtered = ports.filter((port) => {
    const link = links.find(
      (link) => (isSwitch ? link.targetPort : link.sourcePort) === port.port,
    );
    const peer = link
      ? deviceById(isSwitch ? link.source : link.target)!
      : null;
    return (
      (allPorts || !!link) &&
      (!query.trim() ||
        `${String(port.port).padStart(2, "0")} ${port.label} ${peer?.name ?? ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()))
    );
  });
  return (
    <section
      className="network-connections"
      aria-label="网络接入"
      onPointerDownCapture={onInteract}
      onKeyDownCapture={onInteract}
    >
      <h2>
        网络接入 <small>配置示意</small>
      </h2>
      <p className="network-boundary">
        仅查看已登记接入。未采集链路状态、协商速率或流量；设备离线不等于网线断开。
      </p>
      {rack ? (
        <div className="network-switch-list">
          {switchesForRack(rack.id).map((sw) => {
            const members = networkLinksFor(sw.id, state.deviceId);
            return (
              <div key={sw.id}>
                <button onClick={() => onSelect(sw.id)}>
                  <strong>
                    {sw.name} · 接入 {switchRole(sw.id)}
                  </strong>
                  <small>
                    {unitLabel(sw.id)} · {members.length}/
                    {switchPorts.filter((port) => port.speedGbps === 25).length}{" "}
                    个 25G 口已配置
                  </small>
                </button>
                <button onClick={() => onLocate(sw.id)} disabled={!ready}>
                  定位
                </button>
              </div>
            );
          })}
        </div>
      ) : device ? (
        <>
          <div className="network-device-context">
            <span>
              {device.name} ·{" "}
              {isSwitch
                ? `接入 ${switchRole(device.id)}`
                : `${ports.length} 个配置逻辑口`}
            </span>
            <button onClick={() => onLocate(device.id)} disabled={!ready}>
              定位设备 ↗
            </button>
          </div>
          {selectedId !== device.id && (
            <p className="network-boundary">
              以下为所属整机接入，不把所选部件作为独立链路。
            </p>
          )}
          <div className="network-port-controls">
            <label>
              <input
                type="checkbox"
                checked={allPorts}
                onChange={(e) => setAllPorts(e.target.checked)}
              />
              显示未配置端口
            </label>
            <input
              aria-label="查找网络端口或对端"
              placeholder="端口号或对端编号"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div
            className="network-port-table"
            role="table"
            aria-label={`${device.name}逻辑端口`}
          >
            <div role="row" className="network-port-heading">
              <span role="columnheader">逻辑端口 / 对端</span>
              <span role="columnheader">场景</span>
            </div>
            {filtered.map((port) => {
              const link = links.find(
                (link) =>
                  (isSwitch ? link.targetPort : link.sourcePort) === port.port,
              );
              const peer = link
                ? deviceById(isSwitch ? link.source : link.target)!
                : null;
              const visible =
                link && networkMarkers(state, selectedId, link.id).length > 0;
              return (
                <div role="row" className="network-port-row" key={port.port}>
                  <div role="cell">
                    <strong>
                      {isSwitch
                        ? `端口 ${String(port.port).padStart(2, "0")}`
                        : port.label}
                    </strong>
                    {link && peer ? (
                      <button
                        onClick={() => onSelect(peer.id)}
                        aria-label={`预览对端 ${peer.name}端口${isSwitch ? link.sourcePort : link.targetPort}`}
                      >
                        {peer.name} /{" "}
                        {isSwitch
                          ? sourcePorts(peer.id).find(
                              (p) => p.port === link.sourcePort,
                            )!.name
                          : `端口 ${String(link.targetPort).padStart(2, "0")}`}{" "}
                        ↗
                      </button>
                    ) : (
                      <span>未配置连接</span>
                    )}
                    <small>
                      {port.speedGbps} Gb/s 配置
                      {isSwitch && port.speedGbps === 100
                        ? " · 未配置上联"
                        : ""}
                    </small>
                  </div>
                  <div role="cell">
                    {link ? (
                      <button
                        disabled={!ready || !visible}
                        aria-pressed={activeLinkId === link.id}
                        onClick={() =>
                          onTrace(activeLinkId === link.id ? null : link.id)
                        }
                        aria-label={`标记 ${link.id}端点`}
                      >
                        {activeLinkId === link.id ? "取消标记" : "标记端点"}
                      </button>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              );
            })}
            {!filtered.length && (
              <p role="status">没有匹配的端口；可清空查找或显示未配置端口。</p>
            )}
          </div>
          <p className="network-boundary">
            已配置 {links.length} / {ports.length}{" "}
            个逻辑口。未配置不等于物理空闲或可用；A/B
            仅区分接入组，不证明上联独立或冗余保障。场景标记使用设备代表位置，内部使用所属部件，均非物理端口定位。
          </p>
          {!isSwitch && modelForDevice(device.id).category === "storage" && (
            <p className="network-boundary">
              存储逻辑口 1/2
              对应两控制器各一条接入，另两口尚未配置；内部仍为配置示意。
            </p>
          )}
        </>
      ) : null}
      <details>
        <summary>配置边界</summary>
        <p>
          {networkSettings.description}。100G
          端口未定义交换机间互联或上联骨干，不按未连接配置推断链路异常。
        </p>
      </details>
    </section>
  );
}
