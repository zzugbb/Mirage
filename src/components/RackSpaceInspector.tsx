import { RangeSegments } from "./RangeSegments";
import type { RangeSegment } from "../range-segments";
import { RangeViewActions } from "./RangeViewActions";
import type { RangeView, RangeViewCommand } from "../range-view";
import { useState, useLayoutEffect, useRef } from "react";
import { rackInstallation } from "../rack-installation";
import {
  inspectRackSpace,
  rackSpaceCandidates,
  type RackUnitRange,
} from "../rack-space";

const label = (first: number, last: number) =>
  first === last ? `U${first}` : `U${first}–${last}`;
export function RackSpaceInspector({
  segments,
  segmentId,
  onSegment,
  view,
  onView,
  restore,
  ready,
  rackId,
  range,
  onRange,
  onDevice,
  onClear,
  queryMessage,
  size,
  onSize,
  onCompare,
}: {
  segments: RangeSegment[];
  segmentId: string | null;
  onSegment: (id: string | null) => void;
  view: RangeView | null;
  onView: (action: RangeViewCommand["action"]) => void;
  restore: {
    rackId: string;
    deviceId: string;
    start: string;
    scroll: number;
  } | null;
  ready: boolean;
  rackId: string;
  range: RackUnitRange | null;
  onRange: (range: RackUnitRange) => void;
  onDevice: (id: string, start: string, scroll: number) => void;
  onClear: () => void;
  queryMessage?: string;
  size: number;
  onSize: (size: number) => void;
  onCompare?: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const [start, setStart] = useState(String(range?.first ?? 1));
  useLayoutEffect(() => {
    if (!restore || restore.rackId !== rackId || !panel.current) return;
    setStart(restore.start);
    panel.current
      .querySelector<HTMLElement>(`[data-space-device="${restore.deviceId}"]`)
      ?.focus({ preventScroll: true });
    panel.current.scrollTop = restore.scroll;
  }, [restore, rackId]);
  const layout = rackInstallation(rackId)!;
  const candidates = rackSpaceCandidates(rackId, size);
  const result = range ? inspectRackSpace(range) : null;
  const proposed = {
    rackId,
    first: Number(start),
    last: Number(start) + size - 1,
  };
  const valid = start.trim() !== "" && inspectRackSpace(proposed) !== null;
  const gaps = layout.segments.filter((s) => s.kind === "blanking");
  return (
    <section
      ref={panel}
      className="rack-space-inspector"
      aria-label="安装空间核查"
    >
      <header>
        {onCompare && <button onClick={onCompare}>全机房空间对照 ↗</button>}
        <strong>{layout.rack.name} · 安装空间</strong>
        <p>
          已安装 {layout.installedUnits} U · 未安装 {layout.blankingUnits} U
        </p>
        <small>
          最大连续空段 {Math.max(0, ...gaps.map((s) => s.last - s.first + 1))} U
          · 前置盲板封闭
        </small>
        <p className="rack-space-note">仅核对 U 位几何，不代表可分配容量。</p>
      </header>
      {queryMessage && <p role="status">{queryMessage}</p>}
      <label>
        核查高度{" "}
        <select
          aria-label="核查设备U高度"
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onRange(proposed);
        }}
      >
        <label>
          起始 U 位{" "}
          <input
            aria-label="核查起始U位"
            type="number"
            min="1"
            max={layout.units - size + 1}
            step="1"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <button disabled={!valid} type="submit">
          核查此范围
        </button>
      </form>
      {!valid && (
        <p role="status">
          请选择 U1–{layout.units - size + 1} 的整数起始位置。
        </p>
      )}
      {result && (
        <section className="rack-space-result" aria-label="范围核查结果">
          <strong>
            {label(result.first, result.last)} ·{" "}
            {result.occupied ? "存在安装占用" : "无设备安装占用"}
          </strong>
          <p>
            设备占用 {result.occupied} U · 未安装 {result.blanked} U
          </p>
          <RangeViewActions active={view} ready={ready} onView={onView} />
          <RangeSegments
            segments={segments}
            currentId={segmentId}
            observing={!!view}
            onReturn={() => onView("return")}
            ready={ready}
            onSegment={onSegment}
            onDevice={(id) =>
              onDevice(id, start, panel.current?.scrollTop ?? 0)
            }
          />
          {result.conflicts.map((d) => (
            <button
              key={d.id}
              disabled={!ready}
              data-space-device={d.id}
              onClick={() =>
                onDevice(d.id, start, panel.current?.scrollTop ?? 0)
              }
              aria-label={`查看冲突设备 ${d.name}`}
            >
              {d.name} <span>{label(d.first, d.last)} ↗</span>
            </button>
          ))}
          <small>
            {result.occupied
              ? "列出完整设备跨度，核查范围可能只与其中部分相交。"
              : "当前由前置盲板封闭；尚不能确认可安装。"}
          </small>
          <button onClick={onClear}>清除范围标记</button>
        </section>
      )}
      <h3>
        可容纳 {size}U 跨度的连续空段 · {candidates.length}
      </h3>
      <p className="rack-space-note">
        按本柜完整安装配置筛选，不受资源筛选影响。总览下三维显示核查范围，可切换前/后视观察。起点方案可能相互重叠，不能相加作为设备数量。
      </p>
      {candidates.length ? (
        candidates.map((gap) => (
          <div className="rack-space-gap" key={gap.first}>
            <strong>
              {label(gap.first, gap.last)} <span>{gap.units} U</span>
            </strong>
            <small>{gap.positions} 个可能起点</small>
            <button
              onClick={() => {
                setStart(String(gap.first));
                onRange(gap.sample);
              }}
            >
              核查 {label(gap.sample.first, gap.sample.last)}
            </button>
            <button
              onClick={() =>
                onRange({ rackId, first: gap.first, last: gap.last })
              }
            >
              查看整个空段
            </button>
          </div>
        ))
      ) : (
        <p>本柜没有满足此高度的连续未安装区间。</p>
      )}
      <p className="rack-space-boundary">
        仅核对已登记安装位置。预留、不可用空间、承重、设备深度、供电与散热余量未定义；不提供安装确认或容量分配。后置
        PDU 不占标准 U 位，抽出设备仍占原安装位。
      </p>
    </section>
  );
}
