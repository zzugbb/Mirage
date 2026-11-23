import scene from "../assets/public/scenes/room-01.json" with { type: "json" };
import { panelSettings, patchPanelById } from "./patch-panels.ts";

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
