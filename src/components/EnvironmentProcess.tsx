import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  environmentProcess,
  environmentProcessNames,
} from "../environment-monitoring";
import { trendMetricNames } from "../trend-geometry";
import { useResultFocusFallback } from "../use-result-focus-fallback";

export function EnvironmentProcess({
  id,
  time,
  onSeek,
}: {
  id: string;
  time: number;
  onSeek: (time: number) => void;
}) {
  const events = useMemo(() => environmentProcess(id, time), [id, time]);
  const [origin, setOrigin] = useState<{
    time: number;
    eventTime: number;
  } | null>(null);
  const [metric, setMetric] = useState("all");
  const filter = useRef<HTMLSelectElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const restoreEvent = useRef<number | null>(null);
  useLayoutEffect(() => {
    const at = restoreEvent.current;
    if (at === null) return;
    restoreEvent.current = null;
    const entry = list.current?.querySelector<HTMLButtonElement>(
      `[data-environment-event="${at}"]`,
    );
    (entry ?? filter.current)?.focus();
  }, [origin, time]);
  const watchEvent = useResultFocusFallback(filter);
  const visible = events.filter((event) =>
    event.changes.some(
      (change) => metric === "all" || change.metric === metric,
    ),
  );
  return (
    <details className="environment-process">
      <summary>数据质量过程 · {events.length} 个时刻</summary>
      <p>
        仅列已发生的状态变化；温湿度为模拟采样，露点为推导可用性，均不是设施告警。
      </p>
      <div className="environment-process-tools">
        <label>
          查看{" "}
          <select
            ref={filter}
            aria-label="数据过程指标"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            <option value="all">全部指标</option>
            <option value="ambientTemperature">环境温度</option>
            <option value="humidity">相对湿度</option>
            <option value="dewPoint">推导露点</option>
          </select>
        </label>
        {origin !== null && (
          <button
            onClick={() => {
              restoreEvent.current = origin.eventTime;
              onSeek(origin.time);
              setOrigin(null);
            }}
          >
            返回 t+{origin.time}s
          </button>
        )}
      </div>
      <ol ref={list} aria-label="数据质量变化记录">
        {visible
          .slice()
          .reverse()
          .map((event) => (
            <li key={event.time}>
              <button
                ref={watchEvent}
                data-environment-event={event.time}
                aria-label={`回看数据变化 t+${event.time}s`}
                aria-current={time === event.time ? "true" : undefined}
                onClick={() => {
                  setOrigin(
                    (current) => current ?? { time, eventTime: event.time },
                  );
                  onSeek(event.time);
                }}
              >
                <time>t+{event.time}s</time>
                <span>
                  {event.changes
                    .filter(
                      (change) => metric === "all" || change.metric === metric,
                    )
                    .map((change) => (
                      <span key={change.metric}>
                        {trendMetricNames[change.metric]} ·{" "}
                        {change.before === null
                          ? "初始"
                          : environmentProcessNames[change.before]}{" "}
                        → {environmentProcessNames[change.after]}
                      </span>
                    ))}
                </span>
              </button>
            </li>
          ))}
      </ol>
    </details>
  );
}
