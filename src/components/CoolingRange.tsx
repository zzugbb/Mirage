import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  coolingRangeRows,
  type CoolingRangeState,
  type CoolingRangeAction,
  type CoolingRangeFilter,
} from "../cooling-range";
import { unitLabel } from "../catalog";
import { lifecycleNames, qualityNames } from "../status";
import type { SpatialReading } from "../spatial";

export function CoolingRange({
  value,
  readings,
  ready,
  open,
  scroll,
  onChange,
  onVisit,
}: {
  value: CoolingRangeState;
  readings: Map<string, SpatialReading>;
  ready: boolean;
  open: boolean;
  scroll: RefObject<{ list: number; panel: number; restore: boolean }>;
  onChange: (value: CoolingRangeState) => void;
  onVisit: (id: string, rackId: string, action: CoolingRangeAction) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const rows = coolingRangeRows(readings, value.query, value.filter);
  useLayoutEffect(() => {
    if (!open || !ready || !host.current || !scroll.current.restore) return;
    host.current.scrollTop = scroll.current.list;
    const panel = host.current.closest<HTMLElement>(".study-inspector");
    if (panel) panel.scrollTop = scroll.current.panel;
    host.current
      .querySelector<HTMLButtonElement>("[aria-expanded='true']")
      ?.focus({ preventScroll: true });
    scroll.current.restore = false;
  }, [open, ready, scroll]);
  const visit = (
    id: string,
    rackId: string,
    action: CoolingRangeAction = "preview",
  ) => {
    if (host.current)
      scroll.current = {
        restore: false,
        list: host.current.scrollTop,
        panel:
          host.current.closest<HTMLElement>(".study-inspector")?.scrollTop ?? 0,
      };
    onVisit(id, rackId, action);
  };
  const filtered = !!value.query.trim() || value.filter !== "all";
  const matching = rows.reduce((n, row) => n + row.matching.length, 0);
  return (
    <section className="cooling-range-browser" aria-label="制冷服务范围核对">
      <label>
        查找机柜或设备
        <input
          aria-label="服务范围查找"
          value={value.query}
          placeholder="机柜、设备编号或机型"
          onChange={(e) => {
            if (host.current) host.current.scrollTop = 0;
            onChange({ ...value, query: e.target.value });
          }}
        />
      </label>
      <label>
        查看对象
        <select
          aria-label="服务范围筛选"
          value={value.filter}
          onChange={(e) => {
            if (host.current) host.current.scrollTop = 0;
            onChange({
              ...value,
              filter: e.target.value as CoolingRangeFilter,
            });
          }}
        >
          <option value="all">全部关联设备</option>
          <option value="unavailable">无当前进风</option>
          <option value="alarm">当前设备告警</option>
        </select>
      </label>
      {filtered && (
        <p className="cooling-range-count" role="status">
          匹配 {matching} 台设备
        </p>
      )}
      <div className="cooling-range-groups" ref={host}>
        {rows.map(({ rack, summary, matching }) => (
          <section key={rack.id} className="cooling-range-group">
            <button
              className="cooling-range-toggle"
              aria-expanded={value.rackId === rack.id}
              aria-controls={`cooling-range-${rack.id}`}
              onClick={() =>
                onChange({
                  ...value,
                  rackId: value.rackId === rack.id ? null : rack.id,
                })
              }
            >
              <strong>
                {rack.name}{" "}
                <span>
                  {filtered
                    ? `${matching.length}/${summary.count}`
                    : summary.count}{" "}
                  台 {value.rackId === rack.id ? "−" : "+"}
                </span>
              </strong>
              <small>
                最高进风{" "}
                {summary.maximum === null
                  ? "—"
                  : `${summary.maximum.toFixed(1)} °C`}{" "}
                · 有效 {summary.coverage}/{summary.count} ·{" "}
                {summary.alarmIds.length
                  ? `${summary.alarmIds.length} 台告警`
                  : "无设备告警"}
              </small>
            </button>
            {value.rackId === rack.id && (
              <div id={`cooling-range-${rack.id}`}>
                <div className="cooling-range-actions">
                  <button
                    disabled={!ready}
                    onClick={() => visit(rack.id, rack.id, "enter")}
                  >
                    进入机柜 ↗
                  </button>
                  <button onClick={() => visit(rack.id, rack.id)}>预览</button>
                  <button
                    disabled={!ready}
                    onClick={() => visit(rack.id, rack.id, "airflow")}
                  >
                    本柜气流 ↗
                  </button>
                </div>
                {matching.map((device) => {
                  const r = readings.get(device.id);
                  const valid =
                    r?.quality === "valid" &&
                    r.temperature !== null &&
                    Number.isFinite(r.temperature);
                  return (
                    <div className="cooling-range-device" key={device.id}>
                      <button
                        onClick={() => visit(device.id, rack.id)}
                        aria-label={`预览 ${device.name}服务范围设备`}
                      >
                        <strong>
                          {device.name} <small>{unitLabel(device.id)}</small>
                        </strong>
                        <span>
                          {valid
                            ? `${r.temperature!.toFixed(1)} °C`
                            : r?.quality === "valid"
                              ? "无有效进风"
                              : qualityNames[r?.quality ?? "missing"]}
                          {r ? ` · ${lifecycleNames[r.lifecycle]}` : ""}
                          {r?.alarm ? " · 告警" : ""}
                        </span>
                      </button>
                      <button
                        disabled={!ready}
                        aria-label={`查看 ${device.name}气流`}
                        onClick={() => visit(device.id, rack.id, "airflow")}
                      >
                        气流 ↗
                      </button>
                    </div>
                  );
                })}
                {!matching.length && <p>本柜没有匹配设备。</p>}
              </div>
            )}
          </section>
        ))}
      </div>
      {!matching && (
        <p>
          <button
            onClick={() => onChange({ ...value, query: "", filter: "all" })}
          >
            清除查找与筛选
          </button>
        </p>
      )}
    </section>
  );
}
