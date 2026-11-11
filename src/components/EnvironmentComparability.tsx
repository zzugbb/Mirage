import { useEffect, useMemo, useRef } from "react";
import {
  environmentComparability,
  type ComparabilityReview,
} from "../environment-comparability";
import type { EnvironmentPair } from "../environment-pair";
import {
  environmentComparison,
  type EnvironmentMetric,
} from "../environment-monitoring";
import { trendMetricNames } from "../trend-geometry";
export function EnvironmentComparability({
  pair,
  metric,
  time,
  state,
  onChange,
  onSeek,
}: {
  pair: EnvironmentPair;
  metric: EnvironmentMetric;
  time: number;
  state: ComparabilityReview;
  onChange: (state: ComparabilityReview) => void;
  onSeek: (time: number) => void;
}) {
  const summary = useRef<HTMLElement>(null);
  useEffect(() => {
    if (state.open) {
      summary.current?.focus({ preventScroll: true });
      summary.current?.parentElement?.scrollIntoView({ block: "nearest" });
    }
  }, [state.open]);
  const intervals = useMemo(
    () => environmentComparability(pair, metric, state.origin ?? time),
    [pair.firstId, pair.secondId, metric, state.origin, time],
  );
  const current = environmentComparison(
    pair.firstId,
    pair.secondId,
    time,
  )!.find((r) => r.metric === metric)!;
  const seek = (target: number) => {
    onChange({ open: true, origin: state.origin ?? time });
    onSeek(target);
  };
  return (
    <details
      className="environment-comparability"
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
      <summary ref={summary}>双点可比过程 · {intervals.length} 段</summary>
      <p>
        {trendMetricNames[metric]} ·{" "}
        {state.origin === null
          ? `截至 t+${time}s 已发生记录`
          : `核对基准 t+${state.origin}s · 保留当时记录`}
        。区间只解释差值的输入条件，不代表异常事件。
      </p>
      {state.origin !== null && (
        <button
          className="comparability-return"
          onClick={() => {
            onSeek(state.origin!);
            onChange({ ...state, origin: null });
            summary.current?.focus();
          }}
        >
          返回可比核对前 {state.origin}s
        </button>
      )}
      <p aria-label="当前双点可比条件">
        场景 t+{time}s · {current.delta === null ? "暂不可比" : "可比"} ·{" "}
        {current.reason}
        <br />① {current.left.status} / ② {current.right.status}
      </p>
      <ol aria-label="双点可比区间">
        {intervals.map((row) => (
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
              ① {row.firstStatus} / ② {row.secondStatus} · {row.reason}
            </small>
            <div>
              <button
                aria-label={`回看可比区间首秒 ${row.start}s`}
                onClick={() => seek(row.start)}
              >
                回看首秒 {row.start}s
              </button>
              {row.end !== row.start && (
                <button
                  aria-label={`回看可比区间末秒 ${row.end}s`}
                  onClick={() => seek(row.end)}
                >
                  回看末秒 {row.end}s
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      <small>
        只比较同一采样时刻的有效值；无效不补零，露点仍为推导。回看保留镜头与结构；切换指标或结束双点对照清除核对基准。
      </small>
    </details>
  );
}
