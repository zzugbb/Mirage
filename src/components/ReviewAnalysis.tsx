import { useState } from "react";
import type { ReviewEvent, ReviewMetric, ReviewPoint } from "../review-model";
import { qualityNames } from "../status";
import { ReviewTrend } from "./ReviewTrend";
const eventLabels = {
  input: "输入",
  raised: "预警",
  escalated: "升级",
  downgraded: "降级",
  recovered: "恢复",
};

export function ReviewAnalysis({
  title,
  labels,
  histories,
  events,
  time,
  playbackRate,
  component,
  onSeek,
  onReplay,
  onRate,
  onClose,
}: {
  title: string;
  labels: Record<ReviewMetric, string>;
  histories: Record<ReviewMetric, ReviewPoint[]>;
  events: ReviewEvent[];
  time: number;
  playbackRate: 1 | 2 | 4;
  component: boolean;
  onSeek: (time: number) => void;
  onReplay: () => void;
  onRate: (rate: 1 | 2 | 4) => void;
  onClose: () => void;
}) {
  const [inspection, setInspection] = useState<number | null>(null);
  const cursor = Math.min(time, inspection ?? time);
  return (
    <section className="review-analysis" aria-label="时间分析">
      <div className="review-analysis-head">
        <strong>
          {title}
          <small>温度与功耗</small>
        </strong>
        <span>
          {inspection === null
            ? `回看 t+${time}s`
            : `游标 t+${cursor}s · 场景 t+${time}s`}
        </span>
        <button aria-label="关闭时间分析" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="review-analysis-body">
        <div className="review-comparison">
          {(["temperature", "power"] as const).map((metric) => {
            const point = histories[metric][cursor],
              value = point?.value ?? null;
            const kilo = metric === "power" && value !== null && value >= 1000;
            const unit = metric === "temperature" ? "°C" : kilo ? "kW" : "W";
            const status =
              !point || point.quality !== "valid"
                ? qualityNames[point?.quality ?? "missing"]
                : value === null
                  ? "无有效值"
                  : point.count > 1
                    ? `有效覆盖 ${point.coverage}/${point.count}`
                    : "有效";
            return (
              <div className={`review-compare-metric ${metric}`} key={metric}>
                <div className="review-compare-reading">
                  <span>{labels[metric]}</span>
                  <strong>
                    {value === null
                      ? "—"
                      : (kilo ? value / 1000 : value).toFixed(kilo ? 2 : 1)}
                    <small>{unit}</small>
                  </strong>
                  <small>{status}</small>
                </div>
                <ReviewTrend
                  series={histories[metric]}
                  metric={metric}
                  time={time}
                  cursorTime={cursor}
                  events={events}
                  onInspect={setInspection}
                  onSeek={onSeek}
                />
              </div>
            );
          })}
          <div className="review-playback">
            <button onClick={onReplay}>重新播放</button>
            <label>
              速度{" "}
              <select
                aria-label="模拟播放速度"
                value={playbackRate}
                onChange={(e) => onRate(Number(e.target.value) as 1 | 2 | 4)}
              >
                {[1, 2, 4].map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}×
                  </option>
                ))}
              </select>
            </label>
            <small>点击曲线回看 · 空缺保留</small>
          </div>
        </div>
        <div className="review-events">
          <h3>
            {component ? "所属设备事件" : "已发生事件"}
            <span>{events.length}</span>
          </h3>
          {events.length ? (
            events.map((event) => (
              <button
                key={event.id}
                data-event-kind={event.kind}
                aria-pressed={event.time === cursor}
                title={event.detail}
                onClick={() => {
                  setInspection(null);
                  onSeek(event.time);
                }}
              >
                <time>{event.time}s</time>
                <span>
                  <i>{eventLabels[event.kind]}</i>
                  {event.title}
                  <small>
                    {event.kind === "input"
                      ? "场景输入"
                      : event.deviceIds.join("、").toUpperCase()}
                  </small>
                </span>
              </button>
            ))
          ) : (
            <p>当前范围没有已发生事件</p>
          )}
        </div>
      </div>
    </section>
  );
}
