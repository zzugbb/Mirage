import { SwitchPorts } from "./SwitchPorts";
import type { SwitchPortCheck } from "../switch-ports";
import { NetworkViewActions } from "./NetworkViewActions";
import { ConnectionSection } from "./ConnectionSection";
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
  networkEndpoints,
  networkLinkById,
} from "../network";

export function NetworkConnections({
  portCheck,
  onPortChange,
  onPortLeave,
  portRestore,
  state,
  selectedId,
  activeLinkId,
  ready,
  canObserve,
  observing,
  onObserve,
  onReturnView,
  onSelect,
  onLocate,
  onInspect,
  onTrace,
  onInteract,
}: {
  portCheck: SwitchPortCheck | null;
  portRestore: number;
  onPortChange: (check: SwitchPortCheck) => void;
  onPortLeave: (
    check: SwitchPortCheck,
    id: string,
    action: "preview" | "locate" | "inspect",
    linkId: string,
  ) => void;
  state: AppState;
  selectedId: string;
  activeLinkId: string | null;
  ready: boolean;
  canObserve: boolean;
  observing: boolean;
  onObserve: () => void;
  onReturnView: () => void;
  onSelect: (id: string) => void;
  onLocate: (id: string) => void;
  onInspect: (id: string) => void;
  onTrace: (id: string | null) => void;
  onInteract: () => void;
}) {
  const [allPorts, setAllPorts] = useState(false);
  const [query, setQuery] = useState("");
  const activeLink = networkLinkById(activeLinkId);
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
    <ConnectionSection
      title="网络接入"
      className="network-connections"
      summary={
        rack
          ? `${switchesForRack(rack.id).length} 台交换机 · 配置`
          : `${links.length} / ${ports.length} 口已配置`
      }
      active={!!activeLinkId || portCheck?.switchId === id}
      onInteract={onInteract}
    >
      {isSwitch && selectedId !== device?.id && (
        <p className="network-boundary">
          以下为所属整机逻辑端口，不把当前部件作为独立链路。
        </p>
      )}
      {isSwitch &&
        device &&
        (() => {
          const check: SwitchPortCheck = {
            switchId: device.id,
            query: portCheck?.switchId === device.id ? portCheck.query : "",
            port:
              activeLink?.target === device.id
                ? activeLink.targetPort
                : portCheck?.switchId === device.id
                  ? portCheck.port
                  : null,
          };
          return (
            <SwitchPorts
              check={check}
              ready={ready}
              canObserve={canObserve}
              observing={observing}
              traced={activeLink?.target === device.id}
              restoreRevision={portRestore}
              onChange={onPortChange}
              onSelect={(port) => {
                onPortChange({ ...check, port });
                onTrace(
                  links.find((link) => link.targetPort === port)?.id ?? null,
                );
              }}
              onPreview={(id) => {
                const link = links.find(
                  (link) => link.targetPort === check.port,
                );
                if (link) onPortLeave(check, id, "preview", link.id);
              }}
              onLocate={(id) => {
                const link = links.find(
                  (link) => link.targetPort === check.port,
                );
                if (link) onPortLeave(check, id, "locate", link.id);
              }}
              onInspect={(id, linkId) =>
                onPortLeave(check, id, "inspect", linkId)
              }
              onObserve={onObserve}
              onReturnView={onReturnView}
            />
          );
        })()}
      {activeLink && !isSwitch && (
        <section className="network-trace" aria-label="当前网络连接">
          <div className="network-trace-heading">
            <span>{activeLink.speedGbps} Gb/s · 配置接入</span>
            <button onClick={() => onTrace(null)}>结束标记</button>
          </div>
          <div
            className="network-trace-branches"
            role="group"
            aria-label="同一设备的接入配置"
          >
            <span>{deviceById(activeLink.source)!.name} 接入</span>
            {networkLinksFor(activeLink.source, state.deviceId).map((link) => (
              <button
                key={link.id}
                disabled={!ready}
                aria-pressed={activeLink.id === link.id}
                aria-label={`查看 ${deviceById(link.source)!.name} 接入 ${switchRole(link.target)}`}
                onClick={() => onTrace(link.id)}
              >
                {switchRole(link.target)} · {deviceById(link.target)!.name}
              </button>
            ))}
          </div>
          {canObserve && (
            <NetworkViewActions
              active={observing}
              ready={ready}
              onObserve={onObserve}
              onReturn={onReturnView}
            />
          )}
          {networkEndpoints(activeLink.id).map((endpoint) => (
            <div className="network-trace-endpoint" key={endpoint.side}>
              <span aria-hidden="true">{endpoint.ordinal}</span>
              <button
                className="network-trace-preview"
                aria-label={`预览端点 ${endpoint.name}`}
                onClick={() => onSelect(endpoint.deviceId)}
              >
                <strong>{endpoint.name}</strong>
                <small>{endpoint.portLabel}</small>
                <small>{endpoint.location}</small>
                <small>所属部件 · {endpoint.partName}</small>
              </button>
              <div className="network-endpoint-actions">
                <button
                  disabled={!ready}
                  aria-label={`定位安装位 ${endpoint.name}`}
                  onClick={() => onLocate(endpoint.deviceId)}
                >
                  安装位
                </button>
                <button
                  disabled={!ready}
                  aria-label={`查看 ${endpoint.name} 的${endpoint.partName}`}
                  onClick={() => onInspect(endpoint.deviceId)}
                >
                  查看部件
                </button>
              </div>
            </div>
          ))}
          <p className="network-boundary" role="status">
            {state.level === "device"
              ? [activeLink.source, activeLink.target].includes(state.deviceId)
                ? "当前展示本端部件；可查看另一端部件，或返回安装位。"
                : "当前结构不含此连接的端点；请定位安装位或查看部件。"
              : "端点标记对应整机安装位置；查看部件将进入整机并展开。"}
          </p>
        </section>
      )}
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
      ) : device && !isSwitch ? (
        <>
          {!activeLink && (
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
          )}
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
                <div
                  role="row"
                  className="network-port-row"
                  data-traced={!!link && activeLinkId === link.id}
                  key={port.port}
                >
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
        </>
      ) : null}
      <details>
        <summary>配置边界</summary>
        <p>未采集链路状态、协商速率或流量；设备离线不等于断链。</p>
        <p className="network-boundary">
          未配置不等于物理空闲或可用；A/B
          仅区分接入组，不证明上联独立或冗余保障。场景标记使用设备代表位置，内部使用所属部件，均非物理端口定位。
        </p>
        {device &&
          !isSwitch &&
          modelForDevice(device.id).category === "storage" && (
            <p className="network-boundary">
              存储逻辑口 1/2
              对应两控制器各一条接入，另两口尚未配置；内部仍为配置示意。
            </p>
          )}
        <p>
          {networkSettings.description}。100G
          端口未定义交换机间互联或上联骨干，不按未连接配置推断链路异常。
        </p>
      </details>
    </ConnectionSection>
  );
}
