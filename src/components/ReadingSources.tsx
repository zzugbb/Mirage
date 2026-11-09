import { budgetRatio } from "../power-budget";
import { PowerBudgetSummary } from "./PowerBudgetSummary";
import { useEffect, useRef } from "react";
import {
  matchingSourceRows,
  sourceValue,
  type ReadingSources as Sources,
  type SourceCheck,
  type SourceMetric,
} from "../reading-sources";

export function ReadingSources({
  sources,
  sourceName,
  metrics,
  check,
  time,
  onChange,
  onClose,
  onPreview,
  onInteract,
}: {
  sources: Sources;
  sourceName: string;
  metrics: SourceMetric[];
  check: SourceCheck | null;
  time: number;
  onChange: (check: SourceCheck) => void;
  onClose: () => void;
  onPreview: (id: string) => void;
  onInteract: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const opened = !!check;
  useEffect(() => {
    if (opened) {
      root.current?.scrollIntoView({ block: "nearest" });
      root.current?.focus({ preventScroll: true });
    }
  }, [opened]);
  const current: SourceCheck = check ?? {
    sourceId: sources.sourceId,
    metric: sources.metric,
    group: sources.excluded ? "excluded" : "included",
    query: "",
  };
  const rows = matchingSourceRows(sources, current);
  const metricName = sources.metric === "temperature" ? "进风" : "功耗";
  return (
    <section
      ref={root}
      tabIndex={-1}
      className="reading-sources"
      aria-label="汇总输入核对"
      onPointerDownCapture={onInteract}
      onKeyDownCapture={onInteract}
      onKeyDown={(event) => {
        if (event.key === "Escape" && opened) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          root.current
            ?.querySelector<HTMLButtonElement>(".reading-sources-heading")
            ?.focus();
        }
      }}
    >
      <button
        className="reading-sources-heading"
        aria-expanded={opened}
        onClick={() => (opened ? onClose() : onChange(current))}
      >
        <strong>输入核对</strong>
        <span>
          {metricName} {sources.coverage}/{sources.count}
        </span>
        <span aria-hidden="true">{opened ? "−" : "+"}</span>
      </button>
      {opened && (
        <div className="reading-sources-content">
          <div
            className="reading-source-metrics"
            role="group"
            aria-label="核对指标"
          >
            {metrics.map((metric) => (
              <button
                key={metric}
                aria-pressed={current.metric === metric}
                onClick={() => onChange({ ...current, metric, query: "" })}
              >
                {metric === "temperature" ? "进风温度" : "输入功耗"}
              </button>
            ))}
            <span>第 {time} 秒</span>
          </div>
          <p className="reading-sources-total">
            <strong>{sourceValue(sources.value, sources.metric)}</strong>
            <span>
              {sourceName} ·{" "}
              {sources.metric === "temperature"
                ? "有效整机进风取最高值"
                : "有效整机输入逐台求和"}
            </span>
          </p>
          <p className="reading-sources-boundary">
            {sources.metric === "temperature"
              ? "整机进风为模拟读数，不含部件模型温度或设施送回风测点。"
              : "整机输入为模拟读数；A/B 关联按设备去重，不拆分到支路，也不是设施计量。"}
          </p>
          {sources.budget && (
            <PowerBudgetSummary
              budget={sources.budget}
              group={current.group}
              onGroup={(group) => onChange({ ...current, group })}
            />
          )}
          <div
            className="reading-source-groups"
            role="group"
            aria-label="是否计入当前汇总"
          >
            <button
              aria-pressed={current.group === "excluded"}
              onClick={() => onChange({ ...current, group: "excluded" })}
            >
              未计入 {sources.excluded}
            </button>
            <button
              aria-pressed={current.group === "included"}
              onClick={() => onChange({ ...current, group: "included" })}
            >
              已计入 {sources.coverage}
            </button>
          </div>
          <label className="reading-source-search">
            <input
              aria-label="查找汇总输入设备"
              placeholder="设备或机柜编号"
              value={current.query}
              onChange={(e) => onChange({ ...current, query: e.target.value })}
            />
            {current.query && (
              <button
                aria-label="清除输入设备搜索"
                onClick={() => onChange({ ...current, query: "" })}
              >
                ×
              </button>
            )}
          </label>
          <div
            className="reading-source-list"
            tabIndex={0}
            aria-label="汇总输入设备名单"
          >
            {rows.length ? (
              rows.map((row) => (
                <button
                  key={row.id}
                  className="reading-source-row"
                  aria-label={`预览汇总输入 ${row.name}，${row.reason}`}
                  onClick={() => onPreview(row.id)}
                >
                  <span>
                    <strong>{row.name}</strong>
                    <b>
                      {row.included
                        ? sourceValue(row.value, sources.metric)
                        : "—"}
                    </b>
                  </span>
                  <small>{row.location}</small>
                  <small className="reading-source-reason">
                    {row.reason}
                    {row.included &&
                    sources.metric === "temperature" &&
                    row.value === sources.value
                      ? " · 当前最高"
                      : ""}
                  </small>
                  {sources.metric === "power" && (
                    <small className="reading-source-budget">
                      配置预算 {sourceValue(row.budget, "power")}
                      {budgetRatio(row.value, row.budget) !== null
                        ? ` · 占比 ${(budgetRatio(row.value, row.budget)! * 100).toFixed(1)}%`
                        : " · 无当前占比"}
                    </small>
                  )}
                  <small>{row.detail}</small>
                </button>
              ))
            ) : (
              <p className="reading-source-empty">
                {current.query
                  ? "此分组没有匹配设备。"
                  : current.group === "excluded"
                    ? "所有设备均有可计入的当前输入。"
                    : "当前没有有效输入，汇总为空缺，不按零计。"}
              </p>
            )}
          </div>
          <small className="reading-source-caption">
            {current.group === "included"
              ? `按读数从高到低排列${sources.metric === "power" ? ` · 含 ${sources.zeroCount} 台有效零值` : ""}`
              : "未计入不等于零，也不等于设备告警"}
            。预览保留镜头与时间。
          </small>
        </div>
      )}
    </section>
  );
}
