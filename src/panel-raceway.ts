import scene from "../assets/public/scenes/room-01.json" with { type: "json" };
import { Vector3 } from "three";
import {
  panelSettings,
  patchPanelById,
  panelPortCenter,
  portAtPanel,
  type PanelPort,
} from "./patch-panels.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

const layout = scene.room.panelRaceway;
const { width, depth, trunkCenterY } = layout;
const common = {
  kind: "wall-raceway",
  dataStatus: "not-applicable",
  mountId: layout.mountId,
};
const drops = layout.drops.map((drop) => {
  const panel = patchPanelById(drop.panelId)!;
  const [x, y, z] = panel.position;
  const bottom = y + panelSettings.size[1] / 2;
  const top = trunkCenterY - width / 2;
  return {
    ...drop,
    ...common,
    focus: layout.dropFocus,
    position: [
      x + drop.offsetX,
      (bottom + top) / 2,
      z - panelSettings.size[2] / 2 + depth / 2,
    ],
    sectionSize: [width, top - bottom, depth],
  };
});
const xs = drops.map((d) => d.position[0]);
const left = Math.min(...xs) - width / 2;
const right = Math.max(...xs) + width / 2;
const trunk = {
  ...layout.trunk,
  ...common,
  position: [(left + right) / 2, trunkCenterY, drops[0].position[2]],
  sectionSize: [right - left, width, depth],
};
export const racewaySections = [...drops, trunk];
export const racewayById = (id: string) =>
  racewaySections.find((s) => s.id === id);
export const racewayCoverThickness = layout.coverThickness;
export const racewayWallThickness = layout.wallThickness;
const cornerWidth = width - 2 * racewayWallThickness;
export const racewayTrunkOpenings = drops
  .map((drop) => ({
    left: drop.position[0] - cornerWidth / 2,
    right: drop.position[0] + cornerWidth / 2,
  }))
  .sort((a, b) => a.left - b.left);

/** 竖槽内口与横槽下壁开口共用槽壁和盖板配置。 */
export function racewayCornerInspection(sectionId: string, opened = false) {
  const drop =
    sectionId === trunk.id
      ? [...drops].sort((a, b) => a.position[0] - b.position[0])[0]
      : drops.find((item) => item.id === sectionId);
  if (!drop) return null;
  const [x, trunkY, z] = [
    drop.position[0],
    trunk.position[1],
    trunk.position[2],
  ];
  const junction = trunkY - width / 2;
  const front = z + depth / 2;
  const innerBack = z - depth / 2 + racewayWallThickness;
  const innerFront = front - racewayCoverThickness;
  const towards = Math.sign(trunk.position[0] - x);
  const trunkMarker = new Vector3(x + towards * 0.136, trunkY, front + 0.001);
  const dropMarker = new Vector3(x, junction - 0.15, front + 0.001);
  const backTrunk = trunkMarker.clone().setZ(innerBack + 0.001);
  const backDrop = dropMarker.clone().setZ(innerBack + 0.001);
  const opening = [-cornerWidth / 2, cornerWidth / 2].flatMap((dx, i) =>
    (i === 0 ? [innerBack, innerFront] : [innerFront, innerBack]).map(
      (depthZ) => new Vector3(x + dx, junction, depthZ),
    ),
  );
  return {
    kind: "raceway-corner" as const,
    id: `${trunk.id}:corner:${drop.id}`,
    title: "后墙线槽转角核对",
    drop,
    trunk,
    panel: patchPanelById(drop.panelId)!,
    opened,
    openingWidth: cornerWidth,
    clearDepth: innerFront - innerBack,
    opening,
    upper: {
      id: trunk.id,
      name: trunk.name,
      surface: opened ? "横槽内背板" : "横槽盖板",
    },
    lower: {
      id: drop.id,
      name: drop.name,
      surface: opened ? "竖槽内背板" : "竖槽盖板",
    },
    points: [...opening, trunkMarker, dropMarker, backTrunk, backDrop],
    markers: [
      {
        id: "raceway-corner-trunk",
        title: opened ? "横槽内背板" : "横槽盖板",
        point: opened ? backTrunk : trunkMarker,
      },
      {
        id: "raceway-corner-drop",
        title: opened ? "竖槽内背板" : "竖槽盖板",
        point: opened ? backDrop : dropMarker,
      },
    ],
  };
}

export type RacewayCornerInspection = NonNullable<
  ReturnType<typeof racewayCornerInspection>
>;

export function racewayCornerViewFrame(
  pair: RacewayCornerInspection,
  width: number,
  height: number,
  rect: FrameRect,
) {
  const direction = new Vector3(
    Math.sign(pair.trunk.position[0] - pair.drop.position[0]) * 0.22,
    0.24,
    1,
  );
  return observationFrame(
    pair.points,
    direction,
    width,
    height,
    rect,
    0.76,
    0.067,
  );
}

export function racewayNeighbors(id: string) {
  if (id === trunk.id) return drops;
  const drop = drops.find((d) => d.id === id || d.panelId === id);
  if (!drop) return [];
  return drop.panelId === id ? [drop] : [patchPanelById(drop.panelId)!, trunk];
}

export function racewaySightOffsets(section: (typeof racewaySections)[number]) {
  const axis = section.id === trunk.id ? 0 : 1;
  return [-0.49, 0, 0.49].map((factor) => {
    const point = [0, 0, section.sectionSize[2] / 2];
    point[axis] = factor * section.sectionSize[axis];
    return point;
  });
}

/** 只列两端箱体之间登记的孔位。线槽布置不作为施工路由证明。 */
export const racewayPanels = drops
  .map((drop) => patchPanelById(drop.panelId)!)
  .sort((a, b) => a.position[0] - b.position[0]);
export const racewayConnections = panelSettings.connections.filter(
  ({ first, second }) =>
    first.panelId !== second.panelId &&
    [first, second].every((p) => racewayPanels.some((f) => f.id === p.panelId)),
);
export function racewayRegisterStart(id: string) {
  const localPanel =
    drops.find((d) => d.id === id || d.panelId === id)?.panelId ??
    (id === trunk.id ? racewayPanels[0]?.id : undefined);
  if (!localPanel) return null;
  return (
    racewayConnections
      .flatMap((c) => [c.first, c.second])
      .find((p) => p.panelId === localPanel) ?? { panelId: localPanel, port: 1 }
  );
}

export const racewayTrunk = trunk;
export const racewayAxisSpan = Math.max(...xs) - Math.min(...xs);

export function panelEntryPlacement(id: string) {
  const drop = drops.find((d) => d.id === id || d.panelId === id);
  if (!drop) return null;
  const panel = patchPanelById(drop.panelId)!;
  return {
    panel,
    drop,
    entryX: drop.position[0] - panel.position[0],
    top: panelSettings.size[1] / 2,
  };
}

/** 在同一块配线架的正立面量取孔心与箱顶入盒中心，未登记的另一端只看箱体。 */
export function panelEntryMeasure(id: string, origin: PanelPort) {
  const placement = panelEntryPlacement(id);
  if (!placement) return null;
  const endpoint = portAtPanel(origin, placement.panel.id);
  if (!endpoint) return { ...placement, hole: null };
  const [x, y] = panelPortCenter(endpoint.port);
  return {
    ...placement,
    hole: { endpoint, x, y, dx: placement.entryX - x, rise: placement.top - y },
  };
}
