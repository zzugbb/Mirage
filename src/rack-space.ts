import { rackInstallation } from "./rack-installation.ts";
import { racks } from "./installation.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

export type RackUnitRange = { rackId: string; first: number; last: number };
export const spaceRows = definition.temperatureSlice.vertical.rows;

/** 使用已登记柜排和完整安装配置；没有候选的机柜也保留在比较中。 */
export function roomRackSpace(size: number, rowId = "all") {
  const row = spaceRows.find((row) => row.id === rowId);
  return racks
    .filter((rack) => rowId === "all" || row?.rackIds.includes(rack.id))
    .map((rack) => {
      const layout = rackInstallation(rack.id)!;
      return {
        ...layout,
        largestGap: Math.max(
          0,
          ...layout.segments
            .filter((segment) => segment.kind === "blanking")
            .map((segment) => segment.last - segment.first + 1),
        ),
        candidates: rackSpaceCandidates(rack.id, size),
      };
    });
}

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
    .map((s) => {
      const ranges = Array.from(
        { length: s.last - s.first - size + 2 },
        (_, offset) => ({
          rackId,
          first: s.first + offset,
          last: s.first + offset + size - 1,
        }),
      );
      return {
        first: s.first,
        last: s.last,
        units: s.last - s.first + 1,
        positions: ranges.length,
        sample: ranges[0],
        ranges,
      };
    });
}
