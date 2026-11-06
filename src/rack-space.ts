import { rackInstallation } from "./rack-installation.ts";

export type RackUnitRange = { rackId: string; first: number; last: number };

/** 只检查标准 U 位安装配置，不把未安装位置声明为可分配容量。 */
export function inspectRackSpace(range: RackUnitRange) {
  const layout = rackInstallation(range.rackId);
  if (
    !layout ||
    !Number.isInteger(range.first) ||
    !Number.isInteger(range.last) ||
    range.first < 1 ||
    range.last > layout.units ||
    range.last < range.first
  )
    return null;
  const conflicts = layout.segments.filter(
    (s) =>
      s.kind === "device" && s.first <= range.last && s.last >= range.first,
  );
  const occupied = conflicts.reduce(
    (sum, s) =>
      sum + Math.min(s.last, range.last) - Math.max(s.first, range.first) + 1,
    0,
  );
  return {
    ...range,
    size: range.last - range.first + 1,
    occupied,
    blanked: range.last - range.first + 1 - occupied,
    conflicts,
  };
}

export function rackSpaceCandidates(rackId: string, size: number) {
  const layout = rackInstallation(rackId);
  if (!layout || !Number.isInteger(size) || size < 1 || size > layout.units)
    return [];
  return layout.segments
    .filter((s) => s.kind === "blanking" && s.last - s.first + 1 >= size)
    .map((s) => ({
      first: s.first,
      last: s.last,
      units: s.last - s.first + 1,
      positions: s.last - s.first - size + 2,
      sample: { rackId, first: s.first, last: s.first + size - 1 },
    }));
}
