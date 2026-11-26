import { EnvironmentComparability } from "./EnvironmentComparability";
import type { ComparabilityReview } from "../environment-comparability";
import type { EnvironmentInspection } from "../environment-view";
import { useEffect, useRef, useState } from "react";
import type { EnvironmentPair } from "../environment-pair";
import {
  environmentComparison,
  environmentHistories,
  environmentProbe,
  environmentValue,
  type EnvironmentMetric,
} from "../environment-monitoring";
import { trendMetricNames } from "../trend-geometry";
import { ReviewTrend } from "./ReviewTrend";

export function EnvironmentPairAnalysis({
  pair,
  metric,
  time,
  selected,
  ready,
  inspection: viewInspection,
  inRoom,
  comparability,
  onComparability,
  onMetric,
  onSeek,
  onPreview,
  onLocate,
  onClose,
}: {
  pair: EnvironmentPair;
  metric: EnvironmentMetric;
  time: number;
  selected: string;
  ready: boolean;
  inspection: EnvironmentInspection | null;
  inRoom: boolean;
  comparability: ComparabilityReview;
  onComparability: (state: ComparabilityReview) => void;
  onMetric: (metric: EnvironmentMetric) => void;
  onSeek: (time: number) => void;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  onClose: () => void;
}) {
  const heading = useRef<HTMLElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  const [inspection, setInspection] = useState<number | null>(null);
  const cursor = Math.min(time, inspection ?? time);
  const row = environmentComparison(pair.firstId, pair.secondId, cursor)!.find(
    (row) => row.metric === metric,
  )!;
  const first = environmentProbe(pair.firstId)!,
    second = environmentProbe(pair.secondId)!;
  const unit = metric === "humidity" ? "%RH" : "°C";
  return (
    <section
      ref={heading}
      tabIndex={-1}
      className="environment-pair-analysis"
      aria-label="双测点时间对照"
    >
      <header>
        <strong>双测点时间对照</strong>
        <button onClick={onClose}>单测点分析</button>
      </header>
      <p>固定点位 · 模拟</p>
      <div
        className="environment-pair-metrics"
        role="group"
        aria-label="双测点对照指标"
      >
        {(
          ["ambientTemperature", "humidity", "dewPoint"] as EnvironmentMetric[]
        ).map((value) => (
          <button
            key={value}
            aria-pressed={metric === value}
            onClick={() => onMetric(value)}
          >
            {trendMetricNames[value]}
          </button>
        ))}
      </div>
      <div className="environment-pair-readings">
        {[first, second].map((probe, index) => {
          const reading = index ? row.right : row.left;
          return (
            <button
              key={probe.fixtureId}
              className={index ? "pair-reference" : "pair-primary"}
              data-environment-preview={probe.fixtureId}
              aria-label={`预览对照测点 ${probe.fixture.name}`}
              aria-describedby={`pair-reading-${probe.fixtureId}`}
              aria-pressed={selected === probe.fixtureId}
              onClick={() => onPreview(probe.fixtureId)}
            >
              <small>{index ? "② 对照" : "① 起点"}</small>
              <strong>{probe.fixture.name}</strong>
              <span id={`pair-reading-${probe.fixtureId}`}>
                <small>{probe.fixture.location}</small>
                <b>{environmentValue(reading.value, unit)}</b>
                <small>
                  {reading.status}
                  {reading.observedAt !== null &&
                    ` · 采样 t+${reading.observedAt}s`}
                </small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="environment-pair-location">
        <button disabled={!ready} onClick={() => onLocate(selected)}>
          定位
          {selected === first.fixtureId
            ? first.fixture.name
            : second.fixture.name}
        </button>
        {!inRoom && <small>定位到机房后可同框观察</small>}
      </div>
      <div className="environment-pair-delta">
        <span>① − ②</span>
        <strong>
          {row.delta === null
            ? "—"
            : `${row.delta > 0 ? "+" : ""}${row.delta.toFixed(1)} ${row.unit}`}
        </strong>
        <small>{row.reason}</small>
      </div>
      <ReviewTrend
        series={environmentHistories(pair.firstId)![metric]}
        comparison={{
          series: environmentHistories(pair.secondId)![metric],
          label: second.fixture.name,
        }}
        metric={metric}
        seriesLabel={`双测点${trendMetricNames[metric]}`}
        time={time}
        cursorTime={cursor}
        onInspect={setInspection}
        onSeek={onSeek}
      />
      <EnvironmentComparability
        pair={pair}
        metric={metric}
        time={time}
        state={comparability}
        onChange={onComparability}
        onSeek={onSeek}
      />
      <details className="environment-pair-notes">
        <summary>读数与点位说明</summary>
        {viewInspection && (
          <p>
            配置直线间距 {viewInspection.distance.toFixed(2)}{" "}
            m。相对机房地面（Y=0）的中心高度：
            {viewInspection.probes
              .map(
                (probe, index) =>
                  `${index ? "②" : "①"} ${probe.point.y.toFixed(2)} m`,
              )
              .join("，")}
            。 竖线标示安装高度，覆盖范围和布线长度未知。
          </p>
        )}
        <p>
          实线为起点，虚线为对照。两侧采样都有效且同秒才计算差值。曲线保留无效读数的空缺。
        </p>
        <p>露点由点位温湿度推导。点位差异不能判断区域梯度或凝露风险。</p>
      </details>
    </section>
  );
}
