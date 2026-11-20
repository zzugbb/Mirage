import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
/** 预算是配置参照，不是额定容量；有效功耗与分母始终使用同一组设备。 */
export function budgetRatio(value: number | null, budget: number | null) {
  return value !== null &&
    Number.isFinite(value) &&
    value >= 0 &&
    budget !== null &&
    Number.isFinite(budget) &&
    budget > 0
    ? value / budget
    : null;
}

const policy = definition.installation.powerDistribution.budgetPolicy;
type BudgetRule = typeof policy.default;
const overrides: Record<string, Partial<BudgetRule>> = policy.overrides;
export type BudgetState = { level: "near" | "over"; seconds: number };
// 普通负载及无法判断的读数不附着状态，由有效占比和质量字段区分。
export function budgetStateAt(
  id: string,
  ratio: number | null,
  time: number,
  previousRatio: (time: number) => number | null,
): BudgetState | undefined {
  const rule = overrides[id];
  if (
    ratio === null ||
    ratio < (rule?.attentionRatio ?? policy.default.attentionRatio)
  )
    return;
  let seconds = 0;
  if (ratio > 1) {
    for (let at = time - 1; at >= 0 && (previousRatio(at) ?? 0) > 1; at--)
      seconds++;
  }
  return {
    level:
      ratio > 1 && seconds >= (rule?.overSeconds ?? policy.default.overSeconds)
        ? "over"
        : "near",
    seconds,
  };
}
// 满量程附近保留越界方向，防止红色读数被取整为恰好 100%。
export function budgetPercent(ratio: number, digits = 0) {
  const percent = ratio * 100;
  const text = percent.toFixed(digits);
  if (Number(text) === 100 && ratio !== 1) {
    const precise = percent.toFixed(1);
    if (Number(precise) !== 100) return precise + "%";
    return ratio > 1 ? ">100%" : "<100%";
  }
  return text + "%";
}
export function budgetStateText(state?: BudgetState, ratio?: number | null) {
  if (!state) return undefined;
  if (state.level === "over") return `持续超预算 ${state.seconds} 秒`;
  return ratio != null && ratio > 1 ? "已超预算，等待持续判定" : "接近预算";
}
export function powerBudget(
  rows: { included: boolean; value: number | null; budget: number | null }[],
) {
  const summarize = (members: typeof rows) => ({
    count: members.length,
    watts: members.reduce((sum, row) => sum + (row.budget ?? 0), 0),
    missing: members.filter((row) => row.budget === null).length,
  });
  const included = rows.filter((row) => row.included);
  const observed = summarize(included),
    excluded = summarize(rows.filter((row) => !row.included));
  const value = included.length
    ? included.reduce((sum, row) => sum + row.value!, 0)
    : null;
  return {
    configured: summarize(rows),
    observed,
    excluded,
    value,
    ratio: observed.missing ? null : budgetRatio(value, observed.watts),
  };
}
