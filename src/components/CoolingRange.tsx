import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  coolingRangeRows,
  type CoolingRangeState,
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
  onPreview,
  onAirflow,
}: {
  value: CoolingRangeState;
  readings: Map<string, SpatialReading>;
  ready: boolean;
  open: boolean;
  scroll: RefObject<{ list: number; panel: number; restore: boolean }>;
  onChange: (value: CoolingRangeState) => void;
  onPreview: (id: string, rackId: string) => void;
  onAirflow: (id: string, rackId: string) => void;
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
  const visit = (id: string, rackId: string, airflow = false) => {
    if (host.current)
      scroll.current = {
        restore: true,
        list: host.current.scrollTop,
        panel:
          host.current.closest<HTMLElement>(".study-inspector")?.scrollTop ?? 0,
      };
    (airflow ? onAirflow : onPreview)(id, rackId);
  };
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
            scroll.current.list = 0;
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
            scroll.current.list = 0;
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
      <p className="cooling-range-count" role="status">
        匹配 {matching} / {rows.reduce((n, row) => n + row.summary.count, 0)} 台
        · 筛选不改变配置范围
      </p>
      <div
        className="cooling-range-groups"
        ref={host}
        onScroll={(e) => {
          scroll.current.list = e.currentTarget.scrollTop;
        }}
      >
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
                  {matching.length}/{summary.count} 台{" "}
                  {value.rackId === rack.id ? "−" : "+"}
                </span>
              </strong>
              <small>
                最高{" "}
                {summary.maximum === null
                  ? "—"
                  : `${summary.maximum.toFixed(1)} °C`}{" "}
                · 有效 {summary.coverage}/{summary.count} ·{" "}
                {summary.alarmIds.length} 台告警
              </small>
            </button>
            {value.rackId === rack.id && (
              <div id={`cooling-range-${rack.id}`}>
                <div className="cooling-range-actions">
                  <button onClick={() => visit(rack.id, rack.id)}>
                    预览机柜
                  </button>
                  <button
                    disabled={!ready}
                    onClick={() => visit(rack.id, rack.id, true)}
                  >
                    查看本柜气流 ↗
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
                              ? r.lifecycle === "stopped"
                                ? "停机 · 无进风值"
                                : "无有效进风"
                              : qualityNames[r?.quality ?? "missing"]}
                          {r?.alarm ? " · 告警" : ""}
                        </span>
                        <small>
                          {r ? lifecycleNames[r.lifecycle] : "未定义"} ·
                          整机进风
                        </small>
                      </button>
                      <button
                        disabled={!ready}
                        aria-label={`查看 ${device.name}气流`}
                        onClick={() => visit(device.id, rack.id, true)}
                      >
                        气流 ↗
                      </button>
                    </div>
                  );
                })}
                {!matching.length && (
                  <p>本柜没有匹配设备，配置与汇总仍保留。</p>
                )}
              </div>
            )}
          </section>
        ))}
      </div>
      {!matching && (
        <p>
          没有匹配设备。
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
