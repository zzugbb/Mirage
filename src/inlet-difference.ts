import { inletPairSnapshot } from "./inlet-pair.ts";

export type InletDifferenceReview = { open: boolean; origin: number | null };
export const emptyInletDifferenceReview: InletDifferenceReview = {
  open: false,
  origin: null,
};
export type DifferenceExtreme = { time: number; value: number };
export type DifferenceInterval = {
  start: number;
  end: number;
  comparable: boolean;
  firstStatus: string;
  secondStatus: string;
};
/** 只核对已发生、同秒有效的整机进风差值；无效时刻不补零或延用旧值。 */
export function inletDifferenceProcess(
  firstId: string,
  secondId: string,
  time: number,
) {
  const end = Math.max(
    0,
    Math.min(120, Math.floor(Number.isFinite(time) ? time : 0)),
  );
  let minimum: DifferenceExtreme | null = null,
    maximum: DifferenceExtreme | null = null,
    validCount = 0;
  const intervals: DifferenceInterval[] = [];
  for (let at = 0; at <= end; at++) {
    const pair = inletPairSnapshot(firstId, secondId, at);
    if (!pair) return null;
    const comparable = pair.difference !== null;
    const firstStatus = pair.first.reason,
      secondStatus = pair.second.reason;
    const last = intervals.at(-1);
    if (
      last &&
      last.comparable === comparable &&
      last.firstStatus === firstStatus &&
      last.secondStatus === secondStatus
    )
      last.end = at;
    else
      intervals.push({
        start: at,
        end: at,
        comparable,
        firstStatus,
        secondStatus,
      });
    if (pair.difference === null) continue;
    validCount++;
    // 严格比较使并列极值稳定取首次；方向始终为所查减基准。
    if (!minimum || pair.difference < minimum.value)
      minimum = { time: at, value: pair.difference };
    if (!maximum || pair.difference > maximum.value)
      maximum = { time: at, value: pair.difference };
  }
  return { end, count: end + 1, validCount, minimum, maximum, intervals };
}
