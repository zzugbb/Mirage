import { useEffect, useId, useRef, useState } from "react";
import type { ReviewEvent, ReviewMetric, ReviewPoint } from "../review-model";
import {
  trendGeometry,
  trendLeft,
  trendRight,
  trendTimeAtX,
} from "../trend-geometry";

export function ReviewTrend({
  series,
  metric,
  time,
  compact = false,
  cursorTime = time,
  events = [],
  onInspect,
  onSeek,
}: {
  series: ReviewPoint[];
  metric: ReviewMetric;
  time: number;
  compact?: boolean;
  cursorTime?: number;
  events?: ReviewEvent[];
  onInspect?: (time: number | null) => void;
  onSeek?: (time: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(280),
    [height, setHeight] = useState(compact ? 100 : 82),
    id = useId();
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(180, entry.contentRect.width));
      setHeight(
        compact ? 100 : matchMedia("(max-width: 600px)").matches ? 110 : 82,
      );
    });
    observer.observe(host.current!);
    return () => observer.disconnect();
  }, [compact]);
  const chart = trendGeometry(series, metric, time, width, height);
  const cursor = Math.max(0, Math.min(time, cursorTime));
  const point = series[cursor];
  const pointerTime = (e: {
    clientX: number;
    currentTarget: SVGSVGElement;
  }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return trendTimeAtX(((e.clientX - rect.left) / rect.width) * width, width);
  };
  const markers = [
    ...new Set(
      events.filter((event) => event.time <= time).map((event) => event.time),
    ),
  ];
  return (
    <div ref={host} className={`review-trend ${metric}`}>
      {chart.empty && !onSeek ? (
        <div className="review-no-series" role="status" style={{ height }}>
          暂无有效观测数据
        </div>
      ) : (
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role={onSeek ? "slider" : "img"}
          tabIndex={onSeek ? 0 : undefined}
          aria-label={
            onSeek
              ? `${metric === "temperature" ? "温度" : "功耗"}曲线时间`
              : undefined
          }
          aria-labelledby={onSeek ? undefined : id}
          aria-describedby={onSeek ? id : undefined}
          aria-valuemin={onSeek ? 0 : undefined}
          aria-valuemax={onSeek ? 120 : undefined}
          aria-valuenow={onSeek ? time : undefined}
          aria-valuetext={onSeek ? `t+${time}秒` : undefined}
          onPointerMove={
            onInspect
              ? (e) => {
                  if (e.pointerType === "mouse")
                    onInspect(Math.min(time, pointerTime(e)));
                }
              : undefined
          }
          onPointerLeave={onInspect ? () => onInspect(null) : undefined}
          onClick={
            onSeek
              ? (e) => {
                  onInspect?.(null);
                  onSeek(pointerTime(e));
                }
              : undefined
          }
          onKeyDown={
            onSeek
              ? (e) => {
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? 120
                        : e.key === "ArrowLeft" || e.key === "ArrowDown"
                          ? time - (e.shiftKey ? 5 : 1)
                          : e.key === "ArrowRight" || e.key === "ArrowUp"
                            ? time + (e.shiftKey ? 5 : 1)
                            : null;
                  if (next !== null) {
                    e.preventDefault();
                    onInspect?.(null);
                    onSeek(Math.max(0, Math.min(120, next)));
                  }
                }
              : undefined
          }
        >
          <title
            id={id}
          >{`所选对象${metric === "temperature" ? "温度" : "功耗"}趋势，显示至第 ${time} 秒；空缺不按零值连线。${onSeek ? "点击回看；左右方向键逐秒移动，Shift 加速，Home/End 跳至起止。" : ""}`}</title>
          {!chart.empty && (
            <>
              {chart.ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={trendLeft}
                    x2={width - trendRight}
                    y1={chart.y(t)}
                    y2={chart.y(t)}
                  />
                  <text x={trendLeft - 7} y={chart.y(t) + 3} textAnchor="end">
                    {chart.text(t)}
                  </text>
                </g>
              ))}
              <text x={trendLeft} y={9}>
                {chart.unit}
              </text>
            </>
          )}
          {markers.map((t) => (
            <line
              key={t}
              className="review-event-guide"
              x1={chart.x(t)}
              x2={chart.x(t)}
              y1={chart.top}
              y2={chart.bottom}
            />
          ))}
          {[0, 60, 120].map((t) => (
            <text key={t} x={chart.x(t)} y={height - 3} textAnchor="middle">
              {t}s
            </text>
          ))}
          <path d={chart.path} className="review-series" />
          <line
            className="review-cursor"
            x1={chart.x(time)}
            x2={chart.x(time)}
            y1={chart.top}
            y2={chart.bottom}
          />
          {cursor !== time && (
            <line
              className="review-hover-cursor"
              x1={chart.x(cursor)}
              x2={chart.x(cursor)}
              y1={chart.top}
              y2={chart.bottom}
            />
          )}
          {point?.value != null && (
            <circle cx={chart.x(cursor)} cy={chart.y(point.value)} r="3" />
          )}
          {chart.empty && (
            <text
              className="review-empty-chart"
              x={(trendLeft + width - trendRight) / 2}
              y={height / 2}
              textAnchor="middle"
            >
              暂无有效观测数据
            </text>
          )}
        </svg>
      )}
    </div>
  );
}
