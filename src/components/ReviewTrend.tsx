import { useEffect, useId, useRef, useState } from "react";
import type { ReviewMetric, ReviewPoint } from "../review-model";

export function ReviewTrend({
  series,
  metric,
  time,
  compact = false,
  onSeek,
}: {
  series: ReviewPoint[];
  metric: ReviewMetric;
  time: number;
  compact?: boolean;
  onSeek?: (time: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(280);
  const id = useId();
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(180, entry.contentRect.width)),
    );
    observer.observe(host.current!);
    return () => observer.disconnect();
  }, []);
  const values = series.flatMap((p) => (p.value === null ? [] : [p.value]));
  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 1;
  const padding = Math.max(
    (hi - lo) * 0.2,
    metric === "temperature" ? 2 : hi * 0.04,
    1,
  );
  const min = Math.max(0, lo - padding),
    max = hi + padding;
  const height = compact ? 100 : 132;
  const left = 40,
    right = width - 12,
    top = 16,
    bottom = height - 22;
  const x = (t: number) => left + (t / 120) * (right - left);
  const y = (v: number) => bottom - ((v - min) / (max - min)) * (bottom - top);
  let path = "",
    connected = false;
  for (const point of series) {
    if (point.time > time) break;
    if (point.value === null) {
      connected = false;
      continue;
    }
    path += `${connected ? "L" : "M"}${x(point.time).toFixed(1)},${y(point.value).toFixed(1)} `;
    connected = true;
  }
  const text = (v: number) =>
    metric === "power" && hi >= 1000
      ? `${(v / 1000).toFixed(1)}k`
      : v.toFixed(metric === "temperature" ? 1 : 0);
  return (
    <div ref={host} className={`review-trend ${metric}`}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={id}
        onClick={
          onSeek
            ? (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                onSeek(
                  Math.round(
                    Math.max(
                      0,
                      Math.min(
                        120,
                        ((((e.clientX - rect.left) / rect.width) * width -
                          left) /
                          (right - left)) *
                          120,
                      ),
                    ),
                  ),
                );
              }
            : undefined
        }
      >
        <title
          id={id}
        >{`所选对象${metric === "temperature" ? "温度" : "功耗"}趋势，显示至第 ${time} 秒；空缺不按零值连线。`}</title>
        {[min, (min + max) / 2, max].map((t) => (
          <g key={t}>
            <line x1={left} x2={right} y1={y(t)} y2={y(t)} />
            <text x={left - 6} y={y(t) + 3} textAnchor="end">
              {text(t)}
            </text>
          </g>
        ))}
        <text x={left} y={9}>
          {metric === "temperature" ? "°C" : "W"}
        </text>
        {[0, 60, 120].map((t) => (
          <text key={t} x={x(t)} y={height - 4} textAnchor="middle">
            {t}s
          </text>
        ))}
        <path d={path} className="review-series" />
        <line
          x1={x(time)}
          x2={x(time)}
          y1={top}
          y2={bottom}
          className="review-cursor"
        />
        {series[time]?.value !== null && (
          <circle cx={x(time)} cy={y(series[time]?.value ?? min)} r="3" />
        )}
      </svg>
    </div>
  );
}
