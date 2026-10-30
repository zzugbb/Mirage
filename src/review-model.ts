import { createState, transition } from "./domain.ts";
import type { Action, AppState } from "./domain.ts";
import { spatialSnapshot } from "./spatial.ts";

export type ReviewLayer = "overview" | "environment" | "power";
export type ReviewShot = "overview" | "environment" | "assembly" | "time";
export type ReviewState = {
  scene: AppState;
  layer: ReviewLayer;
  analysis: boolean;
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
  };
}
export type ReviewAction =
  | { type: "scene"; action: Action }
  | { type: "layer"; layer: ReviewLayer }
  | { type: "shot"; shot: ReviewShot }
  | { type: "analysis"; value: boolean };
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
/** 视图直接决定显示内容，不再通过额外开关隐藏当前指标。 */
export function reviewPresentation(
  layer: ReviewLayer,
  level: AppState["level"],
) {
  const detail = level === "device";
  if (layer === "environment")
    return {
      mode: "temperature" as const,
      title: detail ? "设备与部件温度 · °C" : "设备进风温度 · °C",
      description: detail
        ? "部件为模型表面温度，机箱采用整机进风温度。"
        : "颜色表示温度高低；机柜标签取有效设备最高进风值。",
    };
  if (layer === "power")
    return {
      mode: "power" as const,
      title: "功耗 / 预算占比 · %",
      description: detail
        ? "机箱按整机输入、部件按分配功耗着色；右侧显示所选对象的 W 值。"
        : "颜色表示功耗占预算的比例；标签显示实际 W / kW。",
    };
  return {
    mode: "status" as const,
    title: "原始材质 · 运行状态",
    description: detail
      ? "保留模型材质；部件状态来自模型评估，非独立告警。"
      : "标记表示对象状态；告警详情从右上角“告警”查看。",
  };
}
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
