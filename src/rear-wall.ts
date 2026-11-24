import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { MathUtils, Vector3 } from "three";
import { patchPanels, panelSettings } from "./patch-panels.ts";
import { racewaySections } from "./panel-raceway.ts";
import {
  entranceFixture,
  entranceSettings,
  exitSign,
  emergencyLight,
} from "./entrance.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

type Fixture = {
  id: string;
  name: string;
  location: string;
  position: number[];
};
const wallSurfaces = {
  面板: "箱体外缘",
  槽体: "槽体外缘",
  箱体: "箱体外缘",
  洞口: "门框外缘",
};
function outline(
  f: Fixture,
  size: number[],
  system: "布线" | "门区",
  shape: keyof typeof wallSurfaces,
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

function wallFace(item: RearWallItem) {
  const x = item.width / 2;
  const y = item.boxHeight / 2;
  const z = item.z + item.depth / 2;
  return {
    left: item.x - x,
    right: item.x + x,
    bottom: item.height - y,
    top: item.height + y,
    z,
  };
}

/** 三维近景沿用立面量取结果；同一对端在切换选择时仍使用初始起点。 */
export function rearWallCrossing(originId: string) {
  const item = rearWallItems.find((entry) => entry.id === originId);
  if (!item) return null;
  const { peer, x1, y1, x2, y2, distance } = rearWallNeighbor(item);
  const items = [item, peer];
  const faces = items.map(wallFace);
  const ends = [
    new Vector3(x1, y1, faces[0].z),
    new Vector3(x2, y2, faces[1].z),
  ];
  const dimensionZ = Math.max(...faces.map((face) => face.z)) + 0.018;
  const projected = ends.map((point) => point.clone().setZ(dimensionZ));
  const outlines = faces.map(({ left, right, bottom, top, z }) => [
    new Vector3(left, bottom, z + 0.004),
    new Vector3(left, top, z + 0.004),
    new Vector3(right, top, z + 0.004),
    new Vector3(right, bottom, z + 0.004),
  ]);
  const markers = items.map((fixture, i) => {
    const end = ends[i];
    const { left, right, bottom, top } = faces[i];
    const inset = 0.014;
    return {
      id: i === 0 ? "rear-wall-origin" : "rear-wall-peer",
      title: fixture.name,
      point: new Vector3(
        MathUtils.clamp(end.x, left + inset, right - inset),
        MathUtils.clamp(end.y, bottom + inset, top - inset),
        end.z + 0.006,
      ),
    };
  });
  // 长线槽和洞口仅用量距附近的部分构图，轮廓线仍保留其配置全长。
  const framePoints = faces.flatMap(({ left, right, bottom, top, z }, i) => {
    const end = ends[i];
    return [
      new Vector3(
        Math.max(left, end.x - 0.55),
        Math.max(bottom, end.y - 0.32),
        z,
      ),
      new Vector3(
        Math.min(right, end.x + 0.55),
        Math.min(top, end.y + 0.32),
        z,
      ),
    ];
  });
  const described = (fixture: RearWallItem) => ({
    ...fixture,
    surface: wallSurfaces[fixture.shape],
  });
  return {
    id: `${item.id}:rear-wall:${peer.id}`,
    kind: "rear-wall" as const,
    title: "后墙相邻布置核对",
    upper: described(item),
    lower: described(peer),
    distance,
    ends,
    projected,
    outlines,
    markers,
    points: [
      ...ends,
      ...projected,
      ...framePoints,
      ...markers.map((marker) => marker.point),
    ],
  };
}

export type RearWallCrossing = NonNullable<ReturnType<typeof rearWallCrossing>>;

export function rearWallCrossingFrame(
  pair: RearWallCrossing,
  width: number,
  height: number,
  rect: FrameRect,
) {
  // 跨越西侧的长量距从略高的位置观察，使视线越过后排柜顶。
  const direction = new Vector3(
    0,
    Math.min(0.39, 0.06 + pair.distance * 0.053),
    1,
  );
  return observationFrame(
    pair.points,
    direction,
    width,
    height,
    rect,
    1.65,
    0.09,
  );
}
