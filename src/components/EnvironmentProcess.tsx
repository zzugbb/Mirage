import { useMemo, useState } from "react";
import {
  environmentProcess,
  environmentProcessNames,
} from "../environment-monitoring";
import { trendMetricNames } from "../trend-geometry";

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
  const [origin, setOrigin] = useState<number | null>(null);
  const [metric, setMetric] = useState("all");
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
              onSeek(origin);
              setOrigin(null);
            }}
          >
            返回 t+{origin}s
          </button>
        )}
      </div>
      <ol aria-label="数据质量变化记录">
        {visible
          .slice()
          .reverse()
          .map((event) => (
            <li key={event.time}>
              <button
                aria-label={`回看数据变化 t+${event.time}s`}
                aria-current={time === event.time ? "true" : undefined}
                onClick={() => {
                  setOrigin((current) => current ?? time);
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
