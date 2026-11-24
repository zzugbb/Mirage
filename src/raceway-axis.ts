import { MathUtils } from "three";
import {
  panelEntryPlacement,
  racewayPanels,
  racewayTrunk,
} from "./panel-raceway.ts";

const [west, east] = racewayPanels.map((panel) =>
  panelEntryPlacement(panel.id)!,
);
const stationsEpsilon = 1e-9;

function entryCenter(placement: typeof west) {
  const [near, , opposite] = placement.opening;
  return near.clone().lerp(opposite, 0.5);
}

const coverFront = (section: typeof racewayTrunk) =>
  section.position[2] + section.sectionSize[2] / 2;

/** 槽轴以两处箱顶入盒中心与横槽中线为基准，折点总归入横槽。 */
export function racewayAxisPosition(basePanelId: string, distance = 0) {
  const fromEastEnd = basePanelId === east.panel.id;
  const start = entryCenter(west);
  const end = entryCenter(east);
  const trunkY = racewayTrunk.position[1];
  const points = [
    start,
    start.clone().setY(trunkY),
    end.clone().setY(trunkY),
    end,
  ];
  const sections = [west.drop, racewayTrunk, east.drop];
  const distances = [0];
  for (let i = 0; i < sections.length; i++)
    distances.push(distances[i] + points[i].distanceTo(points[i + 1]));
  const [begin, westCorner, eastCorner, total] = distances;
  const input = Number.isFinite(distance) ? distance : 0;
  const clamped = MathUtils.clamp(input, 0, total);
  const fromWestInput = fromEastEnd ? total - clamped : clamped;
  const fromWest =
    distances.find(
      (value) => Math.abs(value - fromWestInput) <= stationsEpsilon,
    ) ?? fromWestInput;
  const fromEast = total - fromWest;
  const index = fromWest < westCorner ? 0 : fromWest <= eastCorner ? 1 : 2;
  const section = sections[index];
  const segments = sections.map((section, index) => {
    const a = distances[index];
    const b = distances[index + 1];
    const startStation = fromEastEnd ? total - b : a;
    const endStation = fromEastEnd ? total - a : b;
    return {
      section,
      index,
      start: points[index],
      end: points[index + 1],
      length: b - a,
      startStation,
      endStation,
      center: (startStation + endStation) / 2,
    };
  });
  const point = points[index]
    .clone()
    .lerp(
      points[index + 1],
      (fromWest - distances[index]) / segments[index].length,
    );
  // 尺线投到盖板前方，越过压条，保留实际轴线里程的 X/Y。
  const front = coverFront(racewayTrunk) + 0.006;
  const projected = points.map((p) => p.clone().setZ(front));
  const projectedPoint = point.clone().setZ(front);
  const marker = point.clone().setZ(coverFront(section) + 0.006);
  if (index !== 1) {
    // 竖槽轴线延伸到横槽中心。标记在本段可见盖板内缩，避开箱顶及两段接缝。
    const half = section.sectionSize[1] / 2;
    marker.y = MathUtils.clamp(
      point.y,
      section.position[1] - half + 0.006,
      section.position[1] + half - 0.006,
    );
  }
  return {
    basePanelId: (fromEastEnd ? east : west).panel.id,
    point,
    section,
    index,
    station: fromEastEnd ? fromEast : fromWest,
    fromWest,
    fromEast,
    total,
    panels: [west.panel, east.panel],
    segments,
    projected,
    projectedPoint,
    marker,
    corner:
      fromWest === westCorner
        ? "west"
        : fromWest === eastCorner
          ? "east"
          : null,
    endpoint: fromWest === begin ? "west" : fromWest === total ? "east" : null,
  } as const;
}
