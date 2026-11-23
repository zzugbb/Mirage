import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { patchPanels, panelSettings } from "./patch-panels.ts";
import { racewaySections } from "./panel-raceway.ts";
import {
  entranceFixture,
  entranceSettings,
  exitSign,
  emergencyLight,
} from "./entrance.ts";

type Fixture = {
  id: string;
  name: string;
  location: string;
  position: number[];
};
function outline(
  f: Fixture,
  size: number[],
  system: "布线" | "门区",
  shape: string,
) {
  const [x, height, z] = f.position;
  return {
    id: f.id,
    name: f.name,
    short: f.name.split(" ")[0],
    kind: "point" as const,
    system,
    shape,
    location: `${system} · ${f.location}`,
    x,
    height,
    z,
    width: size[0],
    boxHeight: size[1],
    depth: size[2],
  };
}
const s = entranceSettings;
const reader = definition.room.fixtures.find((f) => f.id === s.readerId)!;
export const rearWallItems = [
  ...patchPanels.map((p) => outline(p, panelSettings.size, "布线", "面板")),
  ...racewaySections.map((f) => outline(f, f.sectionSize, "布线", "槽体")),
  outline(reader, s.readerBodySize, "门区", "箱体"),
  outline(
    entranceFixture,
    [s.openingWidth, s.openingHeight, s.frameDepth],
    "门区",
    "洞口",
  ),
  outline(exitSign, s.lighting.signSize, "门区", "箱体"),
  outline(emergencyLight, s.lighting.lampBodySize, "门区", "箱体"),
].sort((a, b) => a.x - b.x || a.height - b.height);
export type RearWallItem = (typeof rearWallItems)[number];
export const rearWallSize = {
  width: definition.room.size[0],
  height: definition.room.size[1],
};
function nearestEnds(a: number, aSize: number, b: number, bSize: number) {
  const lo = Math.max(a - aSize / 2, b - bSize / 2),
    hi = Math.min(a + aSize / 2, b + bSize / 2);
  if (lo <= hi) return [(lo + hi) / 2, (lo + hi) / 2];
  return a < b ? [hi, lo] : [lo, hi];
}
// 只在布线与门区两组之间比较 X/Y 外轮廓；重叠方向取公共区间的中点。
export function rearWallNeighbor(item: RearWallItem) {
  return rearWallItems
    .filter((peer) => peer.system !== item.system)
    .map((peer) => {
      const [x1, x2] = nearestEnds(item.x, item.width, peer.x, peer.width);
      const [y1, y2] = nearestEnds(
        item.height,
        item.boxHeight,
        peer.height,
        peer.boxHeight,
      );
      return { peer, x1, y1, x2, y2, distance: Math.hypot(x2 - x1, y2 - y1) };
    })
    .sort((a, b) => a.distance - b.distance)[0];
}
