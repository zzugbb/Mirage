import { useRef, useEffect } from "react";
import {
  switchPortRows,
  switchPortNeighbor,
  type SwitchPortCheck,
} from "../switch-ports";
import { deviceById, rackForDevice } from "../installation";
import { unitLabel } from "../catalog";
import { sourcePorts, switchRole } from "../network";

export function SwitchPorts({
  restoreRevision,
  check,
  ready,
  traced,
  onChange,
  onSelect,
  onPreview,
  onLocate,
  onInspect,
}: {
  restoreRevision: number;
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
  useEffect(() => {
    if (!restoreRevision) return;
    const frame = requestAnimationFrame(() => {
      const button = root.current?.querySelector<HTMLButtonElement>(
        `[data-port="${check.port}"]`,
      );
      button?.focus({ preventScroll: true });
      button?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [restoreRevision]);
  const rows = switchPortRows(check.switchId, check.query);
  const chosen = rows.find((row) => row.port === check.port);
  return (
    <section
      className="switch-ports"
      ref={root}
      aria-label="交换机逻辑端口总览"
      tabIndex={-1}
    >
      <header>
        <strong>
          {deviceById(check.switchId)!.name} · 接入 {switchRole(check.switchId)}
        </strong>
        <small>
          {rows.filter((row) => row.link).length} / {rows.length} 已配置
        </small>
      </header>
      <label>
        查找端口或对端
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
      <p>{rows.filter((row) => row.matches).length} 个匹配 · 全部编号保留</p>
      {[25, 100].map((speed) => (
        <div key={speed} className="switch-port-group">
          <h4>
            {speed}G 逻辑端口{speed === 100 ? " · 未配置上联" : ""}
          </h4>
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
      <small>实框已配置 · 虚框未配置 · 按逻辑口编号排列</small>
      {chosen ? (
        <div className="switch-port-selected" aria-label="所选逻辑端口">
          <strong>
            {deviceById(check.switchId)!.name} · 端口{" "}
            {String(chosen.port).padStart(2, "0")}
          </strong>
          <p>
            {chosen.speedGbps} Gb/s 配置 ·{" "}
            {chosen.link ? "已配置接入" : "未配置连接"}
          </p>
          {chosen.peer && chosen.link ? (
            <>
              <button
                className="switch-port-peer"
                onClick={() => onPreview(chosen.peer!.id)}
              >
                <b>{chosen.peer.name} ↗</b>
                <small>
                  {rackForDevice(chosen.peer.id).name} /{" "}
                  {unitLabel(chosen.peer.id)}
                </small>
                <small>
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
                  onClick={() => onInspect(check.switchId, chosen.link!.id)}
                >
                  本端部件
                </button>
                <button
                  disabled={!ready}
                  onClick={() => onInspect(chosen.peer!.id, chosen.link!.id)}
                >
                  对端部件
                </button>
              </div>
            </>
          ) : (
            <p>无配置对端，物理占用未知。</p>
          )}
        </div>
      ) : (
        <p>选择已配置编号标记两端。方向键在同组移动，Enter 选择。</p>
      )}
    </section>
  );
}
