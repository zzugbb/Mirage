import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { networkOverview } from "../network-overview";
import { switchRole } from "../network";
import { unitLabel } from "../catalog";

export function NetworkOverview({
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
}: {
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
}) {
  const all = useMemo(() => networkOverview(query), [query]);
  const current = all.find((item) => item.rack.id === rackId) ?? all[0];
  const host = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (host.current) host.current.scrollTop = scroll.current;
  }, [rackId, scroll]);
  return (
    <section
      ref={host}
      className="network-overview"
      aria-label="机房网络接入图"
      onScroll={(e) => {
        scroll.current = e.currentTarget.scrollTop;
      }}
    >
      <header>
        <strong>机房网络接入图</strong>
        <p>
          {all.length} 柜 · {all.reduce((n, r) => n + r.switches.length, 0)}{" "}
          台交换机 · {all.reduce((n, r) => n + r.links.length, 0)} 条配置接入
        </p>
      </header>
      <label className="network-map-search">
        查找设备或对端
        <input
          aria-label="接入图查找设备或对端"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="SRV、STO 或交换机编号"
        />
      </label>
      <div className="network-rack-grid" role="group" aria-label="接入图机柜">
        {all.map((item) => (
          <button
            key={item.rack.id}
            aria-pressed={item.rack.id === current.rack.id}
            onClick={() => onRack(item.rack.id)}
          >
            <b>{item.rack.name.split(" ")[0]}</b>
            <small>
              {item.matching.length}/{item.sources.length} 台
            </small>
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
            aria-pressed={selected === sw.device.id}
            onClick={() => onPreview(sw.device.id)}
          >
            <b>
              接入 {sw.role} · {sw.device.name}
            </b>
            <small>
              {unitLabel(sw.device.id)} · {sw.configured}/{sw.ports} 口已配置
            </small>
            <small>{sw.uplinks} 个 100G 口未配置上联</small>
          </button>
        ))}
      </div>
      <p className="network-map-hint">
        左右为 A/B
        交换机逻辑口。点端口标记两端，点设备仅预览；安装位与部件在详情中继续。
      </p>
      <div className="network-map-columns" aria-hidden="true">
        <span>A 端口</span>
        <span>设备 / U 位</span>
        <span>B 端口</span>
      </div>
      <div className="network-map-nodes">
        {current.matching.map(({ device, connections }) => (
          <div className="network-map-node" key={device.id}>
            {(["A", "device", "B"] as const).map((role) => {
              if (role === "device")
                return (
                  <button
                    className="network-map-device"
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
              return link ? (
                <button
                  className="network-map-port"
                  key={role}
                  disabled={!ready}
                  aria-pressed={activeLink === link.id}
                  aria-label={`标记 ${device.name} 接入 ${role} 端口 ${link.targetPort}`}
                  onClick={() => onTrace(link.id)}
                >
                  {String(link.targetPort).padStart(2, "0")}
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
      <p className="network-map-hint">
        仅展示柜内已登记的 25G
        接入。连线不表示流向或实际布线；未采集链路状态、协商速率与流量，A/B
        不证明上联独立或冗余保障。
      </p>
    </section>
  );
}
