import { useId, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import {
  inletOverview,
  inletOverviewRows,
  type InletOverviewScope,
  type InletOverviewOrder,
  type InletOverviewFilter,
} from "../inlet-overview";
import { temperatureColor } from "../scene/metric-color";
import type { SpatialReading } from "../spatial";

const valueText = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)} °C`;

export function InletOverview({
  readings,
  visible,
  restoreRevision,
  rackId,
  query,
  scope,
  order,
  filter,
  onScope,
  onOrder,
  onFilter,
  selected,
  scroll,
  ready,
  onRack,
  onQuery,
  onPreview,
  onInspect,
  onDetails,
  onAnalyze,
  onAirflow,
  referenceId,
  onReference,
  onCompare,
}: {
  readings: Map<string, SpatialReading>;
  visible: boolean;
  restoreRevision: number;
  rackId: string;
  query: string;
  scope: InletOverviewScope;
  order: InletOverviewOrder;
  filter: InletOverviewFilter;
  onScope: (value: InletOverviewScope) => void;
  onOrder: (value: InletOverviewOrder) => void;
  onFilter: (value: InletOverviewFilter) => void;
  selected: string;
  scroll: RefObject<number>;
  ready: boolean;
  onRack: (id: string) => void;
  onQuery: (value: string) => void;
  onPreview: (id: string) => void;
  onInspect: (id: string, internal: boolean) => void;
  onDetails: () => void;
  onAnalyze: () => void;
  onAirflow: (id: string) => void;
  referenceId: string | null;
  onReference: (id: string | null) => void;
  onCompare: (id: string) => void;
}) {
  const all = useMemo(
    () => inletOverview(readings, query, filter),
    [readings, query, filter],
  );
  const current = all.find((r) => r.rack.id === rackId) ?? all[0];
  const rows = inletOverviewRows(all, rackId, scope, order);
  const device = all.flatMap((r) => r.rows).find((d) => d.id === selected);
  const reference = all
    .flatMap((r) => r.rows)
    .find((d) => d.id === referenceId);
  const rackSummary = useRef<HTMLDetailsElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const pattern = useId().replace(/:/g, "");
  const focusedRevision = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!visible) {
      focusedRevision.current = null;
      return;
    }
    if (!host.current || !ready || focusedRevision.current === restoreRevision)
      return;
    focusedRevision.current = restoreRevision;
    host.current.scrollTop = scroll.current;
    const target =
      host.current.querySelector<HTMLElement>(
        '.inlet-device-list button[aria-pressed="true"]',
      ) ??
      host.current.querySelector<HTMLElement>(
        restoreRevision && selected === current.rack.id
          ? ".inlet-rack-summary summary"
          : '[aria-label="进风对照查找"]',
      );
    target?.focus({ preventScroll: true });
    if (restoreRevision) target?.scrollIntoView({ block: "nearest" });
  }, [visible, ready, scroll, restoreRevision, selected, current.rack.id]);
  const rackGrid = (
    <>
      <div className="inlet-profile-legend">
        <span>20 °C</span>
        <i />
        <span>45 °C</span>
      </div>
      <p className="inlet-overview-note">
        U{current.units} → U1 · 斜线无读数 · 底色未安装
      </p>
      <div className="inlet-rack-grid" role="group" aria-label="进风对照机柜">
        {all.map((item, index) => (
          <button
            key={item.rack.id}
            aria-pressed={item.rack.id === current.rack.id}
            aria-label={`${item.rack.name}，最高 ${valueText(item.maximum)}，有效 ${item.coverage}/${item.rows.length} 台`}
            onClick={() => {
              onRack(item.rack.id);
              if (rackSummary.current) {
                rackSummary.current.open = false;
                rackSummary.current.querySelector("summary")?.focus();
              }
            }}
          >
            <b>{item.rack.name.split(" ")[0]}</b>
            <svg viewBox={`0 0 32 ${item.units + 4}`} aria-hidden="true">
              <defs>
                <pattern
                  id={`${pattern}-${index}`}
                  width="3"
                  height="3"
                  patternUnits="userSpaceOnUse"
                >
                  <path d="M0 3L3 0" stroke="#8196a1" strokeWidth=".6" />
                </pattern>
              </defs>
              <rect x="3" y="2" width="26" height={item.units} fill="#101a20" />
              {item.rows.map((row) => (
                <rect
                  key={row.id}
                  x="3"
                  y={2 + item.units - row.last}
                  width="26"
                  height={row.last - row.first + 0.8}
                  fill={
                    row.value === null
                      ? `url(#${pattern}-${index})`
                      : `#${temperatureColor(row.value).getHexString()}`
                  }
                  stroke={row.id === selected ? "#edffff" : "none"}
                  strokeWidth=".65"
                />
              ))}
            </svg>
            <span>
              {item.maximum === null ? "—" : item.maximum.toFixed(1)}
              <small> °C</small>
            </span>
            <small>
              {item.coverage}/{item.rows.length} 有效
            </small>
          </button>
        ))}
      </div>
    </>
  );
  return (
    <section className="inlet-overview" aria-label="机房进风对照">
      <div
        className="inlet-overview-scroll"
        ref={host}
        onScroll={(e) => {
          if (visible) scroll.current = e.currentTarget.scrollTop;
        }}
      >
        <details className="inlet-rack-summary" ref={rackSummary}>
          <summary>
            机柜切换{" "}
            <small>
              有效 {all.reduce((n, item) => n + item.coverage, 0)}/
              {all.reduce((n, item) => n + item.rows.length, 0)} 台
            </small>
          </summary>
          {rackGrid}
        </details>
        <label className="inlet-search">
          <input
            aria-label="进风对照查找"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="查找设备、柜位或数据状态"
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.stopPropagation();
                onQuery("");
              }
            }}
          />
        </label>
        <details className="overview-list-filters">
          <summary>
            筛选与排序{" "}
            <small>
              {[
                scope === "room" && "全机房",
                filter !== "all" && (filter === "included" ? "有效" : "未计入"),
                order !== "installation" && "进风降序",
              ]
                .filter(Boolean)
                .join(" · ")}
            </small>
          </summary>

          <div className="inlet-overview-options">
            <select
              aria-label="进风对照查找范围"
              value={scope}
              onChange={(e) => onScope(e.target.value as InletOverviewScope)}
            >
              <option value="rack">当前机柜</option>
              <option value="room">整间机房</option>
            </select>
            <select
              aria-label="进风对照排列"
              value={order}
              onChange={(e) => onOrder(e.target.value as InletOverviewOrder)}
            >
              <option value="installation">安装位置</option>
              <option value="temperature">进风从高到低</option>
            </select>
            <select
              aria-label="进风对照数据范围"
              value={filter}
              onChange={(e) => onFilter(e.target.value as InletOverviewFilter)}
            >
              <option value="all">全部设备</option>
              <option value="included">有效进风</option>
              <option value="excluded">无当前进风</option>
            </select>
          </div>
        </details>
        <div className="inlet-list-heading">
          <strong>{scope === "room" ? "整间机房" : current.rack.name}</strong>
          <span>{rows.length} 台匹配</span>
        </div>
        <div className="inlet-device-list">
          {rows.map((row) => (
            <button
              key={row.id}
              aria-pressed={selected === row.id}
              aria-label={`预览 ${row.name} 进风`}
              data-inlet-id={row.id}
              onClick={() => onPreview(row.id)}
            >
              <span
                className="inlet-device-swatch"
                style={
                  row.value === null
                    ? undefined
                    : {
                        background: `#${temperatureColor(row.value).getHexString()}`,
                      }
                }
                data-valid={row.value !== null}
              />
              <span>
                <b>{row.name}</b>
                <small>
                  {scope === "room" ? `${row.rack.split(" ")[0]} · ` : ""}U
                  {row.first}
                  {row.last > row.first ? `–${row.last}` : ""}
                </small>
              </span>
              <span className="inlet-device-reading">
                {row.value === null ? row.reason : valueText(row.value)}
              </span>
            </button>
          ))}
        </div>
        {!rows.length && (
          <p role="status">
            当前范围没有匹配设备。调整范围或
            <button
              onClick={() => {
                onQuery("");
                onFilter("all");
              }}
            >
              清除查找与数据筛选
            </button>
            。
          </p>
        )}
        <details className="inlet-reading-notes">
          <summary>进风读数依据</summary>
          <p>
            整机进风取模拟输入。柜卡按设备安装跨度着色，最高值和覆盖数取整柜有效输入。切片、搜索及排序均保留该范围。按进风排序时，无当前值的设备排在有效值之后。
          </p>
        </details>
      </div>
      {(device || selected === current.rack.id || reference) && (
        <div className="inlet-overview-selection" aria-label="进风对照当前对象">
          {reference && reference.id !== selected && (
            <div className="inlet-reference">
              <span>基准 {reference.name}</span>
              <button
                aria-label="清除进风对照基准"
                onClick={() => onReference(null)}
              >
                ×
              </button>
            </div>
          )}
          {device ? (
            <>
              <strong>
                {device.name} · {device.location}
              </strong>
              <p>
                {valueText(device.value)} · {device.reason}
              </p>
              {device.value === null && <small>{device.detail}</small>}
              {!rows.some((row) => row.id === device.id) && (
                <small>所选设备在当前结果之外</small>
              )}
            </>
          ) : (
            selected === current.rack.id && (
              <strong>
                {current.rack.name} · 最高 {valueText(current.maximum)}
              </strong>
            )
          )}
          {(device || selected === current.rack.id) && (
            <div
              className="inlet-selection-actions"
              key={`${selected}:${restoreRevision}`}
            >
              {device && (
                <button disabled={!ready} onClick={() => onAirflow(device.id)}>
                  机房气流
                </button>
              )}
              {device && reference && device.id !== reference.id ? (
                <button disabled={!ready} onClick={() => onCompare(device.id)}>
                  对照分析
                </button>
              ) : (
                device && (
                  <button
                    aria-pressed={reference?.id === device.id}
                    onClick={() => onReference(reference ? null : device.id)}
                  >
                    {reference ? "取消基准" : "固定为基准"}
                  </button>
                )
              )}
              <details>
                <summary>检视与分析</summary>
                <div>
                  <button
                    disabled={!ready}
                    onClick={() => onInspect(selected, false)}
                  >
                    安装位
                  </button>
                  {device && (
                    <button
                      disabled={!ready}
                      onClick={() => onInspect(device.id, true)}
                    >
                      查看内部
                    </button>
                  )}
                  <button disabled={!ready} onClick={onDetails}>
                    对象详情
                  </button>
                  <button disabled={!ready} onClick={onAnalyze}>
                    单对象分析
                  </button>
                  {device && reference && device.id !== reference.id && (
                    <button onClick={() => onReference(device.id)}>
                      替换基准
                    </button>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
