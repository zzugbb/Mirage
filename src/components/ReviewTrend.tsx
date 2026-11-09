import { useEffect, useId, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { beginTrendScrub, moveTrendScrub } from "../trend-scrub";
import type { TrendScrub } from "../trend-scrub";
import type { ReviewEvent, ReviewPoint } from "../review-model";
import type { TrendMetric } from "../trend-geometry";
import {
  trendGeometry,
  trendLeft,
  trendRight,
  trendTimeAtX,
  trendMetricNames,
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
  comparison,
  seriesLabel,
}: {
  comparison?: { series: ReviewPoint[]; label: string };
  seriesLabel?: string;
  series: ReviewPoint[];
  metric: TrendMetric;
  time: number;
  compact?: boolean;
  cursorTime?: number;
  events?: ReviewEvent[];
  onInspect?: (time: number | null) => void;
  onSeek?: (time: number) => void;
}) {
  const compared = !!comparison;
  const scrub = useRef<TrendScrub | null>(null);
  const host = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(280),
    [height, setHeight] = useState(compared ? 140 : compact ? 100 : 82),
    id = useId();
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(180, entry.contentRect.width));
      setHeight(
        compared
          ? 140
          : compact
            ? 100
            : matchMedia("(max-width: 600px)").matches
              ? 110
              : 82,
      );
    });
    observer.observe(host.current!);
    return () => observer.disconnect();
  }, [compact, compared]);
  const chart = trendGeometry(
    series,
    metric,
    time,
    width,
    height,
    comparison?.series,
  );
  const secondChart = comparison
    ? trendGeometry(comparison.series, metric, time, width, height, series)
    : null;
  const cursor = Math.max(0, Math.min(time, cursorTime));
  const point = series[cursor];
  const secondPoint = comparison?.series[cursor];
  const pointerTime = (e: {
    clientX: number;
    currentTarget: SVGSVGElement;
  }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return trendTimeAtX(((e.clientX - rect.left) / rect.width) * width, width);
  };
  const clearScrub = (e: PointerEvent<SVGSVGElement>) => {
    if (scrub.current?.pointerId !== e.pointerId) return;
    scrub.current = null;
    onInspect?.(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const moveScrub = (e: PointerEvent<SVGSVGElement>, ending = false) => {
    if (!scrub.current || scrub.current.pointerId !== e.pointerId) return;
    const next = moveTrendScrub(scrub.current, e, pointerTime(e), ending);
    scrub.current = next.scrub;
    if (next.seek !== null) {
      e.currentTarget.focus({ preventScroll: true });
      onInspect?.(null);
      onSeek?.(next.seek);
    }
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
              ? `${seriesLabel ?? trendMetricNames[metric]}曲线时间`
              : undefined
          }
          aria-labelledby={onSeek ? undefined : id}
          aria-describedby={onSeek ? id : undefined}
          aria-valuemin={onSeek ? 0 : undefined}
          aria-valuemax={onSeek ? 120 : undefined}
          aria-valuenow={onSeek ? time : undefined}
          aria-valuetext={onSeek ? `t+${time}秒` : undefined}
          onPointerDown={
            onSeek
              ? (e) => {
                  if (!e.isPrimary || e.button !== 0 || scrub.current) return;
                  const next = beginTrendScrub(
                    e,
                    e.pointerType === "touch",
                    pointerTime(e),
                  );
                  scrub.current = next;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  onInspect?.(null);
                  if (next.lastTime !== null) {
                    e.currentTarget.focus({ preventScroll: true });
                    onSeek(next.lastTime);
                  }
                }
              : undefined
          }
          onPointerMove={(e) => {
            if (scrub.current) moveScrub(e);
            else if (e.pointerType === "mouse" && e.buttons === 0)
              onInspect?.(Math.min(time, pointerTime(e)));
          }}
          onPointerUp={(e) => {
            moveScrub(e, true);
            clearScrub(e);
          }}
          onPointerCancel={clearScrub}
          onLostPointerCapture={clearScrub}
          onPointerLeave={() => {
            if (!scrub.current) onInspect?.(null);
          }}
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
          >{`${seriesLabel ?? `所选对象${trendMetricNames[metric]}`}趋势，显示至第 ${time} 秒；空缺不按零值连线。${comparison ? `${comparison.label} 为基准虚线，两条曲线共用刻度。` : ""}${onSeek ? "点击或横向拖动回看；左右方向键逐秒移动，Shift 加速，Home/End 跳至起止。" : ""}`}</title>
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
          {secondChart && (
            <path
              d={secondChart.path}
              className="review-series comparison-series"
            />
          )}
          {secondPoint?.quality === "valid" &&
            secondPoint.value !== null &&
            Number.isFinite(secondPoint.value) &&
            secondChart && (
              <circle
                className="comparison-point"
                cx={chart.x(cursor)}
                cy={secondChart.y(secondPoint.value)}
                r="3"
              />
            )}
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
          {point?.quality === "valid" &&
            point.value != null &&
            Number.isFinite(point.value) && (
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
