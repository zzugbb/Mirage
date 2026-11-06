import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { roomRackSpace, spaceRows, type RackUnitRange } from "../rack-space";

const units = (first: number, last: number) =>
  first === last ? `U${first}` : `U${first}–${last}`;

export function RoomSpaceComparison({
  size,
  rowId,
  expandedId,
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
  useLayoutEffect(() => {
    const panel = container.current;
    if (!panel) return;
    panel.scrollTop = scroll.current;
    panel
      .querySelector<HTMLButtonElement>('[aria-expanded="true"]')
      ?.focus({ preventScroll: true });
  }, [scroll]);
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
        <strong>机房安装空间对照</strong>
        <p>按完整安装配置比较，不受资源搜索、类型或告警筛选影响。</p>
        <p className="rack-space-note">仅核对 U 位几何，不代表可分配容量。</p>
      </header>
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
      <p role="status">
        {comparison.length} 柜中 {matching.length} 柜有连续 {size}U 空段
      </p>
      <p className="rack-space-note">
        各柜保留原有顺序。展开查看范围，预览只选中，检视才进入机柜。
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
          满足跨度
        </span>
      </div>
      {comparison.map((rack) => {
        const expanded = expandedId === rack.rack.id;
        const name = rack.rack.name.replace(" 机柜", "");
        return (
          <article
            className="room-space-rack"
            key={rack.rack.id}
            data-selected={selected === rack.rack.id}
          >
            <button
              className="room-space-heading"
              aria-expanded={expanded}
              aria-controls={`space-${rack.rack.id}`}
              onClick={() => onExpand(expanded ? null : rack.rack.id)}
            >
              <strong>{name}</strong>
              <span>
                最大空段 {rack.largestGap} U {expanded ? "−" : "+"}
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
            </div>
            <div className="room-space-scale" aria-hidden="true">
              <span>U1</span>
              <span>U{rack.units}</span>
            </div>
            <p>
              已安装 {rack.installedUnits} U · 未安装 {rack.blankingUnits} U
            </p>
            <small>
              {rack.candidates.length
                ? `${rack.candidates.length} 个连续空段满足 ${size}U 跨度`
                : `没有连续 ${size}U 空段`}
            </small>
            <div id={`space-${rack.rack.id}`} hidden={!expanded}>
              <button
                aria-label={`预览 ${name} 机柜`}
                onClick={() => onPreview(rack.rack.id)}
              >
                预览机柜
              </button>
              {rack.candidates.map((gap) => (
                <div className="rack-space-gap" key={gap.first}>
                  <strong>
                    {units(gap.first, gap.last)} <span>{gap.units} U</span>
                  </strong>
                  <small>{gap.positions} 个可能起点，可能相互重叠</small>
                  <button
                    disabled={!ready}
                    onClick={() => onInspect(gap.sample)}
                    aria-label={`检视 ${name} ${units(gap.sample.first, gap.sample.last)}`}
                  >
                    检视 {units(gap.sample.first, gap.sample.last)} ↗
                  </button>
                </div>
              ))}
              {!rack.candidates.length && (
                <p>可降低核查高度继续比较，不能合并不相邻的空段。</p>
              )}
            </div>
          </article>
        );
      })}
      <p className="rack-space-boundary">
        未安装段仍由前置盲板封闭。预留、不可用空间、承重、深度、供电及散热余量未定义；起点方案不能相加作为可安装台数。后置
        PDU 为 0U 附件，抽出设备仍占原位。
      </p>
    </section>
  );
}
