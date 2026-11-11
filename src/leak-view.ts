import { Vector3 } from "three";
import {
  configuredPathLength,
  isLeakFixture,
  leakDetection,
} from "./leak-detection.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

export const leakViews = [
  { id: "all", label: "完整布置" },
  { id: "lead", label: "控制器与引线" },
  { id: "sensing", label: "感应线路径" },
  { id: "end", label: "末端封接" },
] as const;
export type LeakView = (typeof leakViews)[number]["id"];
export type LeakViewCommand = { revision: number; view: LeakView | null };
export const leakViewIncludes = (id: string) =>
  isLeakFixture(id) || id === leakDetection.nearbyFacilityId;
const vector = (point: number[]) => new Vector3().fromArray(point);

/** 只核对已登记折线。编号是布置端点身份，不表示信号流向或独立测点。 */
export function leakInspection(view: LeakView) {
  const lead = leakDetection.leadPoints.map(vector);
  const sensing = leakDetection.sensingPoints.map(vector);
  const end = sensing.at(-1)!;
  const markers = [
    {
      id: "leak-origin",
      title: "① 引线起点",
      point: lead[0],
      objectId: leakDetection.controllerId,
    },
    {
      id: "leak-joint",
      title: "② 感应线接头",
      point: sensing[0],
      objectId: leakDetection.cableId,
    },
    {
      id: "leak-end",
      title: "③ 末端封接",
      point: end,
      objectId: leakDetection.cableId,
    },
  ].filter(
    (_, i) =>
      view === "all" ||
      (view === "lead" ? i < 2 : view === "end" ? i === 2 : i > 0),
  );
  const paths =
    view === "all"
      ? [lead, sensing]
      : view === "lead"
        ? [lead]
        : view === "sensing"
          ? [sensing]
          : [[end.clone().lerp(sensing.at(-2)!, 0.2), end]];
  const points = paths.flat();
  // 剖切沿长直段补点，不让中途桥架或灯具遮住被核对路径。
  const sightPoints = paths.flatMap((path) =>
    path.flatMap((point, i) => {
      if (!i) return [point];
      const previous = path[i - 1];
      const steps = Math.max(1, Math.ceil(point.distanceTo(previous) / 0.3));
      return Array.from({ length: steps }, (_, j) =>
        previous.clone().lerp(point, (j + 1) / steps),
      );
    }),
  );
  return {
    view,
    paths,
    points,
    sightPoints,
    markers,
    leadLength: configuredPathLength(leakDetection.leadPoints),
    sensingLength: configuredPathLength(leakDetection.sensingPoints),
  };
}
export type LeakInspection = ReturnType<typeof leakInspection>;

export function leakViewFrame(
  inspection: LeakInspection,
  width: number,
  height: number,
  rect: FrameRect,
) {
  // 整段从上方核对，避免邻近制冷柜遮住其后方地面感应线；封端从后侧近看。
  const direction =
    inspection.view === "end"
      ? new Vector3(1, 2, -0.4)
      : inspection.view === "lead"
        ? new Vector3(1, 1.7, 0.8)
        : new Vector3(0.2, 8, -0.4);
  return observationFrame(
    inspection.points,
    direction,
    width,
    height,
    rect,
    inspection.view === "end" ? 1.1 : inspection.view === "lead" ? 2.4 : 7,
    0.16,
  );
}
