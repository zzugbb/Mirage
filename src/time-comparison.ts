import type { ReviewPoint } from "./review-model.ts";
/** 比较两个已选时刻的有效值，不用旧值补缺，也不计算百分比变化。 */
export function compareTimes(
  points: ReviewPoint[],
  reference: number,
  current: number,
) {
  const valid = (point: ReviewPoint | undefined) =>
    point?.quality === "valid" &&
    point.value !== null &&
    Number.isFinite(point.value)
      ? point.value
      : null;
  const first = points.find((point) => point.time === reference),
    second = points.find((point) => point.time === current);
  const a = valid(first),
    b = valid(second);
  return {
    first,
    second,
    reference: a,
    current: b,
    difference: a !== null && b !== null ? b - a : null,
    coverageChanged:
      !!first &&
      !!second &&
      (first.coverage !== second.coverage || first.count !== second.count),
  };
}

export const simulationClock = (time: number) =>
  `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;
