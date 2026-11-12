import { useMemo, useRef, useState } from "react";
import { airflowIntervals } from "../airflow-interval";
import type { AirflowResponseTarget } from "../airflow-response";

export function AirflowIntervalReview({
  target,
  time,
  onSeek,
}: {
  target: AirflowResponseTarget;
  time: number;
  onSeek: (time: number) => void;
}) {
  const [origin, setOrigin] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const summary = useRef<HTMLElement>(null);
  const rows = useMemo(
    () => airflowIntervals(target, origin ?? time)!,
    [target.id, origin, time],
  );
  const seek = (at: number) => {
    setOrigin(origin ?? time);
    onSeek(at);
  };
  return (
    <details
      className="airflow-interval-review"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
          summary.current?.focus();
        }
      }}
    >
      <summary ref={summary}>输入阶段核对 · {rows.length} 段</summary>
      <p>
        {origin === null
          ? `截至 t+${time}s 已发生记录`
          : `核对基准 t+${origin}s · 保留当时记录`}
        。场景与曲线跟随当前 t+{time}s。
      </p>
      {origin !== null && (
        <button
          onClick={() => {
            onSeek(origin);
            setOrigin(null);
            summary.current?.focus({ preventScroll: true });
          }}
        >
          返回阶段核对前 {origin}s
        </button>
      )}
      <ol aria-label="冷却输入阶段">
        {rows.map((row) => (
          <li
            key={row.start}
            aria-current={
              time >= row.start && time <= row.end ? "true" : undefined
            }
          >
            <strong>
              {row.title} · {row.start}–{row.end}s
            </strong>
            <div className="airflow-interval-points">
              {(
                [
                  ["首秒", row.first],
                  ["末秒", row.last],
                ] as const
              ).map(([label, p]) => (
                <button
                  key={label}
                  onClick={() => seek(p.time)}
                  aria-label={`回看输入阶段${label} ${p.time}s`}
                >
                  <span>
                    {label} {p.time}s ↗
                  </span>
                  <span>输入 {p.input.toFixed(1)}%</span>
                  <b>
                    {p.temperature === null ? "—" : p.temperature.toFixed(1)} °C
                  </b>
                  <small>
                    {p.status}
                    {p.status === "已过期" && p.observedAt !== null
                      ? ` · 最后观测 ${p.observedAt}s`
                      : ""}
                  </small>
                </button>
              ))}
            </div>
            <p>
              进风有效 {row.validCount}/{row.count} 个时刻 · 首末变化{" "}
              {row.difference === null
                ? "暂不可比"
                : `${row.difference > 0 ? "+" : ""}${row.difference.toFixed(1)} °C`}
            </p>
          </li>
        ))}
      </ol>
      <small>
        按输入事件分段，末秒截止下一事件前或核对基准；变化仅比较两端有效进风，不代表期间连续有效、响应时延或冷却效果。无效值不补零。回看保留观察段和镜头，重播或结束对照清除基准。
      </small>
    </details>
  );
}
