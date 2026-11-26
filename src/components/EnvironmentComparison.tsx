import {
  environmentComparison,
  environmentProbes,
  environmentValue,
} from "../environment-monitoring";
import { trendMetricNames } from "../trend-geometry";

export function EnvironmentComparison({
  id,
  time,
  open,
  onToggle,
  onPreview,
  onLocate,
  onAnalyzePair,
}: {
  id: string;
  time: number;
  open: boolean;
  onToggle: (value: boolean) => void;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  onAnalyzePair: (id: string) => void;
}) {
  const other = environmentProbes.find((probe) => probe.fixtureId !== id);
  const selected = environmentProbes.find((probe) => probe.fixtureId === id);
  if (!selected || !other) return null;
  const rows = environmentComparison(id, other.fixtureId, time)!;
  return (
    <section className="environment-comparison" aria-label="环境测点对照">
      <button
        className="environment-comparison-toggle"
        aria-expanded={open}
        onClick={() => onToggle(!open)}
      >
        {open ? "收起" : "展开"}测点对照
      </button>
      {open && (
        <>
          <p>t+{time}s · 所选 − 对照。仅比较两处固定点位的模拟读数。</p>
          <div className="environment-comparison-places">
            <div>
              <b>所选 · {selected.fixture.name}</b>
              <small>
                {selected.fixture.location} · 高{" "}
                {selected.fixture.position[1].toFixed(2)} m
              </small>
            </div>
            <div>
              <b>对照 · {other.fixture.name}</b>
              <small>
                {other.fixture.location} · 高{" "}
                {other.fixture.position[1].toFixed(2)} m
              </small>
            </div>
          </div>
          {rows.map((row) => (
            <div
              className="environment-comparison-row"
              key={row.metric}
              data-comparison-metric={row.metric}
            >
              <strong>{trendMetricNames[row.metric]}</strong>
              <div className="environment-comparison-values">
                {[row.left, row.right].map((reading, i) => (
                  <div key={i}>
                    <span>
                      {i ? "对照" : "所选"}{" "}
                      {environmentValue(
                        reading.value,
                        row.metric === "humidity" ? "%RH" : "°C",
                      )}
                    </span>
                    <small>
                      {reading.status}
                      {reading.observedAt !== null &&
                        ` · 采样 t+${reading.observedAt}s`}
                    </small>
                  </div>
                ))}
              </div>
              <p>
                差值{" "}
                <b>
                  {row.delta === null
                    ? "—"
                    : `${row.delta > 0 ? "+" : ""}${row.delta.toFixed(1)} ${row.unit}`}
                </b>{" "}
                · {row.reason}
              </p>
            </div>
          ))}
          <button
            className="environment-analysis-link"
            onClick={() => onAnalyzePair(other.fixtureId)}
          >
            对照两测点历史 →
          </button>
          <div className="environment-comparison-actions">
            <button onClick={() => onPreview(other.fixtureId)}>
              预览对照测点
            </button>
            <button onClick={() => onLocate(other.fixtureId)}>
              定位对照测点
            </button>
          </div>
          <p>
            差值不表示异常、区域梯度或凝露风险。无效或不同步时留空；露点仍为推导值。
          </p>
        </>
      )}
    </section>
  );
}
