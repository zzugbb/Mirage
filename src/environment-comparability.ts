import {
  environmentComparison,
  type EnvironmentMetric,
} from "./environment-monitoring.ts";
import type { EnvironmentPair } from "./environment-pair.ts";
export type ComparabilityReview = { open: boolean; origin: number | null };
export const emptyComparabilityReview: ComparabilityReview = {
  open: false,
  origin: null,
};
/** 按可比条件分段；数值变化、正常采样更新不制造新的区间，不推测未来恢复。 */
export function environmentComparability(
  pair: EnvironmentPair,
  metric: EnvironmentMetric,
  time: number,
) {
  const end = Math.max(
    0,
    Math.min(120, Math.floor(Number.isFinite(time) ? time : 0)),
  );
  const intervals: {
    start: number;
    end: number;
    comparable: boolean;
    reason: string;
    firstStatus: string;
    secondStatus: string;
  }[] = [];
  for (let at = 0; at <= end; at++) {
    const row = environmentComparison(pair.firstId, pair.secondId, at)?.find(
      (r) => r.metric === metric,
    );
    if (!row) return [];
    const last = intervals.at(-1);
    if (
      last &&
      last.reason === row.reason &&
      last.firstStatus === row.left.status &&
      last.secondStatus === row.right.status
    )
      last.end = at;
    else
      intervals.push({
        start: at,
        end: at,
        comparable: row.delta !== null,
        reason: row.reason,
        firstStatus: row.left.status,
        secondStatus: row.right.status,
      });
  }
  return intervals;
}
