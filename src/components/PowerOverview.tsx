import { useLayoutEffect, useRef, type RefObject } from "react";
import { powerOverview, type PowerOverviewFilter } from "../power-overview";
import { budgetRatio } from "../power-budget";
import { sourceValue } from "../reading-sources";
import type { SpatialReading } from "../spatial";

export function PowerOverview({
  readings,
  query,
  filter,
  rackId,
  selected,
  time,
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
  selected: string;
  time: number;
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
  const target = device?.id ?? current.rack.id;
  const host = useRef<HTMLDivElement>(null);
  const ratioText = (ratio: number | null) =>
    ratio === null ? "—" : `${(ratio * 100).toFixed(1)}%`;
  useLayoutEffect(() => {
    if (!visible || !host.current) return;
    host.current.scrollTop = scroll.current;
    if (!restoreRevision) return;
    const button =
      host.current.querySelector<HTMLButtonElement>(
        `[data-power-id="${target}"]`,
      ) ??
      host.current.querySelector<HTMLButtonElement>(
        `[data-power-id="${current.rack.id}"]`,
      );
    button?.focus({ preventScroll: true });
    button?.scrollIntoView({ block: "nearest" });
  }, [visible, restoreRevision, scroll]);
  return (
    <section className="power-overview" aria-label="机房功耗对照">
      <div
        className="power-overview-scroll"
        ref={host}
        onScroll={(event) => {
          if (visible) scroll.current = event.currentTarget.scrollTop;
        }}
      >
        <header>
          <strong>机房功耗对照</strong>
          <p>
            模拟 {time.toFixed(0)} s · 有效{" "}
            {all.reduce((n, item) => n + item.coverage, 0)}/
            {all.reduce((n, item) => n + item.count, 0)} 台
          </p>
        </header>
        <p>
          柜卡列有效输入小计；条形为同一批有效设备的预算占比，非容量余量；斜线表示占比不可计算。
        </p>
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
                {item.value === null
                  ? "—"
                  : `${(item.value / 1000).toFixed(2)} kW`}
              </strong>
              <span
                className="power-overview-meter"
                data-known={item.budget!.ratio !== null}
              >
                <i
                  style={{
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
        <label>
          查找设备、柜位或数据状态
          <input
            aria-label="功耗对照查找"
            placeholder="SRV、B03、过期、零值"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.stopPropagation();
                onQuery("");
              }
            }}
          />
        </label>
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
        <div className="power-overview-heading">
          <strong>{current.rack.name}</strong>
          <small>按安装 U 位排列</small>
        </div>
        <div className="power-overview-devices">
          {current.matching.map((row) => {
            const ratio = budgetRatio(row.value, row.budget);
            return (
              <button
                key={row.id}
                data-power-id={row.id}
                aria-pressed={selected === row.id}
                onClick={() => onPreview(row.id)}
              >
                <span>
                  <b>{row.name}</b>
                  <strong>{sourceValue(row.value, "power")}</strong>
                </span>
                <small>
                  {row.location.split(" / ")[1]} · {row.reason}
                </small>
                <span
                  className="power-overview-meter"
                  data-known={ratio !== null}
                >
                  <i
                    style={{ width: `${Math.min(100, (ratio ?? 0) * 100)}%` }}
                  />
                </span>
                <small>
                  {ratioText(ratio)} · 配置预算{" "}
                  {sourceValue(row.budget, "power")}
                </small>
              </button>
            );
          })}
        </div>
        {!current.matching.length && (
          <p role="status">
            本柜没有匹配设备；可切换机柜或
            <button
              onClick={() => {
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
            有效功耗按整机去重相加，A/B
            输入不分摊也不重复计入。缺失、过期和离线不补零，停机有效零值仍计入预算。不同预算的相同百分比不代表相同功耗；精确值以
            W
            核对。图条显示至100%，超出时保留实际百分比；预算不是额定容量、设施计量或可分配余量。筛选不改变柜卡和三维标尺的汇总范围。
          </p>
        </details>
      </div>
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
        {device && <small>{device.detail}</small>}
        <div>
          <button disabled={!ready} onClick={() => onInspect(target, false)}>
            安装位
          </button>
          {device && (
            <button disabled={!ready} onClick={() => onInspect(target, true)}>
              查看内部
            </button>
          )}
          <button disabled={!ready} onClick={() => onDetails(target)}>
            详情
          </button>
          <button disabled={!ready} onClick={() => onAnalyze(target)}>
            分析
          </button>
        </div>
      </div>
    </section>
  );
}
