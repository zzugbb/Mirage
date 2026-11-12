import { rackInstallation } from "./rack-installation.ts";
import { inspectRackSpace, type RackUnitRange } from "./rack-space.ts";

/** 按安装图从高 U 到低 U 分段；保留完整安装跨度，只裁剪观察交集。 */
export function rangeSegments(range: RackUnitRange | null) {
  if (!range || !inspectRackSpace(range)) return [];
  return rackInstallation(range.rackId)!
    .segments.filter(
      (segment) => segment.first <= range.last && segment.last >= range.first,
    )
    .map((segment) => ({
      ...segment,
      range: {
        rackId: range.rackId,
        first: Math.max(range.first, segment.first),
        last: Math.min(range.last, segment.last),
      },
    }));
}
export type RangeSegment = ReturnType<typeof rangeSegments>[number];
export function rangeObservationTarget(
  range: RackUnitRange,
  segmentId: string | null,
) {
  if (!inspectRackSpace(range)) return null;
  return segmentId === null
    ? { ...range }
    : (rangeSegments(range).find((segment) => segment.id === segmentId)
        ?.range ?? null);
}
