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
