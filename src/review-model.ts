import { createState, transition } from "./domain.ts";
import type { Action, AppState } from "./domain.ts";
import { spatialSnapshot } from "./spatial.ts";

export type ReviewLayer = "overview" | "environment" | "power";
export type ReviewShot = "overview" | "environment" | "assembly" | "time";
export type ReviewState = {
  scene: AppState;
  layer: ReviewLayer;
  analysis: boolean;
  data: boolean;
  alarms: boolean;
};
export const reviewLayers = [
  { id: "overview", name: "总览", description: "原始材质与运行状态" },
  {
    id: "environment",
    name: "环境",
    description: "设备进风温度；部件为模型温度",
  },
  { id: "power", name: "电力", description: "设备输入功耗与预算占比" },
] as const;
export function createReview(): ReviewState {
  return {
    scene: { ...createState(), time: 60, playing: false },
    layer: "overview",
    analysis: false,
    data: true,
    alarms: true,
  };
}
export type ReviewAction =
  | { type: "scene"; action: Action }
  | { type: "layer"; layer: ReviewLayer }
  | { type: "shot"; shot: ReviewShot }
  | { type: "analysis" | "data" | "alarms"; value: boolean };
export function reviewTransition(
  state: ReviewState,
  action: ReviewAction,
): ReviewState {
  if (action.type === "scene")
    return { ...state, scene: transition(state.scene, action.action) };
  if (action.type === "layer") return { ...state, layer: action.layer };
  if (action.type === "shot") {
    // 只有明确进入评审画面才装载预设；普通图层、时间操作不改镜头与姿态。
    const initial = createReview();
    initial.scene.focusRevision = state.scene.focusRevision + 1;
    if (action.shot === "environment") initial.layer = "environment";
    if (action.shot === "assembly") {
      initial.scene = transition(initial.scene, {
        type: "locate",
        id: "srv-01",
      });
      initial.scene = transition(initial.scene, {
        type: "explode",
        amount: 0.8,
      });
    }
    if (action.shot === "time") {
      initial.layer = "environment";
      initial.scene = transition(initial.scene, {
        type: "locate",
        id: "srv-01",
      });
      initial.scene.time = 90;
      initial.analysis = true;
    }
    return initial;
  }
  return { ...state, [action.type]: action.value };
}
export type ReviewMetric = "temperature" | "power";
export type ReviewPoint = {
  time: number;
  value: number | null;
  coverage: number;
  count: number;
};
/** 各层级使用同一汇总规则；无效测点保留空缺，有效零值保留为零。 */
export function reviewHistory(
  id: string,
  deviceId: string,
  metric: ReviewMetric,
): ReviewPoint[] {
  return Array.from({ length: 121 }, (_, time) => {
    const reading = spatialSnapshot(time, 0, deviceId).readings.get(id);
    return {
      time,
      value: reading?.quality === "valid" ? reading[metric] : null,
      coverage: reading
        ? metric === "temperature"
          ? reading.coverageTemperature
          : reading.coveragePower
        : 0,
      count: reading?.count ?? 0,
    };
  });
}
