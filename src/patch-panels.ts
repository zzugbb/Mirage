import scene from "../assets/public/scenes/room-01.json" with { type: "json" };
export const panelSettings = scene.room.patchPanels;
export const patchPanels = scene.room.fixtures.filter(
  (p) => p.kind === "patch-panel",
);
export type PanelPort = { panelId: string; port: number };
export const patchPanelById = (id: string) =>
  patchPanels.find((p) => p.id === id);
export const panelPortNumbers = Array.from(
  { length: panelSettings.rows * panelSettings.columns },
  (_, i) => i + 1,
);
export function panelPortCenter(port: number) {
  const { columns, firstCenter, pitchX, pitchY, size, bezelSize } =
    panelSettings;
  return [
    firstCenter[0] + ((port - 1) % columns) * pitchX,
    firstCenter[1] - Math.floor((port - 1) / columns) * pitchY,
    size[2] / 2 + bezelSize[2],
  ];
}
export function panelTermination({ panelId, port }: PanelPort) {
  for (const { id, first, second } of panelSettings.connections) {
    if (first.panelId === panelId && first.port === port)
      return { id, peer: second };
    if (second.panelId === panelId && second.port === port)
      return { id, peer: first };
  }
  return null;
}
