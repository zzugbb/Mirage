import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  powerOverview,
  powerOverviewRows,
  type PowerOverviewScope,
  type PowerOverviewOrder,
  type PowerOverviewFilter,
} from "../power-overview";
import { powerColor } from "../scene/metric-color";
import { budgetPercent, budgetRatio, budgetStateText } from "../power-budget";
import { budgetAttentionStyle } from "../status";
import { sourceValue } from "../reading-sources";
import type { SpatialReading } from "../spatial";
import { clearSearchOnEscape } from "../search-keyboard";
import { useResultFocusFallback } from "../use-result-focus-fallback";
import { FocusedResultList } from "./FocusedResultList";

export function PowerOverview({
  readings,
  query,
  filter,
  rackId,
  scope,
  order,
  onScope,
  onOrder,
  selected,
  visible,
  ready,
  scroll,
  restoreRevision,
  onQuery,
  onFilter,
  onRack,
  onPreview,
  onInspect,
  onDetails,
  onAnalyze,
}: {
  readings: Map<string, SpatialReading>;
  query: string;
  filter: PowerOverviewFilter;
  rackId: string;
  scope: PowerOverviewScope;
  order: PowerOverviewOrder;
  onScope: (scope: PowerOverviewScope) => void;
  onOrder: (order: PowerOverviewOrder) => void;
  selected: string;
  visible: boolean;
  ready: boolean;
  scroll: RefObject<number>;
  restoreRevision: number;
  onQuery: (value: string) => void;
  onFilter: (value: PowerOverviewFilter) => void;
  onRack: (id: string) => void;
  onPreview: (id: string) => void;
  onInspect: (id: string, internal: boolean) => void;
  onDetails: (id: string) => void;
  onAnalyze: (id: string) => void;
}) {
  const all = powerOverview(readings, query, filter);
  const current = all.find((item) => item.rack.id === rackId) ?? all[0];
  const device = all
    .flatMap((item) => item.rows)
    .find((row) => row.id === selected);
  const rows = powerOverviewRows(all, rackId, scope, order);
  const rackSelected = selected === current.rack.id;
  const host = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const ratioText = (ratio: number | null) =>
    ratio === null ? "—" : budgetPercent(ratio, 1);
  useLayoutEffect(() => {
    if (!visible || !host.current) return;
    host.current.scrollTop = scroll.current;
    if (!restoreRevision) return;
    const button =
      host.current.querySelector<HTMLButtonElement>(
        `[data-power-id="${selected}"]`,
      ) ??
      host.current.querySelector<HTMLButtonElement>(
        `[data-power-id="${current.rack.id}"]`,
      );
    const disclosure = button?.closest("details");
    if (disclosure) disclosure.open = true;
    button?.focus({ preventScroll: true });
    button?.scrollIntoView({ block: "nearest" });
  }, [visible, restoreRevision, scroll]);
  const watchResult = useResultFocusFallback(search);
  const rackGrid = (
    <div className="power-rack-grid" role="group" aria-label="功耗对照机柜">
      {all.map((item) => (
        <button
          key={item.rack.id}
          data-power-id={item.rack.id}
          aria-pressed={item.rack.id === current.rack.id}
          title={`${item.rack.name} · ${sourceValue(item.value, "power")}`}
          onClick={() => onRack(item.rack.id)}
        >
          <b>{item.rack.name.split(" ")[0]}</b>
          <strong>
            {item.value === null ? "—" : `${(item.value / 1000).toFixed(2)} kW`}
          </strong>
          <span
            className="power-overview-meter"
            data-known={item.budget!.ratio !== null}
          >
            <i
              style={{
                backgroundColor:
                  item.budget!.ratio === null
                    ? undefined
                    : `#${powerColor(item.budget!.ratio, undefined, readings.get(item.rack.id)?.budgetState).getHexString()}`,
                width: `${Math.min(100, (item.budget!.ratio ?? 0) * 100)}%`,
              }}
            />
          </span>
          <small>{ratioText(item.budget!.ratio)}</small>
          <small>
            {item.coverage}/{item.count} 有效
          </small>
          {(query || filter !== "all") && (
            <small>{item.matching.length} 台匹配</small>
          )}
        </button>
      ))}
    </div>
  );
  return (
    <section className="power-overview" aria-label="机房功耗对照">
      <div
        className="power-overview-scroll"
        ref={host}
        onScroll={(event) => {
          if (visible) scroll.current = event.currentTarget.scrollTop;
        }}
      >
        <details className="power-rack-summary">
          <summary>
            机柜切换{" "}
            <small>
              有效 {all.reduce((n, item) => n + item.coverage, 0)}/
              {all.reduce((n, item) => n + item.count, 0)} 台
            </small>
          </summary>
          {rackGrid}
        </details>
        <label>
          <input
            ref={search}
            aria-label="功耗对照查找"
            placeholder="查找设备、柜位或数据状态"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={(event) => clearSearchOnEscape(event, () => onQuery(""))}
          />
        </label>
        <details className="overview-list-filters">
          <summary>
            筛选与排序{" "}
            <small>
              {[
                scope === "room" && "全机房",
                filter !== "all" &&
                  (filter === "included"
                    ? "有效"
                    : filter === "zero"
                      ? "有效零值"
                      : "未计入"),
                order !== "installation" &&
                  (order === "budget" ? "预算降序" : "功耗降序"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </small>
          </summary>

          <select
            aria-label="功耗对照数据范围"
            value={filter}
            onChange={(event) =>
              onFilter(event.target.value as PowerOverviewFilter)
            }
          >
            <option value="all">全部设备</option>
            <option value="included">有效输入</option>
            <option value="excluded">未计入输入</option>
            <option value="zero">有效零值</option>
          </select>
          <div className="power-overview-options">
            <select
              aria-label="功耗对照查找范围"
              value={scope}
              onChange={(event) =>
                onScope(event.target.value as PowerOverviewScope)
              }
            >
              <option value="rack">当前机柜</option>
              <option value="room">整间机房</option>
            </select>
            <select
              aria-label="功耗对照排列"
              value={order}
              onChange={(event) =>
                onOrder(event.target.value as PowerOverviewOrder)
              }
            >
              <option value="installation">安装位置</option>
              <option value="power">功耗从高到低</option>
              <option value="budget">预算占比从高到低</option>
            </select>
          </div>
        </details>
        <div className="power-overview-heading">
          <strong>{scope === "room" ? "整间机房" : current.rack.name}</strong>
          <small>{rows.length} 台匹配</small>
        </div>
        <FocusedResultList className="power-overview-devices">
          {rows.map((row) => {
            const ratio = budgetRatio(row.value, row.budget);
            const reading = readings.get(row.id);
            const attention = budgetAttentionStyle(reading);
            const percent = attention
              ? `${attention.icon} ${ratioText(ratio)}`
              : ratioText(ratio);
            return (
              <button
                key={row.id}
                ref={watchResult}
                data-power-id={row.id}
                title={budgetStateText(reading?.budgetState, ratio)}
                aria-pressed={selected === row.id}
                onClick={() => onPreview(row.id)}
              >
                <span>
                  <b>{row.name}</b>
                  <strong
                    style={{
                      color: order === "budget" ? attention?.color : undefined,
                    }}
                  >
                    {order === "budget"
                      ? percent
                      : sourceValue(row.value, "power")}
                  </strong>
                </span>
                <small>
                  {scope === "room"
                    ? row.location
                    : row.location.split(" / ")[1]}{" "}
                  {row.reason !== "有效输入" && ` · ${row.reason}`}
                </small>
                {ratio !== null && (
                  <span
                    className="power-row-load"
                    style={{
                      color: order !== "budget" ? attention?.color : undefined,
                    }}
                  >
                    <i aria-hidden="true">
                      <i
                        style={{
                          width: `${Math.min(100, ratio * 100)}%`,
                          backgroundColor:
                            "#" +
                            powerColor(
                              ratio,
                              undefined,
                              reading?.budgetState,
                            ).getHexString(),
                        }}
                      />
                    </i>
                    {order === "budget"
                      ? sourceValue(row.value, "power")
                      : percent}
                  </span>
                )}
              </button>
            );
          })}
        </FocusedResultList>
        {!rows.length && (
          <p role="status">
            当前范围没有匹配设备；可调整范围或
            <button
              ref={watchResult}
              onClick={() => {
                search.current?.focus();
                onQuery("");
                onFilter("all");
              }}
            >
              清除对照筛选
            </button>
            。
          </p>
        )}
        <details>
          <summary>计量与预算边界</summary>
          <p>
            柜卡条形表示有效设备功耗占配置预算的比例，斜线表示无法计算。按功耗或占比排列时，未知值置后，顺序随共享时间更新。
          </p>
          <p>
            有效功耗按整机去重相加，A/B
            输入不分摊也不重复计入。缺失、过期和离线不补零，停机有效零值仍计入预算。不同预算的相同百分比不代表相同功耗；精确值以
            W
            核对。图条显示至100%，超出时保留实际百分比；预算不是额定容量、设施计量或可分配余量。筛选不改变柜卡和三维标尺的汇总范围。
          </p>
        </details>
      </div>
      {(device || rackSelected) && (
        <div className="power-overview-selection" aria-label="功耗对照当前对象">
          <strong>
            {device ? `${device.name} · ${device.location}` : current.rack.name}
          </strong>
          <p>
            {sourceValue(device ? device.value : current.value, "power")} ·{" "}
            {device
              ? device.reason
              : `有效 ${current.coverage}/${current.count} 台`}
          </p>
          {device && (
            <small>
              配置预算 {sourceValue(device.budget, "power")} · 占比{" "}
              {ratioText(budgetRatio(device.value, device.budget))}
              {device.reason !== "有效输入" && ` · ${device.detail}`}
            </small>
          )}
          {device && !rows.some((row) => row.id === device.id) && (
            <small>所选设备在当前结果之外</small>
          )}
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
                onClick={() => onInspect(selected, true)}
              >
                查看内部
              </button>
            )}
            <button
              className="study-open-current-details"
              disabled={!ready}
              onClick={() => onDetails(selected)}
            >
              详情
            </button>
            <button disabled={!ready} onClick={() => onAnalyze(selected)}>
              分析
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
