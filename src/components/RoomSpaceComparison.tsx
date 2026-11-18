import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { roomRackSpace, spaceRows, type RackUnitRange } from "../rack-space";
import { spaceRangeLabel } from "../space-inspection";

export function RoomSpaceComparison({
  size,
  rowId,
  expandedId,
  start,
  onStart,
  restoreFocus,
  onRestored,
  selected,
  scroll,
  onSize,
  onRow,
  onExpand,
  onPreview,
  onInspect,
  ready,
}: {
  size: number;
  rowId: string;
  expandedId: string | null;
  start: number | null;
  onStart: (start: number) => void;
  restoreFocus: boolean;
  onRestored: () => void;
  selected: string;
  scroll: RefObject<number>;
  onSize: (size: number) => void;
  onRow: (rowId: string) => void;
  onExpand: (id: string | null) => void;
  onPreview: (id: string) => void;
  onInspect: (range: RackUnitRange) => void;
  ready: boolean;
}) {
  const container = useRef<HTMLElement>(null);
  const rangeInput = useRef<HTMLSelectElement>(null);
  useLayoutEffect(() => {
    const panel = container.current;
    if (!panel) return;
    panel.scrollTop = scroll.current;
  }, [scroll]);
  useLayoutEffect(() => {
    if (!restoreFocus || !ready || !rangeInput.current) return;
    if (container.current) container.current.scrollTop = scroll.current;
    rangeInput.current.focus({ preventScroll: true });
    rangeInput.current.scrollIntoView({ block: "nearest" });
    onRestored();
  }, [restoreFocus, ready, scroll, onRestored]);
  const comparison = useMemo(() => roomRackSpace(size, rowId), [size, rowId]);
  const matching = comparison.filter((rack) => rack.candidates.length);
  return (
    <section
      ref={container}
      className="rack-space-inspector room-space-comparison"
      aria-label="全机房空间对照"
      onScroll={(e) => {
        scroll.current = e.currentTarget.scrollTop;
      }}
    >
      <header>
        <strong>机房安装空间</strong>
        <p className="rack-space-note">按安装配置核对 U 位几何</p>
      </header>
      <div className="room-space-filters">
        <label>
          核查高度
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
        {comparison.length} 柜中有 {matching.length} 柜满足 {size}U 跨度
      </p>
      <div className="room-space-key" aria-label="安装分布图例">
        <span>
          <i className="is-installed" />
          已安装
        </span>
        <span>
          <i className="is-blanking" />
          未安装
        </span>
        <span>
          <i className="is-candidate" />
          候选空段
        </span>
      </div>
      {comparison.map((rack) => {
        const expanded = expandedId === rack.rack.id;
        const name = rack.rack.name.replace(" 机柜", "");
        const gap = expanded
          ? (rack.candidates.find((g) =>
              g.ranges.some((r) => r.first === start),
            ) ?? rack.candidates[0])
          : undefined;
        const range = gap?.ranges.find((r) => r.first === start) ?? gap?.sample;
        return (
          <article
            className="room-space-rack"
            key={rack.rack.id}
            data-selected={selected === rack.rack.id}
          >
            <button
              className="room-space-heading"
              aria-expanded={expanded}
              aria-controls={expanded ? `space-${rack.rack.id}` : undefined}
              onClick={() => onExpand(expanded ? null : rack.rack.id)}
            >
              <strong>{name}</strong>
              <span>
                {rack.candidates.length
                  ? `${rack.candidates.length} 段可选`
                  : "无匹配空段"}{" "}
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
              {[...rack.segments].reverse().map((segment) => (
                <i
                  key={segment.id}
                  className={
                    segment.kind === "device"
                      ? "is-installed"
                      : rack.candidates.some(
                            (gap) => gap.first === segment.first,
                          )
                        ? "is-candidate"
                        : "is-blanking"
                  }
                  style={{
                    gridColumn: `${segment.first} / span ${segment.last - segment.first + 1}`,
                  }}
                />
              ))}
              {range && (
                <i
                  className="room-space-mark"
                  style={{ gridColumn: `${range.first} / span ${size}` }}
                />
              )}
            </div>
            <p className="room-space-totals">
              已装 {rack.installedUnits}U · 未装 {rack.blankingUnits}U ·
              最长空段 {rack.largestGap}U
            </p>
            {expanded && (
              <div id={`space-${rack.rack.id}`} className="room-space-options">
                {gap && range ? (
                  <>
                    <label>
                      连续空段
                      <select
                        value={gap.first}
                        onChange={(e) => onStart(Number(e.target.value))}
                      >
                        {rack.candidates.map((g) => (
                          <option key={g.first} value={g.first}>
                            {spaceRangeLabel(g)} · {g.units}U
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      核查范围
                      <select
                        ref={rangeInput}
                        value={range.first}
                        onChange={(e) => onStart(Number(e.target.value))}
                      >
                        {gap.ranges.map((r) => (
                          <option key={r.first} value={r.first}>
                            {spaceRangeLabel(r)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <p>最长空段不足 {size}U，可调低核查高度。</p>
                )}
                <div className="room-space-actions">
                  {range && (
                    <button disabled={!ready} onClick={() => onInspect(range)}>
                      进柜核查 ↗
                    </button>
                  )}
                  <button
                    aria-label={`预览 ${name} 机柜`}
                    onClick={() => onPreview(rack.rack.id)}
                  >
                    预览机柜
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
      <details className="rack-space-boundary">
        <summary>核查依据</summary>
        <p>
          分布条从左到右为 U1 至 U{comparison[0]?.units}
          。按各柜完整安装配置计算，抽出设备仍占原位，后置 PDU 为 0U 附件。
        </p>
        <p>
          未安装位置由前置盲板封闭。范围可能重叠，仅用于核对几何。可分配容量、承重、深度、供电及散热余量尚未定义。
        </p>
      </details>
    </section>
  );
}
