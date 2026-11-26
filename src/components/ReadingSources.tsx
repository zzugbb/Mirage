import { BudgetProcess } from "./BudgetProcess";
import type { BudgetReview } from "../budget-process";
import { budgetRatio } from "../power-budget";
import { PowerBudgetSummary } from "./PowerBudgetSummary";
import { useEffect, useRef } from "react";
import { clearSearchOnEscape } from "../search-keyboard";
import { useResultFocusFallback } from "../use-result-focus-fallback";
import { FocusedResultList } from "./FocusedResultList";
import {
  matchingSourceRows,
  sourceValue,
  type ReadingSources as Sources,
  type SourceCheck,
  type SourceMetric,
} from "../reading-sources";

export function ReadingSources({
  budgetReview,
  onBudgetReview,
  onSeek,
  sources,
  metrics,
  check,
  showCollapsed,
  time,
  onChange,
  onClose,
  onPreview,
  onInteract,
}: {
  budgetReview: BudgetReview;
  onBudgetReview: (state: BudgetReview) => void;
  onSeek: (time: number) => void;
  sources: Sources;
  metrics: SourceMetric[];
  check: SourceCheck | null;
  showCollapsed: boolean;
  time: number;
  onChange: (check: SourceCheck) => void;
  onClose: () => void;
  onPreview: (id: string) => void;
  onInteract: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const heading = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const watchResult = useResultFocusFallback(search);
  const opened = !!check;
  useEffect(() => {
    if (opened) {
      root.current?.scrollIntoView({ block: "nearest" });
      root.current?.focus({ preventScroll: true });
    }
  }, [opened]);
  if (!showCollapsed && !opened) return null;
  const close = () => {
    onClose();
    if (showCollapsed) heading.current?.focus();
  };
  const current: SourceCheck = check ?? {
    sourceId: sources.sourceId,
    metric: sources.metric,
    group: sources.excluded ? "excluded" : "included",
    query: "",
  };
  const rows = matchingSourceRows(sources, current);
  const clearQuery = () => {
    search.current?.focus();
    onChange({ ...current, query: "" });
  };
  const metricName = sources.metric === "temperature" ? "进风" : "功耗";
  const hasMetricChoice = metrics.length > 1;
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
          const detail = (
            event.target as HTMLElement
          ).closest<HTMLDetailsElement>("details[open]");
          if (detail && root.current?.contains(detail)) {
            detail.open = false;
            detail.querySelector("summary")?.focus({ preventScroll: true });
            return;
          }
          close();
        }
      }}
    >
      <button
        ref={heading}
        className="reading-sources-heading"
        aria-expanded={opened}
        onClick={() => (opened ? close() : onChange(current))}
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
            role={hasMetricChoice ? "group" : undefined}
            aria-label={hasMetricChoice ? "核对指标" : undefined}
          >
            {hasMetricChoice &&
              metrics.map((metric) => (
                <button
                  key={metric}
                  aria-pressed={current.metric === metric}
                  onClick={() => {
                    if (current.metric !== metric)
                      onChange({ ...current, metric, query: "" });
                  }}
                >
                  {metric === "temperature" ? "进风温度" : "输入功耗"}
                </button>
              ))}
            <span>第 {time} 秒</span>
          </div>
          <p className="reading-sources-total">
            <span>
              {sources.metric === "temperature"
                ? "当前最高进风"
                : "整机输入合计"}
            </span>
            <strong>{sourceValue(sources.value, sources.metric)}</strong>
          </p>
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
              ref={search}
              aria-label="查找汇总输入设备"
              placeholder="设备或机柜编号"
              value={current.query}
              onChange={(e) => onChange({ ...current, query: e.target.value })}
              onKeyDown={(event) => clearSearchOnEscape(event, clearQuery)}
            />
            {current.query && (
              <button aria-label="清除输入设备搜索" onClick={clearQuery}>
                ×
              </button>
            )}
          </label>
          <FocusedResultList
            className="reading-source-list"
            tabIndex={0}
            aria-label="汇总输入设备名单"
          >
            {rows.length ? (
              rows.map((row) => (
                <button
                  key={row.id}
                  ref={watchResult}
                  className="reading-source-row"
                  data-source-device={row.id}
                  aria-label={`预览汇总输入 ${row.name}，${row.reason}`}
                  aria-description={row.detail}
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
                  <small>
                    {row.location}
                    {(!row.included || row.reason === "有效零值") &&
                      ` · ${row.reason}`}
                    {row.included &&
                      sources.metric === "temperature" &&
                      row.value === sources.value &&
                      " · 当前最高"}
                  </small>
                  {sources.metric === "power" && (
                    <small className="reading-source-budget">
                      配置预算 {sourceValue(row.budget, "power")}
                      {budgetRatio(row.value, row.budget) !== null
                        ? ` · 占比 ${(budgetRatio(row.value, row.budget)! * 100).toFixed(1)}%`
                        : " · 无当前占比"}
                    </small>
                  )}
                  {row.reason === "数据过期" && <small>{row.detail}</small>}
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
          </FocusedResultList>
          <small className="reading-source-caption">
            {current.group === "included"
              ? `按读数从高到低排列${sources.metric === "power" ? ` · 含 ${sources.zeroCount} 台有效零值` : ""}`
              : "未计入的当前值留空"}
          </small>
          {sources.budget && (
            <>
              <PowerBudgetSummary
                budget={sources.budget}
                state={sources.budgetState}
              />
              <BudgetProcess
                sourceId={sources.sourceId}
                time={time}
                state={budgetReview}
                onChange={onBudgetReview}
                onSeek={onSeek}
              />
            </>
          )}
          <details className="reading-sources-basis">
            <summary>计入口径</summary>
            <p>
              {sources.metric === "temperature"
                ? "取有效整机模拟进风的最高值。部件模型温度和设施测点另列。"
                : "按设备汇总有效模拟功耗，A/B 去重。回路与设施未计量。"}
            </p>
          </details>
        </div>
      )}
    </section>
  );
}
