import type { RangeSegment } from "../range-segments";
import { spaceRangeLabel } from "../space-inspection";

export function RangeSegments({
  segments,
  currentId,
  ready,
  onSegment,
  onDevice,
  onReturn,
  observing,
  compact = false,
}: {
  segments: RangeSegment[];
  currentId: string | null;
  ready: boolean;
  onSegment: (id: string | null) => void;
  onDevice: (id: string) => void;
  onReturn: () => void;
  observing: boolean;
  compact?: boolean;
}) {
  const index = segments.findIndex((segment) => segment.id === currentId);
  const current = segments[index];
  const controls = (
    <section
      className="range-segments"
      aria-label="范围逐段核对"
      onKeyDown={(event) => {
        if (event.key === "Escape" && observing && ready) {
          event.preventDefault();
          event.stopPropagation();
          onReturn();
        }
      }}
    >
      <label>
        逐段观察 · 从高 U 到低 U
        <select
          aria-label="观察范围分段"
          disabled={!ready}
          value={current?.id ?? ""}
          onChange={(event) => onSegment(event.target.value || null)}
        >
          <option value="">整个核查范围</option>
          {segments.map((segment, i) => (
            <option key={segment.id} value={segment.id}>
              {i + 1} · {spaceRangeLabel(segment.range)} · {segment.name}
            </option>
          ))}
        </select>
      </label>
      {current && (
        <>
          <div className="range-segment-step">
            <button
              disabled={!ready || index === 0}
              onClick={() => onSegment(segments[index - 1].id)}
            >
              上一段
            </button>
            <span aria-live="polite">
              {index + 1} / {segments.length}
            </span>
            <button
              disabled={!ready || index === segments.length - 1}
              onClick={() => onSegment(segments[index + 1].id)}
            >
              下一段
            </button>
          </div>
          <p>
            当前括线 {spaceRangeLabel(current.range)} ·{" "}
            {current.range.last - current.range.first + 1} U
          </p>
          {current.kind === "device" ? (
            <>
              <p>
                {current.name} 完整安装 {spaceRangeLabel(current)}
                ；括线只标与核查范围相交部分。
              </p>
              <button
                data-segment-device={current.id}
                disabled={!ready}
                onClick={() => onDevice(current.id)}
              >
                检视本段设备 {current.name} ↗
              </button>
            </>
          ) : (
            <p>
              本段未安装设备，前置盲板封闭；后侧观察不表示后置盲板或可分配容量。
            </p>
          )}
        </>
      )}
    </section>
  );
  return compact ? (
    <details className="range-segments-disclosure">
      <summary>
        {current
          ? `分段 · ${spaceRangeLabel(current.range)} · ${current.name}`
          : "逐段核对范围"}
      </summary>
      {controls}
    </details>
  ) : (
    controls
  );
}
