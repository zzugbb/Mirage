import { rackInstallation } from "./rack-installation.ts";
import { racks } from "./installation.ts";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };

export type RackUnitRange = { rackId: string; first: number; last: number };
export const spaceRows = definition.temperatureSlice.vertical.rows;

export const capacityStatus = {
  occupied: "已占用",
  reserved: "预留",
  unavailable: "不可用",
  available: "可分配",
  unknown: "配置未知",
} as const;
export const capacitySource = definition.installation.rackCapacity.label;
type CapacityStatus = keyof typeof capacityStatus;
type CapacitySegment = RackUnitRange & {
  status: CapacityStatus;
  reason: string;
};

export function rackCapacity(rackId: string) {
  const layout = rackInstallation(rackId);
  if (!layout) return null;
  const records = definition.installation.rackCapacity.ranges.filter(
    (record) => record.rackId === rackId,
  );
  const segments = layout.segments.flatMap((segment): CapacitySegment[] => {
    const { first, last } = segment;
    if (segment.kind === "device")
      return [
        {
          rackId,
          first,
          last,
          status: "occupied",
          reason: segment.name,
        },
      ];
    const result: CapacitySegment[] = [];
    let previousRecord: (typeof records)[number] | undefined;
    for (let unit = last; unit >= first; unit--) {
      const matches = records.filter(
        (record) => record.first <= unit && record.last >= unit,
      );
      const record = matches.length === 1 ? matches[0] : undefined;
      const status =
        record?.status === "available" ||
        record?.status === "reserved" ||
        record?.status === "unavailable"
          ? record.status
          : "unknown";
      const reason =
        record && status !== "unknown"
          ? record.reason
          : matches.length > 1
            ? "容量登记重叠"
            : "缺少明确的容量登记";
      const previous = result.at(-1);
      if (
        previous?.status === status &&
        previous.reason === reason &&
        previousRecord === record
      )
        previous.first = unit;
      else
        result.push({
          rackId,
          first: unit,
          last: unit,
          status,
          reason,
        });
      previousRecord = record;
    }
    return result;
  });
  return { rack: layout.rack, units: layout.units, segments };
}

export function inspectRackCapacity(range: RackUnitRange) {
  if (!inspectRackSpace(range)) return null;
  const segments = rackCapacity(range.rackId)!
    .segments.filter(
      (segment) => segment.first <= range.last && segment.last >= range.first,
    )
    .map((segment) => ({
      ...segment,
      overlap: {
        first: Math.max(segment.first, range.first),
        last: Math.min(segment.last, range.last),
      },
    }));
  return {
    segments,
    available: segments.every((segment) => segment.status === "available"),
  };
}

/** 柜排和查找只缩小比较范围。空段或零散可分配 U 位不形成连续候选。 */
export function roomRackCapacity(size: number, rowId = "all", query = "") {
  const row = spaceRows.find((row) => row.id === rowId);
  const term = query.normalize("NFKC").trim().toLowerCase();
  return racks
    .filter(
      (rack) =>
        (rowId === "all" || row?.rackIds.includes(rack.id)) &&
        (rack.id.includes(term) || rack.name.toLowerCase().includes(term)),
    )
    .map(({ id }) => {
      const layout = rackCapacity(id)!;
      const available = new Set<number>();
      for (const segment of layout.segments) {
        if (segment.status === "available")
          for (let u = segment.first; u <= segment.last; u++) available.add(u);
      }
      const candidates: RackUnitRange[] = [];
      if (Number.isInteger(size) && size > 0 && size <= layout.units) {
        let consecutive = 0;
        for (let unit = 1; unit <= layout.units; unit++) {
          consecutive = available.has(unit) ? consecutive + 1 : 0;
          if (consecutive >= size)
            candidates.push({ rackId: id, first: unit - size + 1, last: unit });
        }
      }
      return { ...layout, candidates, availableUnits: available.size };
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
