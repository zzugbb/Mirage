import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import {
  networkOverview,
  networkConnectionRows,
  type NetworkOverviewScope,
  type NetworkOverviewRole,
} from "../network-overview";
import { supportsNetworkPatch, switchRole, type NetworkLink } from "../network";
import { networkLinks, unitLabel } from "../catalog";

const patchCount = networkLinks.filter(supportsNetworkPatch).length;

export function NetworkOverview({
  scope,
  role,
  visible,
  restoreRevision,
  focusKey,
  onScope,
  onRole,
  rackId,
  query,
  activeLink,
  selected,
  scroll,
  ready,
  onRack,
  onQuery,
  onTrace,
  onPreview,
  onLocate,
  onOpenPatch,
}: {
  scope: NetworkOverviewScope;
  role: NetworkOverviewRole;
  visible: boolean;
  restoreRevision: number;
  focusKey: RefObject<string | null>;
  onScope: (scope: NetworkOverviewScope) => void;
  onRole: (role: NetworkOverviewRole) => void;
  rackId: string;
  query: string;
  activeLink: string | null;
  selected: string;
  scroll: RefObject<number>;
  ready: boolean;
  onRack: (id: string) => void;
  onQuery: (query: string) => void;
  onTrace: (id: string) => void;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  onOpenPatch: (link: NetworkLink) => void;
}) {
  const all = useMemo(() => networkOverview(query), [query]);
  const patchOnly = scope === "patch";
  const rows = useMemo(
    () => networkConnectionRows(query, role, patchOnly),
    [query, role, patchOnly],
  );
  const current = all.find((item) => item.rack.id === rackId) ?? all[0];
  const host = useRef<HTMLElement>(null);
  const restorePending = useRef(true);
  useLayoutEffect(() => {
    if (host.current) host.current.scrollTop = scroll.current;
  }, [rackId, scope, scroll]);
  useLayoutEffect(() => {
    restorePending.current = true;
  }, [visible, restoreRevision]);
  useLayoutEffect(() => {
    if (!visible || !ready || !restorePending.current || !host.current) return;
    restorePending.current = false;
    host.current.scrollTop = scroll.current;
    const entry =
      [
        ...host.current.querySelectorAll<HTMLElement>("[data-network-focus]"),
      ].find((el) => el.dataset.networkFocus === focusKey.current) ??
      host.current.querySelector<HTMLElement>("input");
    entry?.focus({ preventScroll: true });
    if (restoreRevision) entry?.scrollIntoView({ block: "nearest" });
  }, [visible, restoreRevision, ready, scroll, focusKey]);
  return (
    <section
      ref={host}
      className="network-overview"
      aria-label="机房网络接入图"
      onFocusCapture={(e) => {
        const key = (e.target as HTMLElement).dataset.networkFocus;
        if (key) focusKey.current = key;
      }}
      onScroll={(e) => {
        if (visible) scroll.current = e.currentTarget.scrollTop;
      }}
    >
      <header>
        <strong>机房网络接入图</strong>
        <p>
          {all.length} 柜 · {all.reduce((n, r) => n + r.switches.length, 0)}{" "}
          台交换机 · {all.reduce((n, r) => n + r.links.length, 0)} 条配置接入
        </p>
      </header>
      <div className="network-map-controls">
        <div
          className="network-map-scopes"
          role="group"
          aria-label="接入图查找范围"
        >
          {(
            [
              ["rack", "逐柜接入图"],
              ["room", "全机房连接"],
              ["patch", `可看走线（${patchCount}）`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              aria-pressed={scope === value}
              onClick={() => onScope(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {scope !== "rack" && (
          <label>
            接入分支
            <select
              aria-label="接入图分支"
              value={role}
              onChange={(e) => onRole(e.target.value as NetworkOverviewRole)}
            >
              <option value="all">全部 A/B</option>
              <option value="A">接入 A</option>
              <option value="B">接入 B</option>
            </select>
          </label>
        )}
      </div>
      <label className="network-map-search">
        查找设备或对端
        <input
          aria-label="接入图查找设备或对端"
          data-network-focus="query"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="如 B04 SW-16 端口09"
        />
      </label>
      {scope !== "rack" ? (
        <>
          <p role="status">
            {rows.length} /{" "}
            {patchOnly
              ? patchCount
              : all.reduce((n, r) => n + r.links.length, 0)}{" "}
            {patchOnly
              ? "条可看走线 · 选择连接进入机柜"
              : "条配置接入 · 按机柜 / U 位排列"}
          </p>
          <div className="network-connection-list" aria-label="全机房连接结果">
            {rows.map(({ rack, link, role: branch, endpoints }) => (
              <button
                key={link.id}
                data-network-focus={link.id}
                aria-pressed={activeLink === link.id}
                aria-disabled={!ready}
                onClick={() =>
                  ready && (patchOnly ? onOpenPatch(link) : onTrace(link.id))
                }
              >
                <strong>
                  ① {endpoints[0].name} <span>{unitLabel(link.source)}</span> ·
                  ② {endpoints[1].name} <span>{unitLabel(link.target)}</span>
                </strong>
                <small>
                  {rack.name.split(" ")[0]} · 接入 {branch} · 交换机口{" "}
                  {String(link.targetPort).padStart(2, "0")}
                </small>
              </button>
            ))}
          </div>
          {!rows.length && (
            <p role="status">
              没有匹配的配置连接。可调整分支或
              <button onClick={() => onQuery("")}>清除查找</button>。
            </p>
          )}
          {activeLink && !rows.some(({ link }) => link.id === activeLink) && (
            <p role="status">
              当前标记连接不在查找结果中；调整条件不会改动已登记配置。
            </p>
          )}
        </>
      ) : (
        <>
          <div
            className="network-rack-grid"
            role="group"
            aria-label="接入图机柜"
          >
            {all.map((item) => (
              <button
                key={item.rack.id}
                data-network-focus={item.rack.id}
                aria-pressed={item.rack.id === current.rack.id}
                onClick={() => onRack(item.rack.id)}
              >
                <b>{item.rack.name.split(" ")[0]}</b>
                {query.trim() && (
                  <small>
                    {item.matching.length}/{item.sources.length} 台
                  </small>
                )}
              </button>
            ))}
          </div>
          <div className="network-map-heading">
            <strong>{current.rack.name}</strong>
            <button disabled={!ready} onClick={() => onLocate(current.rack.id)}>
              检视机柜
            </button>
          </div>
          <div className="network-map-switches">
            {current.switches.map((sw) => (
              <button
                key={sw.device.id}
                data-network-focus={sw.device.id}
                aria-pressed={selected === sw.device.id}
                onClick={() => onPreview(sw.device.id)}
              >
                <b>
                  接入 {sw.role} · {sw.device.name}
                </b>
                <small>
                  {unitLabel(sw.device.id)} · 已配 {sw.configured}/{sw.ports}
                </small>
              </button>
            ))}
          </div>
          <div className="network-map-columns" aria-hidden="true">
            <span>A 口</span>
            <span>设备 / U 位</span>
            <span>B 口</span>
          </div>
          <div className="network-map-nodes">
            {current.matching.map(({ device, connections, matchingLinks }) => (
              <div className="network-map-node" key={device.id}>
                {(["A", "device", "B"] as const).map((role) => {
                  if (role === "device")
                    return (
                      <button
                        className="network-map-device"
                        data-network-focus={device.id}
                        key={role}
                        aria-pressed={selected === device.id}
                        onClick={() => onPreview(device.id)}
                      >
                        <b>{device.name}</b>
                        <small>{unitLabel(device.id)}</small>
                      </button>
                    );
                  const link = connections.find(
                    (item) => switchRole(item.target) === role,
                  );
                  const match =
                    link &&
                    matchingLinks.length < connections.length &&
                    matchingLinks.includes(link);
                  return link ? (
                    <button
                      className="network-map-port"
                      data-network-focus={link.id}
                      key={role}
                      aria-disabled={!ready}
                      aria-pressed={activeLink === link.id}
                      aria-label={`标记 ${device.name} 接入 ${role} 端口 ${link.targetPort}${match ? "，匹配查找" : ""}`}
                      onClick={() => ready && onTrace(link.id)}
                    >
                      {String(link.targetPort).padStart(2, "0")}
                      {match && <small>匹配</small>}
                    </button>
                  ) : (
                    <span key={role} className="network-map-unconfigured">
                      未配置
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          {!current.matching.length && (
            <p role="status">
              本柜没有匹配设备。可切换机柜或
              <button onClick={() => onQuery("")}>清除查找</button>。
            </p>
          )}
        </>
      )}
      <details className="network-map-hint">
        <summary>配置与查找说明</summary>
        {scope === "rack" &&
          current.switches.map((sw) => (
            <p key={sw.device.id}>
              {sw.device.name} · {sw.uplinks} 个 100G 口未配置上联
            </p>
          ))}
        <p>
          两侧为交换机逻辑端口，点击查看连接两端；中间为设备，点击预览安装位置。
          查找可组合机柜、设备、控制器分支和交换机端口，如 B04 控制器 B
          端口09。单个 U 位匹配任一端的实际安装跨度。仅展示柜内已登记的 25G
          接入。连线不表示流向或实际布线；未采集链路状态、协商速率与流量，A/B
          不证明上联独立或冗余保障。
        </p>
      </details>
    </section>
  );
}
