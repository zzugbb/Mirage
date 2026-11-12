import { useMemo, useRef } from "react";
import {
  inletDifferenceProcess,
  type InletDifferenceReview,
} from "../inlet-difference";
import { inletPairSnapshot } from "../inlet-pair";
const differenceText = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)} °C`;
export function InletDifferenceProcess({
  firstId,
  secondId,
  time,
  state,
  onChange,
  onSeek,
}: {
  firstId: string;
  secondId: string;
  time: number;
  state: InletDifferenceReview;
  onChange: (state: InletDifferenceReview) => void;
  onSeek: (time: number) => void;
}) {
  const summary = useRef<HTMLElement>(null);
  const horizon = state.origin ?? time;
  const process = useMemo(
    () => inletDifferenceProcess(firstId, secondId, horizon)!,
    [firstId, secondId, horizon],
  );
  const current = inletPairSnapshot(firstId, secondId, time)!;
  const seek = (target: number) => {
    onChange({ open: true, origin: state.origin ?? time });
    onSeek(target);
  };
  return (
    <details
      className="inlet-difference-process"
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
      <summary ref={summary}>
        温差过程核对 · {process.validCount}/{process.count} 个有效时刻
      </summary>
      <p>
        {state.origin === null
          ? `截至 t+${time}s 已发生记录`
          : `核对基准 t+${state.origin}s · 保留当时记录`}
        。所查 − 基准，按秒核对同秒有效进风；正负表示差值方向。
      </p>
      {state.origin !== null && (
        <button
          className="inlet-difference-return"
          onClick={() => {
            onSeek(state.origin!);
            onChange({ ...state, origin: null });
            summary.current?.focus({ preventScroll: true });
          }}
        >
          返回温差核对前 {state.origin}s
        </button>
      )}
      <div
        className="inlet-difference-extremes"
        aria-label="已发生有效温差范围"
      >
        {process.minimum && process.maximum ? (
          (
            [
              ["最小差值", process.minimum],
              ["最大差值", process.maximum],
            ] as const
          ).map(([label, point]) => (
            <button
              key={label}
              onClick={() => seek(point.time)}
              aria-label={`回看${label} ${point.time}s`}
            >
              <span>{label}</span>
              <strong>{differenceText(point.value)}</strong>
              <small>首次 t+{point.time}s ↗</small>
            </button>
          ))
        ) : (
          <p>截至基准时刻没有可计算的差值；无效进风不补零。</p>
        )}
      </div>
      <p aria-label="当前温差核对状态">
        场景 t+{time}s ·{" "}
        {current.difference === null
          ? "暂不可比"
          : differenceText(current.difference)}
        <br />① 所查：{current.first.reason} / ② 基准：{current.second.reason}
      </p>
      <ol aria-label="进风差值输入区间">
        {process.intervals.map((row) => (
          <li
            key={row.start}
            aria-current={
              time >= row.start && time <= row.end ? "true" : undefined
            }
          >
            <strong>
              t+{row.start}–{row.end}s · {row.comparable ? "可比" : "暂不可比"}
            </strong>
            <small>
              ① {row.firstStatus} / ② {row.secondStatus}
            </small>
            <div>
              <button
                aria-label={`回看温差区间首秒 ${row.start}s`}
                onClick={() => seek(row.start)}
              >
                首秒 {row.start}s
              </button>
              {row.end !== row.start && (
                <button
                  aria-label={`回看温差区间末秒 ${row.end}s`}
                  onClick={() => seek(row.end)}
                >
                  末秒 {row.end}s
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      <small>
        极值只取有效时刻，并列取首次；区间按输入条件划分，不是告警或冷却效果结论。回看保留镜头与结构；结束对照或重播清除核对基准。
      </small>
    </details>
  );
}
