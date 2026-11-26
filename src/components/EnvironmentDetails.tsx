import { EnvironmentComparison } from "./EnvironmentComparison";
import { EnvironmentProcess } from "./EnvironmentProcess";
import { useState, type ReactNode } from "react";
import {
  environmentHistories,
  environmentObservation,
  environmentProbes,
  environmentQuality,
  environmentSettings,
  environmentValue,
} from "../environment-monitoring";
import type { EnvironmentMetric } from "../environment-monitoring";
import { trendMetricNames } from "../trend-geometry";
import type { RoomFixture } from "../fixtures";
import { FixtureDetails } from "./FixtureDetails";
import { ReviewTrend } from "./ReviewTrend";

export function EnvironmentProbeList({
  time,
  selected,
  onSelect,
}: {
  time: number;
  selected: string;
  onSelect: (id: string, enter?: boolean) => void;
}) {
  return (
    <div className="environment-probes" aria-label="环境测点列表">
      {environmentProbes.map(({ fixture }) => {
        const reading = environmentObservation(fixture.id, time)!;
        return (
          <div key={fixture.id}>
            <button
              aria-pressed={selected === fixture.id}
              onClick={() => onSelect(fixture.id)}
            >
              <b>{fixture.name}</b>
              <small>
                {environmentValue(reading.temperature.value, "°C")} ·{" "}
                {environmentValue(reading.humidity.value, "%RH")}
              </small>
              <small>
                温度{environmentQuality[reading.temperature.quality]} · 湿度
                {environmentQuality[reading.humidity.quality]}
              </small>
            </button>
            <button
              aria-label={`定位${fixture.name}`}
              onClick={() => onSelect(fixture.id, true)}
            >
              定位
            </button>
          </div>
        );
      })}
      <small>固定点位 · 模拟。只代表探头位置，不插值覆盖机房。</small>
    </div>
  );
}

export function EnvironmentDetails({
  fixture,
  time,
  analysis = false,
  comparisonOpen,
  onComparisonToggle,
  onSeek,
  onAnalyze,
  onPreview,
  onLocate,
  onAnalyzePair,
  mountAction,
}: {
  fixture: RoomFixture;
  time: number;
  analysis?: boolean;
  comparisonOpen: boolean;
  onComparisonToggle: (value: boolean) => void;
  onSeek: (time: number) => void;
  onAnalyze: () => void;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  onAnalyzePair: (id: string) => void;
  mountAction?: ReactNode;
}) {
  const [previewMetric, setPreviewMetric] = useState<
    "ambientTemperature" | "humidity"
  >("ambientTemperature");
  const [inspection, setInspection] = useState<number | null>(null);
  const cursor = analysis ? Math.min(time, inspection ?? time) : time;
  const observation = environmentObservation(fixture.id, cursor)!;
  const histories = environmentHistories(fixture.id)!;
  return (
    <section className="environment-details" aria-label="环境测点观测">
      <div className={analysis ? "review-comparison" : "environment-readings"}>
        {(
          ["ambientTemperature", "humidity", "dewPoint"] as EnvironmentMetric[]
        ).map((metric) => {
          const derived = metric === "dewPoint";
          const channel =
            metric === "ambientTemperature"
              ? observation.temperature
              : observation.humidity;
          const value = derived ? observation.dewPoint.value : channel.value;
          const unit = metric === "humidity" ? "%RH" : "°C";
          return (
            <div
              key={metric}
              className={`review-compare-metric ${metric}`}
              data-environment-metric={metric}
            >
              <div className="review-compare-reading">
                <span>{trendMetricNames[metric]}</span>
                <strong>{environmentValue(value, unit)}</strong>
                <small>
                  {derived
                    ? value === null
                      ? "暂不推导"
                      : `同次采样推导 · t+${observation.temperature.observedAt}s`
                    : channel.quality === "valid"
                      ? `采样 t+${channel.observedAt}s`
                      : environmentQuality[channel.quality]}
                </small>
              </div>
              {!derived &&
                channel.quality !== "valid" &&
                channel.lastValue !== null && (
                  <p className="environment-last">
                    最后观测 {environmentValue(channel.lastValue, unit)} · t+
                    {channel.observedAt}s，非当前值
                  </p>
                )}
              {analysis && (
                <ReviewTrend
                  series={histories[metric]}
                  metric={metric}
                  time={time}
                  cursorTime={cursor}
                  onInspect={setInspection}
                  onSeek={onSeek}
                />
              )}
            </div>
          );
        })}
      </div>
      {observation.dewPoint.value === null && (
        <p className="environment-boundary">{observation.dewPoint.reason}</p>
      )}
      {!analysis && (
        <div className="environment-preview">
          <div role="group" aria-label="环境变化趋势">
            {(["ambientTemperature", "humidity"] as const).map((metric) => (
              <button
                key={metric}
                aria-pressed={previewMetric === metric}
                onClick={() => setPreviewMetric(metric)}
              >
                {trendMetricNames[metric]}
              </button>
            ))}
          </div>
          <ReviewTrend
            series={histories[previewMetric]}
            metric={previewMetric}
            time={time}
          />
        </div>
      )}
      {!analysis && (
        <button className="environment-analysis-link" onClick={onAnalyze}>
          回看温湿度与露点 →
        </button>
      )}
      {mountAction}
      {analysis && (
        <EnvironmentProcess
          key={fixture.id}
          id={fixture.id}
          time={time}
          onSeek={onSeek}
        />
      )}
      <EnvironmentComparison
        id={fixture.id}
        time={cursor}
        open={comparisonOpen}
        onToggle={onComparisonToggle}
        onAnalyzePair={onAnalyzePair}
        onPreview={onPreview}
        onLocate={onLocate}
      />
      <details className="environment-definition">
        <summary>位置与数据定义</summary>
        <p>
          固定安装点位，每 {environmentSettings.sampleSeconds}{" "}
          秒采样；距最后采样超过 {environmentSettings.maxAgeSeconds}{" "}
          秒标为过期。温湿度分别判断质量，离线时不显示当前值。
        </p>
        <p>
          露点采用水面 Magnus 近似，仅在温度 0–60°C、0&lt;RH≤100%、结果不低于
          0°C 时推导。不推导霜点；没有表面温度，不能判断凝露。
        </p>
        <p>曲线缺口表示无有效观测。环境点位未配置告警阈值。</p>
        <FixtureDetails
          fixture={fixture}
          onPreview={onPreview}
          onLocate={onLocate}
        />
      </details>
    </section>
  );
}
