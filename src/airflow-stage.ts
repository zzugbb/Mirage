import type { FlowEndpoint, FlowKind } from "./airflow.ts";
import type { AirflowView } from "./airflow-view.ts";

type Stage = {
  kind: FlowKind;
  direction: string;
  boundary: string;
  endpoints: FlowEndpoint["kind"][];
};
const stages: Record<Exclude<AirflowView, "all">, Stage> = {
  supply: {
    kind: "supply",
    direction: "逻辑送风端 → 柜前格栅 → 设备进风",
    boundary:
      "沿侧通道和格栅示意送出位置；未建模架空风腔。冷却输入百分比不代表风量。",
    endpoints: ["supply", "floor", "intake"],
  },
  intake: {
    kind: "through",
    direction: "设备前部 → 同一 U 位后部",
    boundary:
      "前后轮廓对应同一安装范围，不表示内部风道或真实风口。只有整机进风模拟读数。",
    endpoints: ["intake"],
  },
  return: {
    kind: "return",
    direction: "设备后部 → 上方回风 → 制冷单元逻辑入口",
    boundary:
      "分段线表示回风假设；无排风测点，不计算进排风温差，也不表示封闭热通道。",
    endpoints: ["return"],
  },
};

export function airflowStage(view: AirflowView | null): Stage | null {
  return view && view !== "all" ? stages[view] : null;
}

/** 只改变观察强调，不改变路径、输入或深度遮挡。 */
export function airflowStageEmphasis(view: AirflowView | null, kind: FlowKind) {
  const stage = airflowStage(view);
  return !stage || stage.kind === kind ? 1 : 0.18;
}
