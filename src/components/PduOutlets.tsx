import { useLayoutEffect, useRef } from "react";
import { pduOutlets, pduOutlet, type PduInspection } from "../pdu-outlets";
import { pduName, inletPart } from "../power-config";
import { unitLabel } from "../catalog";
import { entityById } from "../domain";
import { FeederDeviceHistory } from "./FeederDeviceHistory";
import type { SpatialReading } from "../spatial";

export function PduOutlets({
  pduId,
  visit,
  readings,
  ready,
  inScene,
  onChange,
  onSelect,
  onPreview,
  onInspect,
  onAnalyzeDevice,
}: {
  pduId: string;
  visit: PduInspection | null;
  readings: Map<string, SpatialReading>;
  ready: boolean;
  inScene: boolean;
  onChange: (visit: PduInspection) => void;
  onSelect: (outlet: number) => void;
  onPreview: (id: string) => void;
  onInspect: (linkId: string) => void;
  onAnalyzeDevice: (id: string) => void;
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
      {current.query && (
        <small className="pdu-outlet-matches">
          {rows.filter((row) => row.matches).length} 个匹配 · 保留全部位置
        </small>
      )}
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
          <header>
            <strong>
              插座 {String(chosen.outlet).padStart(2, "0")} ·{" "}
              {chosen.device?.name ?? "未连接"}
            </strong>
            <button
              className="pdu-outlet-clear"
              onClick={() => onChange({ ...current, outlet: null })}
            >
              清除标记
            </button>
          </header>
          {chosen.link && chosen.device && (
            <>
              <small>
                {unitLabel(chosen.device.id)} · 输入 {chosen.link.inlet} /{" "}
                {
                  entityById(
                    inletPart(chosen.device.modelId, chosen.link.inlet),
                  )!.name
                }
              </small>
              <FeederDeviceHistory
                deviceId={chosen.device.id}
                readings={readings}
                ready={ready}
                onAnalyze={onAnalyzeDevice}
              />
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
          )}
        </div>
      ) : (
        <p>选择插座以核对配置对端。</p>
      )}
      <details className="pdu-outlet-boundary">
        <summary>插座编号与计量口径</summary>
        <p>
          编号和接线沿用演示配置。插座未计量，关联整机输入不按 A/B
          分摊或相加。未连接仅表示没有配置对端，不能据此判断容量或通电状态。A/B
          上游独立性未定义。
        </p>
      </details>
    </section>
  );
}
