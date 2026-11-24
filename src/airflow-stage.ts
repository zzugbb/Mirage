import type { FlowEndpoint, FlowKind } from "./airflow.ts";
import type { AirflowView } from "./airflow-view.ts";

type Stage = {
  kinds: FlowKind[];
  direction: string;
  boundary: string;
  endpoints: FlowEndpoint["kind"][];
};
const stages: Record<Exclude<AirflowView, "all">, Stage> = {
  supply: {
    kinds: ["supply"],
    direction: "逻辑送风端 → 柜前格栅 → 设备进风",
    boundary:
      "沿侧通道和格栅示意送出位置；未建模架空风腔。冷却输入百分比不代表风量。",
    endpoints: ["supply", "floor", "intake"],
  },
  intake: {
    kinds: ["through"],
    direction: "设备前部 → 同一 U 位后部",
    boundary:
      "前后轮廓对应同一安装范围，不表示内部风道或真实风口。只有整机进风模拟读数。",
    endpoints: ["intake"],
  },
  return: {
    kinds: ["return"],
    direction: "设备后部 → 上方回风 → 制冷单元逻辑入口",
    boundary:
      "分段线表示回风假设；无排风测点，不计算进排风温差，也不表示封闭热通道。",
    endpoints: ["return", "receiver"],
  },
  "return-tray": {
    kinds: ["return"],
    direction: "代表回风中心线与侧梁轴线平面交会",
    boundary: "只核对样板几何和标高，实际敷设、净距与回风状态待核实。",
    endpoints: ["return", "receiver"],
  },
  terminals: {
    kinds: ["supply", "return"],
    direction: "低位送出至柜前格栅，高位接回柜后回风",
    boundary:
      "两个逻辑端点按制冷柜位置和场景偏移布置。模型外观用于辨认柜体，实际风口、送回风温度与风量均未配置。",
    endpoints: ["supply", "receiver"],
  },
};

export function airflowStage(view: AirflowView | null): Stage | null {
  return view && view !== "all" ? stages[view] : null;
}

/** 只改变观察强调，不改变路径、输入或深度遮挡。 */
export function airflowStageEmphasis(view: AirflowView | null, kind: FlowKind) {
  const stage = airflowStage(view);
  return !stage || stage.kinds.includes(kind) ? 1 : 0.18;
}

/** 全景保留四处路径标记，柜端回风在局部核查时出现。 */
export function showAirflowEndpoint(
  view: AirflowView | null,
  kind: FlowEndpoint["kind"],
) {
  const stage = airflowStage(view);
  return stage ? stage.endpoints.includes(kind) : kind !== "receiver";
}
