import { PeakSourceProcess, peakNames } from "./PeakSourceProcess";
import type { PeakProcessState } from "../peak-provenance";
import { useState, type Ref, type ReactNode } from "react";
import type { ReviewEvent, ReviewMetric, ReviewPoint } from "../review-model";
import { qualityNames } from "../status";
import { ReviewTrend } from "./ReviewTrend";
import type { TrendMetric } from "../trend-geometry";
import { AnalysisEvents } from "./AnalysisEvents";

export function ReviewAnalysis({
  title,
  peakProcess,
  evidence,
  labels,
  histories,
  events,
  eventHeading,
  time,
  playbackRate,
  component,
  powerOnly = false,
  cooling,
  onLocateDevice,
  onViewDeviceAirflow,
  ready,
  onSeek,
  onReplay,
  onRate,
  onClose,
}: {
  evidence?: ReactNode;
  peakProcess?: {
    state: PeakProcessState;
    onChange: (state: PeakProcessState) => void;
    onPreview: (id: string) => void;
  };
  title: string;
  labels: Record<ReviewMetric, string>;
  histories: Record<ReviewMetric, ReviewPoint[]>;
  events: ReviewEvent[];
  eventHeading: Ref<HTMLHeadingElement>;
  time: number;
  playbackRate: 1 | 2 | 4;
  component: boolean;
  powerOnly?: boolean;
  cooling?: ReviewPoint[];
  onLocateDevice?: (id: string) => void;
  onViewDeviceAirflow: (id: string) => void;
  ready: boolean;
  onSeek: (time: number) => void;
  onReplay: () => void;
  onRate: (rate: 1 | 2 | 4) => void;
  onClose: () => void;
}) {
  const [inspection, setInspection] = useState<number | null>(null);
  const cursor = Math.min(time, inspection ?? time);
  const series: {
    metric: TrendMetric;
    label: string;
    points: ReviewPoint[];
  }[] = cooling
    ? [
        { metric: "cooling", label: "演示冷却输入", points: cooling },
        {
          metric: "temperature",
          label: "关联设备最高进风",
          points: histories.temperature,
        },
      ]
    : (powerOnly
        ? ["power" as const]
        : (["temperature", "power"] as const)
      ).map((metric) => ({
        metric,
        label: labels[metric],
        points: histories[metric],
      }));
  return (
    <section className="review-analysis" aria-label="时间分析">
      <div className="review-analysis-head">
        <strong>
          {title}
          <small>
            {cooling
              ? "冷却输入与关联进风"
              : powerOnly
                ? "关联整机输入 · 非设施计量"
                : "温度与功耗"}
          </small>
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
          {series.map(({ metric, label, points }) => {
            const point = points[cursor],
              value = point?.value ?? null;
            const kilo = metric === "power" && value !== null && value >= 1000;
            const unit =
              metric === "cooling"
                ? "%"
                : metric === "temperature"
                  ? "°C"
                  : kilo
                    ? "kW"
                    : "W";
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
                  <span>{label}</span>
                  <strong>
                    {value === null
                      ? "—"
                      : (kilo ? value / 1000 : value).toFixed(kilo ? 2 : 1)}
                    <small>{unit}</small>
                  </strong>
                  <small>
                    {metric === "cooling" ? "模拟输入 · 非制冷量" : status}
                  </small>
                </div>
                {metric === "temperature" && point?.peakSources && (
                  <small className="peak-source-cursor">
                    {inspection === null
                      ? "当前最高来源"
                      : `游标 t+${cursor}s 来源`}{" "}
                    · {peakNames(point.peakSources)}
                  </small>
                )}
                <ReviewTrend
                  series={points}
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
          {cooling && (
            <p className="cooling-analysis-boundary">
              输入百分比用于驱动演示温度响应，不是风量或设施功率。最高进风仅取有效设备，覆盖变化也会影响曲线；相关事件不等于已证实根因。
            </p>
          )}
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
            <small>点击或横拖回看 · 空缺保留</small>
          </div>
        </div>
        {peakProcess && (
          <PeakSourceProcess
            points={histories.temperature}
            time={time}
            state={peakProcess.state}
            onChange={peakProcess.onChange}
            onPreview={peakProcess.onPreview}
            onSeek={(target) => {
              setInspection(null);
              onSeek(target);
            }}
          />
        )}
        {evidence}
        <AnalysisEvents
          title={
            cooling
              ? "输入与关联设备事件"
              : powerOnly
                ? "关联设备事件"
                : component
                  ? "所属设备事件"
                  : "已发生事件"
          }
          events={events}
          headingRef={eventHeading}
          time={time}
          onLocateDevice={onLocateDevice}
          onViewDeviceAirflow={onViewDeviceAirflow}
          ready={ready}
          onSeek={(target) => {
            setInspection(null);
            onSeek(target);
          }}
        />
      </div>
    </section>
  );
}
