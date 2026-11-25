import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  capacitySource,
  capacityStatus,
  spaceRows,
  type RackUnitRange,
  type roomRackCapacity,
} from "../rack-space";
import { spaceRangeLabel } from "../space-inspection";

export function RoomSpaceComparison({
  comparison,
  size,
  rowId,
  query,
  expandedId,
  range,
  onStart,
  restoreFocus,
  onRestored,
  selected,
  scroll,
  onSize,
  onRow,
  onQuery,
  onExpand,
  onInspect,
  ready,
}: {
  comparison: ReturnType<typeof roomRackCapacity>;
  size: number;
  rowId: string;
  query: string;
  expandedId: string | null;
  range: RackUnitRange | null;
  onStart: (start: number) => void;
  restoreFocus: boolean;
  onRestored: () => void;
  selected: string;
  scroll: RefObject<number>;
  onSize: (size: number) => void;
  onRow: (rowId: string) => void;
  onQuery: (query: string) => void;
  onExpand: (id: string | null) => void;
  onInspect: (range: RackUnitRange) => void;
  ready: boolean;
}) {
  const container = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const entry = useRef<HTMLButtonElement>(null);
  const clear = () => {
    onQuery("");
    search.current?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    if (container.current) container.current.scrollTop = scroll.current;
  }, [scroll]);
  useLayoutEffect(() => {
    const panel = container.current;
    const button = entry.current;
    if (!restoreFocus || !ready || !panel || !button) return;
    panel.scrollTop = scroll.current;
    button.focus({ preventScroll: true });
    button.scrollIntoView({ block: "nearest" });
    onRestored();
  }, [restoreFocus, ready, scroll, onRestored]);
  const matching = comparison.filter((rack) => rack.candidates.length).length;
  return (
    <section
      ref={container}
      className="rack-space-inspector room-space-comparison"
      aria-label="机房 U 位容量核对"
      onScroll={(e) => {
        scroll.current = e.currentTarget.scrollTop;
      }}
      onFocusCapture={(e) => {
        if (e.target.matches(":focus-visible"))
          e.target.scrollIntoView({ block: "nearest" });
      }}
    >
      <header>
        <strong>U 位容量核对</strong>
        <p className="rack-space-note">{capacitySource} · 只读</p>
      </header>
      <div className="study-search capacity-search">
        <span aria-hidden="true">⌕</span>
        <input
          ref={search}
          aria-label="查找机柜容量"
          placeholder="机柜编号，如 B03"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && query) {
              e.preventDefault();
              e.stopPropagation();
              clear();
            }
          }}
        />
        {query && (
          <button type="button" aria-label="清除机柜容量查找" onClick={clear}>
            ×
          </button>
        )}
      </div>
      <div className="room-space-filters">
        <label>
          设备高度
          <select
            aria-label="对照设备U高度"
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
          >
            {[1, 2, 4].map((n) => (
              <option key={n} value={n}>
                {n}U
              </option>
            ))}
          </select>
        </label>
        <label>
          柜排
          <select
            aria-label="空间对照柜排"
            value={rowId}
            onChange={(e) => onRow(e.target.value)}
          >
            <option value="all">全部</option>
            {spaceRows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role="status">
        {comparison.length
          ? `${comparison.length} 柜中有 ${matching} 柜匹配连续 ${size}U`
          : "没有匹配机柜，可调整查找或柜排。"}
      </p>
      <div className="room-space-key" aria-label="U 位容量图例">
        {Object.entries(capacityStatus).map(([status, label]) => (
          <span key={status}>
            <i data-capacity={status} />
            {label}
          </span>
        ))}
      </div>
      {comparison.map((rack) => {
        const id = rack.rack.id;
        const expanded = expandedId === id;
        const current = expanded && range?.rackId === id ? range : null;
        return (
          <article
            key={id}
            className="room-space-rack"
            data-selected={selected === id}
          >
            <button
              className="room-space-heading"
              aria-expanded={expanded}
              aria-controls={expanded ? `space-${id}` : undefined}
              onClick={() => onExpand(expanded ? null : id)}
            >
              <strong>{rack.rack.name}</strong>
              <span>
                {rack.candidates.length
                  ? `${rack.candidates.length} 个候选`
                  : "无匹配候选"}{" "}
                {expanded ? "−" : "+"}
              </span>
            </button>
            <div
              className="room-space-strip"
              aria-hidden="true"
              style={{
                gridTemplateColumns: `repeat(${rack.units}, minmax(0, 1fr))`,
              }}
            >
              {rack.segments.map((segment) => (
                <i
                  key={segment.first}
                  data-capacity={segment.status}
                  style={{
                    gridColumn: `${segment.first} / span ${segment.last - segment.first + 1}`,
                  }}
                />
              ))}
              {current && (
                <i
                  className="room-space-mark"
                  style={{ gridColumn: `${current.first} / span ${size}` }}
                />
              )}
            </div>
            <p className="room-space-totals">
              可分配 {rack.availableUnits}U / {rack.units}U
            </p>
            {expanded && (
              <div id={`space-${id}`} className="room-space-options">
                {current ? (
                  <>
                    <label>
                      候选范围
                      <select
                        value={current.first}
                        onChange={(e) => onStart(Number(e.target.value))}
                      >
                        {rack.candidates.map((candidate) => (
                          <option key={candidate.first} value={candidate.first}>
                            {spaceRangeLabel(candidate)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      ref={entry}
                      className="room-space-enter"
                      disabled={!ready}
                      onClick={() => onInspect(current)}
                    >
                      进柜核查 ↗
                    </button>
                  </>
                ) : (
                  <p>本柜没有连续 {size}U 的可分配区间。</p>
                )}
              </div>
            )}
          </article>
        );
      })}
      <details className="rack-space-boundary">
        <summary>候选计算说明</summary>
        <p>
          分布条从低 U 到高 U。每个候选的全部 U
          位均有可分配登记。候选可重叠，数量表示可选起点。
        </p>
      </details>
    </section>
  );
}
