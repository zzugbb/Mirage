import { powerColor } from "../scene/metric-color";
import {
  budgetPercent,
  type powerBudget,
  type BudgetState,
} from "../power-budget";
import { sourceValue } from "../reading-sources";

export function PowerBudgetSummary({
  budget,
  state,
}: {
  budget: ReturnType<typeof powerBudget>;
  state?: BudgetState;
}) {
  const { configured, observed, excluded, value, ratio } = budget;
  return (
    <details className="power-budget-summary">
      <summary>
        <strong>有效设备预算占比</strong>
        <b>{ratio === null ? "—" : budgetPercent(ratio, 1)}</b>
      </summary>
      <div className="power-budget-meter" aria-hidden="true">
        {ratio !== null && (
          <i
            style={{
              width: `${Math.min(100, ratio * 100)}%`,
              backgroundColor:
                "#" + powerColor(ratio, undefined, state).getHexString(),
            }}
          />
        )}
      </div>
      <p>
        {sourceValue(value, "power")} ÷{" "}
        {sourceValue(observed.missing ? null : observed.watts, "power")}
      </p>
      <small>
        分子与分母均取已计入的 {observed.count} 台设备。
        {ratio !== null && ratio > 1 ? "图条显示至 100%，实际占比见数值。" : ""}
      </small>
      <dl>
        <div>
          <dt>全部配置预算 · {configured.count} 台</dt>
          <dd>
            {sourceValue(configured.watts, "power")}
            {configured.missing > 0
              ? `（另 ${configured.missing} 台未定义）`
              : ""}
          </dd>
        </div>
        <div>
          <dt>已计入设备预算</dt>
          <dd>{sourceValue(observed.watts, "power")}</dd>
        </div>
        <div>
          <dt>未计入设备预算</dt>
          <dd>{sourceValue(excluded.watts, "power")}</dd>
        </div>
      </dl>
      <small>
        {observed.missing
          ? "有效设备仍有预算未定义，不计算占比。"
          : !observed.count
            ? "没有有效功耗，当前占比留空。"
            : "有效零功耗仍计入其配置预算。"}{" "}
        未计入功耗留空。设施按关联整机去重，预算只用于对照配置。
      </small>
    </details>
  );
}
