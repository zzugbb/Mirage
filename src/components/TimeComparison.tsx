import { useRef } from "react";
import { compareTimes } from "../time-comparison";
import type { ReviewPoint } from "../review-model";
import type { TrendMetric } from "../trend-geometry";
import { qualityNames } from "../status";
import { useResultFocusFallback } from "../use-result-focus-fallback";

export function TimeComparison({
  series,
  time,
  cursor,
  reference,
  onReference,
  onSeek,
  component,
}: {
  series: { metric: TrendMetric; label: string; points: ReviewPoint[] }[];
  time: number;
  cursor: number;
  reference: number | null;
  onReference: (time: number | null) => void;
  onSeek: (time: number) => void;
  component: boolean;
}) {
  const start = useRef<HTMLButtonElement>(null);
  const watchReference = useResultFocusFallback(start);
  const unit = (metric: TrendMetric) =>
    metric === "power" ? "W" : metric === "cooling" ? "%" : "°C";
  const value = (n: number | null) => (n === null ? "—" : n.toFixed(1));
  const quality = (point: ReviewPoint | undefined) =>
    !point || point.quality !== "valid"
      ? qualityNames[point?.quality ?? "missing"]
      : point.value === null
        ? "无有效值"
        : `有效 ${point.coverage}/${point.count}`;
  return (
    <section className="time-comparison" aria-label="固定时刻对照">
      <div className="time-comparison-actions">
        <button
          ref={start}
          aria-pressed={reference !== null}
          onClick={() => onReference(time)}
        >
          {reference === null ? "固定当前时刻对照" : "改用当前时刻为基准"}
        </button>
        {reference !== null && (
          <button
            ref={watchReference}
            onClick={() => {
              onReference(null);
              start.current?.focus();
            }}
          >
            结束时刻对照
          </button>
        )}
      </div>
      {reference !== null && (
        <>
          <p>
            基准 {reference}s → {cursor === time ? "场景" : "游标"} {cursor}s ·
            差值为后者减基准
          </p>
          <button
            ref={watchReference}
            onClick={() => {
              onSeek(reference);
              start.current?.focus({ preventScroll: true });
            }}
          >
            返回基准时刻 {reference}s
          </button>
          {series.map(({ metric, label, points }) => {
            const row = compareTimes(points, reference, cursor);
            return (
              <article key={metric}>
                <strong>
                  {label} · {unit(metric)}
                </strong>
                <div className="time-comparison-values">
                  <span>
                    基准 <b>{value(row.reference)}</b>
                    <small>{quality(row.first)}</small>
                  </span>
                  <span>
                    对照 <b>{value(row.current)}</b>
                    <small>{quality(row.second)}</small>
                  </span>
                  <span>
                    {metric === "cooling" ? "差值（百分点）" : "差值"}{" "}
                    <b>
                      {row.difference !== null && row.difference > 0 ? "+" : ""}
                      {value(row.difference)}
                    </b>
                    <small>
                      {row.difference === null ? "两端需有效" : "有效读数之差"}
                    </small>
                  </span>
                </div>
                {row.coverageChanged && (
                  <small>
                    有效覆盖已变化。
                    {(row.first?.count ?? 0) > 1
                      ? "汇总差值包含输入集合变化。"
                      : "请核对两端数据质量。"}
                  </small>
                )}
              </article>
            );
          })}
          <p>
            {component ? "部件为模型推导。" : "读数沿用当前对象口径。"}
            缺失、过期和离线不补零；差值不等于异常、节能或因果结论。回看保留姿态；换对象、关闭分析、重播或固定画面结束对照。基准晚于当前场景时仅保留已核对读数，不补画未来曲线。
          </p>
        </>
      )}
    </section>
  );
}
