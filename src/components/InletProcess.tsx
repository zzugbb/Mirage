import { useMemo, useRef } from "react";
import { inletConditions, inletProcess } from "../inlet-process";
import type { InletProcessState } from "../inlet-process";
import { deviceObservation } from "../device-data";
import { qualityNames } from "../status";
import { useResultFocusFallback } from "../use-result-focus-fallback";

export function InletProcess({
  reviewState,
  onChange,
  id,
  time,
  since,
  confirmed,
  onSeek,
}: {
  reviewState: InletProcessState;
  onChange: (next: InletProcessState) => void;
  id: string;
  time: number;
  since: number | null;
  confirmed: number | null;
  onSeek: (time: number) => void;
}) {
  const { origin, chosen, open } = reviewState;
  const summaryRef = useRef<HTMLElement>(null);
  const watchProcess = useResultFocusFallback(summaryRef);
  const process = useMemo(
    () => inletProcess(id, origin ?? time),
    [id, origin, time],
  );
  const observation = deviceObservation(time, id);
  const currentReading =
    observation.quality !== "valid"
      ? qualityNames[observation.quality]
      : observation.temperature === null
        ? "无进风读数"
        : `${observation.temperature.toFixed(1)} °C`;
  const interval = process.intervals.find((item) => item.id === chosen);
  const rule = interval ? inletConditions[interval.kind] : null;
  const canStepBack =
    !!interval && time > interval.start && time <= interval.end;
  const canStepForward =
    !!interval && time >= interval.start && time < interval.end;
  const visit = (target: number, intervalId?: string) => {
    onChange({
      origin: origin ?? time,
      chosen:
        intervalId ??
        process.intervals.find((item) => item.start === since)?.id ??
        null,
      open: true,
    });
    onSeek(target);
  };
  return (
    <div className="inlet-process">
      <div className="inlet-times">
        {since !== null && (
          <button
            ref={watchProcess}
            aria-disabled={time === since}
            onClick={() => time !== since && visit(since)}
          >
            条件起点 {since}s
          </button>
        )}
        {confirmed !== null && (
          <button
            ref={watchProcess}
            aria-disabled={time === confirmed}
            onClick={() => time !== confirmed && visit(confirmed)}
          >
            状态变化 {confirmed}s
          </button>
        )}
        {origin !== null && (
          <button
            ref={watchProcess}
            onClick={() => {
              onSeek(origin);
              onChange({ ...reviewState, origin: null, chosen: null });
              summaryRef.current?.focus();
            }}
          >
            返回核对前 {origin}s
          </button>
        )}
      </div>
      <details
        open={open}
        onToggle={(event) => {
          if (event.currentTarget.open !== open)
            onChange({ ...reviewState, open: event.currentTarget.open });
        }}
      >
        <summary ref={summaryRef}>
          持续条件过程 · {process.intervals.length} 段
        </summary>
        {open && (
          <div ref={watchProcess}>
            <p>
              {origin === null
                ? `截至 t+${time}s 已知记录`
                : `核对基准 t+${origin}s · 保留当时已知记录`}
              。阈值与等待时间为模拟设定，部件沿用整机判定。
            </p>
            {process.quality === "stale" && (
              <p>
                最后观测 t+{process.observedAt}
                s；仅保留已确认历史，当前计时不可用。
              </p>
            )}
            {process.intervals.length === 0 ? (
              <p>此时没有可核对的持续区间。</p>
            ) : (
              <ol aria-label="进风持续区间">
                {process.intervals.map((item) => {
                  const condition = inletConditions[item.kind];
                  return (
                    <li key={item.id}>
                      <button
                        aria-pressed={item.id === chosen}
                        onClick={() => visit(item.end, item.id)}
                      >
                        <span>
                          {condition.name}{" "}
                          <small>
                            {condition.operator} {condition.threshold} °C ·{" "}
                            {condition.required} 秒
                          </small>
                        </span>
                        <span>
                          {item.start}–{item.end}s{" "}
                          <small>{item.confirmed ? "已确认" : "等待中"}</small>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
            {interval && rule && (
              <section className="inlet-interval" aria-label="当前持续区间">
                <strong>
                  {rule.name}条件 · {rule.operator} {rule.threshold} °C 持续{" "}
                  {rule.required} 秒
                </strong>
                <p className="inlet-interval-reading">
                  场景 t+{time}s · 当前进风 {currentReading}
                </p>
                <p aria-live="polite">
                  {time < interval.start
                    ? "场景在条件起点之前"
                    : time > interval.end
                      ? "场景在所选区间之后"
                      : `区间内已持续 ${time - interval.start} / ${rule.required} 秒`}
                  {time === interval.end && interval.confirmed
                    ? " · 此秒确认状态变化"
                    : ""}
                </p>
                <input
                  type="range"
                  aria-label="逐秒核对持续区间"
                  min={interval.start}
                  max={interval.end}
                  value={Math.max(interval.start, Math.min(interval.end, time))}
                  disabled={interval.start === interval.end}
                  onChange={(event) => onSeek(Number(event.target.value))}
                />
                <div className="inlet-interval-steps">
                  <button
                    onClick={() =>
                      time !== interval.start && onSeek(interval.start)
                    }
                    aria-disabled={time === interval.start}
                  >
                    起点 {interval.start}s
                  </button>
                  <button
                    aria-label="持续区间前一秒"
                    aria-disabled={!canStepBack}
                    onClick={() => canStepBack && onSeek(time - 1)}
                  >
                    −1s
                  </button>
                  <button
                    aria-label="持续区间后一秒"
                    aria-disabled={!canStepForward}
                    onClick={() => canStepForward && onSeek(time + 1)}
                  >
                    +1s
                  </button>
                  <button
                    onClick={() =>
                      time !== interval.end && onSeek(interval.end)
                    }
                    aria-disabled={time === interval.end}
                  >
                    {interval.confirmed ? "确认" : "观测至"} {interval.end}s
                  </button>
                </div>
                {!interval.confirmed && (
                  <p>基准时刻尚未确认，不预示后续是否满足条件。</p>
                )}
              </section>
            )}
          </div>
        )}
      </details>
    </div>
  );
}
