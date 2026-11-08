import { EnvironmentComparison } from "./EnvironmentComparison";
import { EnvironmentProcess } from "./EnvironmentProcess";
import { useState } from "react";
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
      <div className="environment-time">
        {inspection === null || !analysis
          ? `观测 t+${time}s`
          : `游标 t+${cursor}s · 场景 t+${time}s`}{" "}
        · 演示序列
      </div>
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
                      : "推导值 · 非独立测点"
                    : `${environmentQuality[channel.quality]} · ${channel.observedAt === null ? "尚无采样" : `采样 t+${channel.observedAt}s`}`}
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
      <p className="environment-boundary">{observation.dewPoint.reason}</p>
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
      {analysis && (
        <p className="environment-boundary">
          曲线只绘制已发生的观测；空缺表示没有可用值。悬停核对同一秒，点击或拖动回看。未定义环境阈值，不生成告警或凝露风险判断。
        </p>
      )}
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
        <FixtureDetails
          fixture={fixture}
          onPreview={onPreview}
          onLocate={onLocate}
        />
      </details>
    </section>
  );
}
