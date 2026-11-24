import { Group, type Mesh } from "three";
import {
  racewayCoverThickness,
  racewaySections,
  racewayTrunk,
  racewayTrunkOpenings,
  racewayWallThickness,
  type RacewayCornerInspection,
} from "../panel-raceway.ts";

type RacewaySection = (typeof racewaySections)[number];
type Box = (
  parent: Group,
  size: number[],
  position: number[],
  color: string,
  metalness?: number,
) => Mesh;

/** 外廓取自三段槽体，横槽下壁仅在两处竖槽内口断开。 */
export function buildRaceway(root: Group, section: RacewaySection, box: Box) {
  const [w, h, d] = section.sectionSize;
  const horizontal = section.id === racewayTrunk.id;
  const wall = racewayWallThickness;
  const cover = racewayCoverThickness;
  const clear = d - cover - wall;
  const bodyZ = (wall - cover) / 2;
  const body = (name: string, size: number[], point: number[]) => {
    box(root, size, point, "#596d76", 0.35).name = name;
  };
  body("raceway-backplate", [w, h, wall], [0, 0, (wall - d) / 2]);
  for (const side of [-1, 1])
    body(
      horizontal ? "raceway-endcap" : "raceway-sidewall",
      [wall, h, clear],
      [(side * (w - wall)) / 2, 0, bodyZ],
    );
  if (horizontal) {
    body(
      "raceway-upper-wall",
      [w - 2 * wall, wall, clear],
      [0, (h - wall) / 2, bodyZ],
    );
    const ends = [
      -w / 2 + wall,
      ...racewayTrunkOpenings.flatMap(({ left, right }) => [
        left - section.position[0],
        right - section.position[0],
      ]),
      w / 2 - wall,
    ];
    for (let i = 0; i + 1 < ends.length; i += 2) {
      const a = ends[i],
        b = ends[i + 1];
      if (b - a > 1e-8)
        body(
          "raceway-lower-wall",
          [b - a, wall, clear],
          [(a + b) / 2, (wall - h) / 2, bodyZ],
        );
    }
  }

  const assembly = new Group();
  assembly.name = "raceway-cover-assembly";
  root.add(assembly);
  box(
    assembly,
    [w - 0.004, h - 0.004, cover],
    [0, 0, (d - cover) / 2],
    "#afbab9",
    0.35,
  ).name = "raceway-cover";
  // 压条随槽盖合拢和移开，保留此前覆盖位置与尺寸。
  for (const side of [-1, 1]) {
    const along = side * ((horizontal ? w : h) / 2 - 0.044);
    box(
      assembly,
      horizontal ? [0.022, h, 0.004] : [w, 0.022, 0.004],
      horizontal ? [along, 0, d / 2 + 0.002] : [0, along, d / 2 + 0.002],
      "#7a898f",
      0.4,
    ).name = "raceway-cover-strap";
  }
}

/** 只影响当前核对的盖板表现，槽体、场景登记和其他竖槽保持原位。 */
export function showRacewayCorner(
  fixtures: Map<string, Group>,
  pair?: RacewayCornerInspection,
) {
  const visible = pair?.opened ? [pair.drop.id, pair.trunk.id] : [];
  for (const section of racewaySections) {
    const cover = fixtures
      .get(section.id)
      ?.getObjectByName("raceway-cover-assembly");
    if (cover) cover.visible = !visible.includes(section.id);
  }
}
