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
  onMetric,
  onSeek,
  onPreview,
  onLocate,
  onReturn,
  onClose,
}: {
  pair: EnvironmentPair;
  metric: EnvironmentMetric;
  time: number;
  selected: string;
  ready: boolean;
  onMetric: (metric: EnvironmentMetric) => void;
  onSeek: (time: number) => void;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  onReturn: () => void;
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
      <p>
        {inspection === null
          ? `场景 t+${time}s`
          : `游标 t+${cursor}s · 场景 t+${time}s`}{" "}
        · 固定点位模拟
      </p>
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
            <div
              key={probe.fixtureId}
              className={index ? "pair-reference" : "pair-primary"}
              aria-current={selected === probe.fixtureId ? "true" : undefined}
            >
              <small>{index ? "② 对照 · 虚线" : "① 起点 · 实线"}</small>
              <strong>{probe.fixture.name}</strong>
              <small>{probe.fixture.location}</small>
              <b>{environmentValue(reading.value, unit)}</b>
              <small>
                {reading.status} ·{" "}
                {reading.observedAt === null
                  ? "无可用采样"
                  : `采样 t+${reading.observedAt}s`}
              </small>
              <div>
                <button
                  aria-label={`预览对照测点 ${probe.fixture.name}`}
                  aria-pressed={selected === probe.fixtureId}
                  onClick={() => onPreview(probe.fixtureId)}
                >
                  预览
                </button>
                <button
                  disabled={!ready}
                  aria-label={`定位对照测点 ${probe.fixture.name}`}
                  onClick={() => onLocate(probe.fixtureId)}
                >
                  定位
                </button>
              </div>
            </div>
          );
        })}
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
      <p>
        两条曲线共用刻度，只绘制已发生的有效观测；无效处断开，不补零。采样不同步时仍可分别查看读数，但不计算差值。露点为推导值，不是独立测点。
      </p>
      <p>
        预览保留镜头和结构，定位沿用安全归位。点位差异不代表区域梯度、异常阈值或凝露风险。
      </p>
      <button className="environment-pair-return" onClick={onReturn}>
        ← 返回起点测点
      </button>
    </section>
  );
}
