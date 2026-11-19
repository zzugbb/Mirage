import { useRef } from "react";
import { NetworkBranchPicker } from "./NetworkTrace";
import {
  switchPortRows,
  switchPortNeighbor,
  type SwitchPortCheck,
} from "../switch-ports";
import { deviceById, rackForDevice } from "../installation";
import { unitLabel } from "../catalog";
import { sourcePorts } from "../network";

export function SwitchPorts({
  showCard,
  showEndMark,
  onBranch,
  onEndMark,
  check,
  ready,
  traced,
  onChange,
  onSelect,
  onPreview,
  onLocate,
  onInspect,
}: {
  showCard: boolean;
  showEndMark: boolean;
  onBranch: (linkId: string) => void;
  onEndMark: () => void;
  check: SwitchPortCheck;
  ready: boolean;
  traced: boolean;
  onChange: (check: SwitchPortCheck) => void;
  onSelect: (port: number) => void;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  onInspect: (id: string, linkId: string) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const rows = switchPortRows(check.switchId, check.query);
  const chosen = rows.find((row) => row.port === check.port);
  return (
    <section
      className="switch-ports"
      ref={root}
      aria-label="交换机逻辑端口总览"
      tabIndex={-1}
    >
      <label>
        <span>
          查找端口或对端
          {check.query && (
            <small>{rows.filter((row) => row.matches).length} 个匹配</small>
          )}
        </span>
        <input
          aria-label="端口总览查找"
          placeholder="01、SRV-01、100G、未配置"
          value={check.query}
          onChange={(event) =>
            onChange({ ...check, query: event.target.value })
          }
          onKeyDown={(event) => {
            if (event.key === "Escape" && check.query) {
              event.stopPropagation();
              onChange({ ...check, query: "" });
            }
          }}
        />
      </label>
      {[25, 100].map((speed) => (
        <div key={speed} className="switch-port-group">
          <h4>{speed}G 逻辑端口</h4>
          <div
            className={`switch-port-grid speed-${speed}`}
            role="group"
            aria-label={`${speed}G逻辑端口`}
            onKeyDown={(event) => {
              const value = Number((event.target as HTMLElement).dataset.port);
              if (
                !value ||
                ![
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "Home",
                  "End",
                ].includes(event.key)
              )
                return;
              event.preventDefault();
              root.current
                ?.querySelector<HTMLButtonElement>(
                  `[data-port="${switchPortNeighbor(value, event.key)}"]`,
                )
                ?.focus();
            }}
          >
            {rows
              .filter((row) => row.speedGbps === speed)
              .map((row) => (
                <button
                  key={row.port}
                  data-port={row.port}
                  data-match={row.matches}
                  data-configured={!!row.link}
                  aria-pressed={check.port === row.port}
                  aria-label={`端口 ${String(row.port).padStart(2, "0")}，${row.peer ? "已配置至 " + row.peer.name : "未配置连接"}`}
                  title={row.peer?.name ?? "未配置连接"}
                  onClick={() => onSelect(row.port)}
                >
                  {String(row.port).padStart(2, "0")}
                </button>
              ))}
          </div>
        </div>
      ))}
      <small>实框已配置 · 虚框未配置</small>
      {chosen && showCard ? (
        <div className="switch-port-selected" aria-label="所选逻辑端口">
          <strong>
            {deviceById(check.switchId)!.name} · 端口{" "}
            {String(chosen.port).padStart(2, "0")}
          </strong>
          {chosen.peer && chosen.link ? (
            <>
              <button
                className="switch-port-peer"
                onClick={() => onPreview(chosen.peer!.id)}
              >
                <b>{chosen.peer.name} ↗</b>
                <small>
                  {rackForDevice(chosen.peer.id).name} /{" "}
                  {unitLabel(chosen.peer.id)} ·{" "}
                  {
                    sourcePorts(chosen.peer.id).find(
                      (port) => port.port === chosen.link!.sourcePort,
                    )!.name
                  }
                </small>
              </button>
              {!traced && (
                <button disabled={!ready} onClick={() => onSelect(chosen.port)}>
                  标记两端
                </button>
              )}
              <div className="switch-port-actions">
                <button
                  disabled={!ready}
                  onClick={() => onLocate(chosen.peer!.id)}
                >
                  对端安装位
                </button>
                <button
                  disabled={!ready}
                  onClick={() => onInspect(chosen.peer!.id, chosen.link!.id)}
                >
                  对端部件
                </button>
              </div>
              <details className="switch-local-actions">
                <summary>本端与接入分支</summary>
                {traced && (
                  <NetworkBranchPicker
                    link={chosen.link}
                    ready={ready}
                    onTrace={onBranch}
                  />
                )}
                <div className="switch-port-actions">
                  <button
                    disabled={!ready}
                    onClick={() => onLocate(check.switchId)}
                  >
                    本端安装位
                  </button>
                  <button
                    disabled={!ready}
                    onClick={() => onInspect(check.switchId, chosen.link!.id)}
                  >
                    本端部件
                  </button>
                  {traced && showEndMark && (
                    <button onClick={onEndMark}>结束标记</button>
                  )}
                </div>
              </details>
            </>
          ) : (
            <p>无配置对端，物理占用未知。</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
