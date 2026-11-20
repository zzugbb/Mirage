import { powerColor } from "../scene/metric-color";
import type { powerBudget } from "../power-budget";
import { sourceValue } from "../reading-sources";

export function PowerBudgetSummary({
  budget,
  group,
  onGroup,
}: {
  budget: ReturnType<typeof powerBudget>;
  group: "included" | "excluded";
  onGroup: (group: "included" | "excluded") => void;
}) {
  const { configured, observed, excluded, value, ratio } = budget;
  return (
    <section className="power-budget-summary" aria-label="功耗预算口径">
      <header>
        <strong>有效设备预算占比</strong>
        <b>{ratio === null ? "—" : `${(ratio * 100).toFixed(1)}%`}</b>
      </header>
      <div className="power-budget-meter" aria-hidden="true">
        {ratio !== null && (
          <i
            style={{
              width: `${Math.min(100, ratio * 100)}%`,
              backgroundColor: "#" + powerColor(ratio).getHexString(),
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
          <dt>
            <button
              aria-pressed={group === "included"}
              onClick={() => onGroup("included")}
            >
              已计入设备预算 ↘
            </button>
          </dt>
          <dd>{sourceValue(observed.watts, "power")}</dd>
        </div>
        <div>
          <dt>
            <button
              aria-pressed={group === "excluded"}
              onClick={() => onGroup("excluded")}
            >
              未计入设备预算 ↘
            </button>
          </dt>
          <dd>{sourceValue(excluded.watts, "power")}</dd>
        </div>
      </dl>
      <small>
        {observed.missing
          ? "有效设备仍有预算未定义，不计算占比。"
          : !observed.count
            ? "没有有效功耗，当前占比留空。"
            : "有效零功耗仍计入其配置预算。"}{" "}
        未计入设备的功耗未知，不按零值或剩余容量处理。预算不是额定容量、PDU／回路计量或可分配余量；设施范围仅对照关联整机，A/B
        不重复计算。
      </small>
    </section>
  );
}
