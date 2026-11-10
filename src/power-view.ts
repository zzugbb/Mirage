import { Vector3 } from "three";
import { powerScene, type PowerScene } from "./power-paths.ts";
import { powerLinkById } from "./power-trace.ts";
import type { AppState } from "./domain.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

/** 只对显式追踪的插座至设备输入取景；部件展示台不补画隐藏的 PDU。 */
export function powerViewPoints(
  state: AppState,
  selected: string,
  linkId: string | null,
) {
  if (!linkId || state.level === "device") return [];
  const scene = powerScene(state, selected, linkId);
  if (scene?.traceId !== linkId) return [];
  const branch = scene.paths.at(-1);
  return branch
    ? [new Vector3(...branch.points[0]), new Vector3(...branch.points.at(-1)!)]
    : [];
}
export const powerViewSource = (linkId: string | null) =>
  powerLinkById(linkId)?.deviceId ?? null;
export function powerViewFrame(
  points: Vector3[],
  width: number,
  height: number,
  rect: FrameRect,
) {
  const context = points.flatMap((point) => [
    point.clone().add(new Vector3(-0.18, 0, 0)),
    point.clone().add(new Vector3(0.18, 0, 0)),
  ]);
  // 柜后略俯看，与柜前网络取景分开；保留真实柜体遮挡。
  return observationFrame(
    context,
    new Vector3(0, 0.18, -1),
    width,
    height,
    rect,
    1.5,
    0.08,
  );
}
/** 近景只强调当前插座和设备输入，上游配置仍留在详情。 */
export function focusedPowerScene(
  scene: PowerScene | null,
  active: boolean,
): PowerScene | null {
  if (!scene?.traceId || !active || !scene.paths.length) return scene;
  const link = powerLinkById(scene.traceId)!;
  return {
    ...scene,
    closeUp: true,
    paths: scene.paths.slice(-1),
    labels: scene.labels
      .filter((label) => label.id !== "power-source")
      .map((label) => ({
        ...label,
        title:
          label.kind === "outlet"
            ? `PDU ${link.inlet} · 插座 ${String(link.outlet).padStart(2, "0")}`
            : label.title,
        detail: "",
      })),
  };
}
export type PowerViewCommand = {
  revision: number;
  action: "observe" | "return";
};
