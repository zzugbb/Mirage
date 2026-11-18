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
import { spaceRangeLabel } from "../space-inspection";

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
  const [byGap, setByGap] = useState(false);
  const [choice, setChoice] = useState({ first: range?.first, whole: false });
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
  const gap =
    candidates.find((g) => g.ranges.some((r) => r.first === choice.first)) ??
    candidates[0];
  const offsetRange =
    gap?.ranges.find((r) => r.first === choice.first) ?? gap?.sample;
  const whole = choice.whole && gap && gap.units > size;
  const candidateRange = whole
    ? { rackId, first: gap.first, last: gap.last }
    : offsetRange;
  const proposal = byGap
    ? candidateRange
    : {
        rackId,
        first: Number(start),
        last: Number(start) + size - 1,
      };
  const valid = proposal && inspectRackSpace(proposal) !== null;
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
          已装 {layout.installedUnits}U · 未装 {layout.blankingUnits}U ·
          最长空段 {Math.max(0, ...gaps.map((s) => s.last - s.first + 1))}U
        </p>
      </header>
      {queryMessage && <p role="status">{queryMessage}</p>}
      <form
        className="rack-range-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onRange(proposal);
        }}
      >
        <div className="rack-range-mode" role="group" aria-label="范围选择方式">
          <button
            type="button"
            aria-pressed={!byGap}
            onClick={() => setByGap(false)}
          >
            按起点
          </button>
          <button
            type="button"
            aria-pressed={byGap}
            onClick={() => setByGap(true)}
          >
            按空段
          </button>
        </div>
        <div className="rack-range-fields">
          <label>
            核查高度
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
          {byGap ? (
            gap && (
              <label>
                连续空段
                <select
                  value={gap.first}
                  onChange={(e) =>
                    setChoice({ first: Number(e.target.value), whole: false })
                  }
                >
                  {candidates.map((g) => (
                    <option key={g.first} value={g.first}>
                      {spaceRangeLabel(g)} · {g.units}U
                    </option>
                  ))}
                </select>
              </label>
            )
          ) : (
            <label>
              起始 U 位
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
          )}
        </div>
        {byGap && gap && offsetRange && (
          <label>
            核查范围
            <select
              aria-label="空段内核查范围"
              value={whole ? "whole" : offsetRange.first}
              onChange={(e) =>
                setChoice(
                  e.target.value === "whole"
                    ? { first: gap.first, whole: true }
                    : { first: Number(e.target.value), whole: false },
                )
              }
            >
              {gap.ranges.map((r) => (
                <option key={r.first} value={r.first}>
                  {spaceRangeLabel(r)}
                </option>
              ))}
              {gap.units > size && (
                <option value="whole">{spaceRangeLabel(gap)} · 整段</option>
              )}
            </select>
          </label>
        )}
        {!valid && (
          <p role="status">
            {byGap
              ? `本柜没有连续 ${size}U 空段。`
              : `起始位置须为 U1–${layout.units - size + 1} 的整数。`}
          </p>
        )}
        <button disabled={!valid} type="submit">
          核查此范围
        </button>
      </form>
      {result && (
        <section className="rack-space-result" aria-label="范围核查结果">
          <strong>
            {spaceRangeLabel(result)} ·{" "}
            {result.occupied ? "存在安装占用" : "无设备安装占用"}
          </strong>
          <p>
            {result.occupied
              ? `设备占用 ${result.occupied}U · 未安装 ${result.blanked}U`
              : `${result.blanked}U 前置盲板封闭`}
          </p>
          <RangeViewActions active={view} ready={ready} onView={onView} />
          <RangeSegments
            compact
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
              {d.name} <span>{spaceRangeLabel(d)} ↗</span>
            </button>
          ))}
          {result.conflicts.length > 0 && (
            <small>设备旁标注完整安装跨度。</small>
          )}
          <button onClick={onClear}>清除范围标记</button>
        </section>
      )}
      <details className="rack-space-boundary">
        <summary>核查依据与限制</summary>
        <p>按本柜完整安装配置计算。抽出的设备仍占原位，后置 PDU 为 0U 附件。</p>
        <p>
          重叠范围仅供核对几何。可分配容量、预留与不可用空间、承重、深度、供电和散热余量尚未定义。
        </p>
      </details>
    </section>
  );
}
