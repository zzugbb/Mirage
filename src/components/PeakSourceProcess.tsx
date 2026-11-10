import { useEffect, useMemo, useRef } from "react";
import { peakSourceIntervals, type PeakProcessState } from "../peak-provenance";
import type { ReviewPoint } from "../review-model";
import { deviceById, rackForDevice } from "../installation";
import { unitLabel } from "../catalog";

export const peakNames = (ids: string[]) =>
  ids.map((id) => deviceById(id)?.name ?? id).join("、") || "无有效来源";
export function PeakSourceProcess({
  points,
  time,
  state,
  onChange,
  onSeek,
  onPreview,
}: {
  points: ReviewPoint[];
  time: number;
  state: PeakProcessState;
  onChange: (state: PeakProcessState) => void;
  onSeek: (time: number) => void;
  onPreview: (id: string) => void;
}) {
  const summary = useRef<HTMLElement>(null);
  useEffect(() => {
    if (state.open) {
      summary.current?.focus({ preventScroll: true });
      summary.current?.scrollIntoView({ block: "nearest" });
    }
  }, []);
  const intervals = useMemo(
    () => peakSourceIntervals(points, state.origin ?? time),
    [points, state.origin, time],
  );
  const current = points[time];
  const seek = (target: number) => {
    onChange({ open: true, origin: state.origin ?? time });
    onSeek(target);
  };
  return (
    <details
      className="peak-source-process"
      open={state.open}
      onToggle={(event) => {
        if (event.currentTarget.open !== state.open)
          onChange({ ...state, open: event.currentTarget.open });
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && state.open) {
          event.preventDefault();
          event.stopPropagation();
          onChange({ ...state, open: false });
          summary.current?.focus();
        }
      }}
    >
      <summary ref={summary}>最高进风来源过程 · {intervals.length} 段</summary>
      <p>
        {state.origin === null
          ? `截至 t+${time}s 已知记录`
          : `核对基准 t+${state.origin}s · 保留当时已知记录`}
        。来源切换与覆盖变化分开列出，不表示告警或冷却故障根因。
      </p>
      {state.origin !== null && (
        <button
          className="peak-source-return-time"
          onClick={() => {
            onSeek(state.origin!);
            onChange({ ...state, origin: null });
            summary.current?.focus();
          }}
        >
          返回来源核对前 {state.origin}s
        </button>
      )}
      <div className="peak-source-current" aria-label="当前场景最高来源">
        <strong>
          场景 t+{time}s ·{" "}
          {current?.value === null || current?.value === undefined
            ? "无有效进风"
            : `${current.value.toFixed(1)} °C`}
        </strong>
        <small>
          有效覆盖 {current?.coverage ?? 0}/{current?.count ?? 0}
        </small>
        {current?.peakSources?.map((id) => (
          <button
            key={id}
            onClick={() => onPreview(id)}
            aria-label={`预览最高来源 ${deviceById(id)!.name}`}
          >
            <b>{deviceById(id)!.name} ↗</b>
            <span>
              {rackForDevice(id).name} / {unitLabel(id)}
            </span>
          </button>
        ))}
        {!current?.peakSources?.length && (
          <small>缺失、过期、离线与无进风值均不补零或借用旧值。</small>
        )}
      </div>
      <ol aria-label="最高进风来源区间">
        {intervals.map((interval) => (
          <li key={interval.start}>
            <button
              aria-label={`回看最高来源 t+${interval.start}s`}
              aria-current={
                time >= interval.start && time <= interval.end
                  ? "true"
                  : undefined
              }
              onClick={() => seek(interval.start)}
            >
              <span>
                <time>
                  {interval.start}–{interval.end}s
                </time>
                <b>
                  {interval.reason === "initial"
                    ? "初始范围"
                    : interval.reason === "source-coverage"
                      ? "来源与覆盖变化"
                      : interval.reason === "source"
                        ? "来源变化"
                        : "覆盖变化"}
                </b>
              </span>
              <strong>{peakNames(interval.sourceIds)}</strong>
              <small>
                覆盖 {interval.coverage}/{interval.count} ·{" "}
                {interval.min === null
                  ? "无有效进风"
                  : `${interval.min.toFixed(1)}–${interval.max!.toFixed(1)} °C`}
              </small>
            </button>
            {interval.end > interval.start && (
              <button
                className="peak-source-end"
                aria-label={`回看来源区间末秒 t+${interval.end}s`}
                onClick={() => seek(interval.end)}
              >
                末秒 {interval.end}s ↗
              </button>
            )}
          </li>
        ))}
      </ol>
      <small>
        按未舍入读数确定最高来源，并列时全部保留。区间温度是该段各秒最高值的范围；跨段来源可能更换，不能当作同一台设备的连续温度响应。
      </small>
    </details>
  );
}
