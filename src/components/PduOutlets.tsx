import { useLayoutEffect, useRef } from "react";
import { pduOutlets, pduOutlet, type PduInspection } from "../pdu-outlets";
import { pduName, inletPart } from "../power-config";
import { unitLabel } from "../catalog";
import { entityById } from "../domain";
import { qualityNames } from "../status";
import type { SpatialReading } from "../spatial";

export function PduOutlets({
  pduId,
  visit,
  readings,
  ready,
  inScene,
  onChange,
  onSelect,
  onLocate,
  onPreview,
  onInspect,
}: {
  pduId: string;
  visit: PduInspection | null;
  readings: Map<string, SpatialReading>;
  ready: boolean;
  inScene: boolean;
  onChange: (visit: PduInspection) => void;
  onSelect: (outlet: number) => void;
  onLocate: () => void;
  onPreview: (id: string) => void;
  onInspect: (linkId: string) => void;
}) {
  const current =
    visit?.pduId === pduId
      ? visit
      : { pduId, outlet: null, query: "", scroll: 0 };
  const list = useRef<HTMLDivElement>(null),
    previousQuery = useRef(current.query);
  useLayoutEffect(() => {
    if (list.current) list.current.scrollTop = current.scroll;
  }, [pduId]);
  useLayoutEffect(() => {
    if (previousQuery.current === current.query) return;
    previousQuery.current = current.query;
    if (current.query.trim())
      list.current
        ?.querySelector<HTMLElement>('[data-match="true"]')
        ?.scrollIntoView({ block: "nearest" });
  }, [current.query]);
  const rows = pduOutlets(pduId, current.query),
    chosen = pduOutlet(pduId, current.outlet);
  const reading = chosen?.device ? readings.get(chosen.device.id) : null;
  const value =
    reading?.quality === "valid" &&
    reading.power !== null &&
    Number.isFinite(reading.power)
      ? `${reading.power.toFixed(1)} W`
      : null;
  return (
    <section
      className="pdu-outlets"
      aria-label={`${pduName(pduId)}插座核对`}
      tabIndex={-1}
    >
      <header>
        <strong>插座逐位核对</strong>
        <small>24 高位 → 01 低位</small>
      </header>
      <label className="pdu-outlet-search">
        查找插座或对端
        <input
          aria-label="查找 PDU 插座或对端"
          placeholder="编号、设备或 U 位"
          value={current.query}
          onChange={(event) =>
            onChange({ ...current, query: event.target.value })
          }
        />
      </label>
      <small className="pdu-outlet-matches">
        {current.query
          ? `${rows.filter((row) => row.matches).length} 个匹配 · 全部位置保留`
          : `${rows.filter((row) => row.link).length} 已接 / 24 配置位置`}
      </small>
      <div
        className="pdu-outlet-map"
        ref={list}
        role="group"
        aria-label="PDU 插座位置"
        onScroll={(event) =>
          onChange({ ...current, scroll: event.currentTarget.scrollTop })
        }
      >
        {rows.map((row) => (
          <button
            key={row.outlet}
            data-match={row.matches}
            data-connected={!!row.link}
            aria-pressed={row.outlet === current.outlet}
            aria-label={`核对插座 ${String(row.outlet).padStart(2, "0")} ${row.device?.name ?? "未连接"}`}
            onClick={() => onSelect(row.outlet)}
          >
            <b>{String(row.outlet).padStart(2, "0")}</b>
            <span>{row.device?.name ?? "未连接"}</span>
            <small>{row.link ? `输入 ${row.link.inlet}` : "—"}</small>
          </button>
        ))}
      </div>
      {!inScene && (
        <p>所选 PDU 不在当前结构内；定位到机柜后侧可查看插座标记。</p>
      )}
      {chosen ? (
        <div className="pdu-outlet-selected" aria-label="当前插座核对">
          <button
            className="pdu-outlet-clear"
            onClick={() => onChange({ ...current, outlet: null })}
          >
            清除标记
          </button>
          <strong>
            {pduName(pduId)} · 插座 {String(chosen.outlet).padStart(2, "0")}
          </strong>
          {chosen.link && chosen.device ? (
            <>
              <span>
                {chosen.device.name} · {unitLabel(chosen.device.id)}
              </span>
              <small>
                输入 {chosen.link.inlet} /{" "}
                {
                  entityById(
                    inletPart(chosen.device.modelId, chosen.link.inlet),
                  )!.name
                }
              </small>
              <span>
                关联整机输入：
                {value ??
                  (reading?.quality === "valid"
                    ? "无有效功耗"
                    : qualityNames[reading?.quality ?? "missing"])}
              </span>
              <small>不是本插座负载；A/B 关联值不能相加。</small>
              <div className="pdu-outlet-actions">
                <button onClick={() => onPreview(chosen.device!.id)}>
                  预览对端
                </button>
                <button
                  disabled={!ready}
                  onClick={() => onInspect(chosen.link!.id)}
                >
                  查看电源 {chosen.link.inlet}
                </button>
              </div>
            </>
          ) : (
            <>
              <span>未连接 · 没有配置对端</span>
              <small>不表示可用容量、断电、故障或零功耗。</small>
            </>
          )}
          <button disabled={!ready} onClick={onLocate}>
            定位所选插座 ↗
          </button>
        </div>
      ) : (
        <p>选择一个位置，在三维中核对配置插座；已接位置沿用既有供电支路。</p>
      )}
      <small className="power-boundary">
        位置与编号对应本场景 PDU 配置，不代表真实插座类型或现场接线。
      </small>
    </section>
  );
}
