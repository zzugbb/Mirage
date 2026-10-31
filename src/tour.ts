import { createState, presentationKey, transition } from "./domain.ts";
import type { Action, AppState } from "./domain.ts";
import type { CameraView } from "./camera.ts";
import type { PresentationPhase, SceneFeedback } from "./mechanics.ts";

type TourStep = {
  title: string;
  description: string;
  duration: number;
  phase: PresentationPhase;
  view: CameraView;
  focus?: boolean;
  actions: Action[];
};

/** 停留时间从模型和镜头就绪后计算，不用固定延时猜测结构动画是否完成。 */
export const tourSteps: TourStep[] = [
  {
    title: "空间入场",
    description: "从机房空间，走近一台设备。",
    duration: 6,
    phase: "closed",
    view: "interior",
    actions: [{ type: "navigate", level: "room" }],
  },
  {
    title: "机柜开启",
    description: "柜门沿铰链打开，露出安装结构。",
    duration: 4,
    phase: "open",
    view: "iso",
    actions: [{ type: "navigate", level: "rack" }],
  },
  {
    title: "沿轨抽出",
    description: "服务器沿导轨滑出，保持与机柜的装配关系。",
    duration: 4,
    phase: "extended",
    view: "iso",
    actions: [
      { type: "navigate", level: "rack" },
      { type: "select", id: "srv-01" },
      { type: "tray", extended: true },
    ],
  },
  {
    title: "设备近览",
    description: "进入独立结构工作台，观察 2U 服务器。",
    duration: 4,
    phase: "device-ready",
    view: "iso",
    actions: [
      { type: "navigate", level: "device" },
      { type: "explode", amount: 0 },
    ],
  },
  {
    title: "结构展开",
    description: "维护模组分层展开，连接线保留原装配位置。",
    duration: 6,
    phase: "device-ready",
    view: "iso",
    actions: [
      { type: "navigate", level: "device" },
      { type: "explode", amount: 1 },
    ],
  },
  {
    title: "散热细节",
    description: "聚焦处理器散热总成；这是模组级结构示意。",
    duration: 4,
    phase: "device-ready",
    view: "iso",
    focus: true,
    actions: [
      { type: "navigate", level: "device" },
      { type: "select", id: "cpu-01" },
    ],
  },
  {
    title: "装配复原",
    description: "从装配基准恢复所有模组，不累计位移。",
    duration: 4,
    phase: "device-ready",
    view: "iso",
    actions: [
      { type: "navigate", level: "device" },
      { type: "explode", amount: 0 },
    ],
  },
  {
    title: "回柜归位",
    description: "设备推回导轨，柜门在回位后关闭。",
    duration: 4,
    phase: "closed",
    view: "iso",
    actions: [
      { type: "navigate", level: "rack" },
      { type: "door", open: false },
    ],
  },
  {
    title: "空间全景",
    description: "回到机房全景，下一轮从空间入口重新开始。",
    duration: 6,
    phase: "closed",
    view: "iso",
    actions: [{ type: "navigate", level: "room" }],
  },
];

export type TourState = {
  mode: "playing" | "paused" | "manual";
  step: number;
  elapsed: number;
  revision: number;
  cycle: number;
};
export type Experience = { scene: AppState; tour: TourState };
export type ExperienceAction =
  | { type: "scene"; action: Action }
  | { type: "simulation-tick" }
  | { type: "tour-tick"; delta: number; feedback: SceneFeedback | null }
  | { type: "tour-pause" | "tour-resume" | "tour-restart" | "takeover" };

export function createExperience(autoPlay = true): Experience {
  return {
    scene: createState(),
    tour: {
      mode: autoPlay ? "playing" : "manual",
      step: 0,
      elapsed: 0,
      revision: 0,
      cycle: 0,
    },
  };
}

function enterStep(state: Experience, step: number, cycle: number): Experience {
  return {
    scene: tourSteps[step].actions.reduce(transition, state.scene),
    tour: {
      mode: "playing",
      step,
      elapsed: 0,
      revision: state.tour.revision + 1,
      cycle,
    },
  };
}

export function experienceTransition(
  state: Experience,
  action: ExperienceAction,
): Experience {
  const { tour } = state;
  switch (action.type) {
    case "scene": {
      const scene = transition(state.scene, action.action);
      return {
        scene,
        tour: ["play", "tick", "rate", "replay", "loop"].includes(
          action.action.type,
        )
          ? tour
          : { ...tour, mode: "manual" },
      };
    }
    case "simulation-tick":
      return { ...state, scene: transition(state.scene, { type: "tick" }) };
    case "takeover":
      return tour.mode === "manual"
        ? state
        : { ...state, tour: { ...tour, mode: "manual" } };
    case "tour-pause":
      return tour.mode !== "playing"
        ? state
        : { ...state, tour: { ...tour, mode: "paused" } };
    case "tour-resume":
      return tour.mode === "paused"
        ? { ...state, tour: { ...tour, mode: "playing" } }
        : tour.mode === "manual"
          ? enterStep(state, 0, 0)
          : state;
    case "tour-restart":
      return enterStep(state, 0, 0);
    case "tour-tick": {
      if (tour.mode !== "playing") return state;
      const feedback = action.feedback;
      const step = tourSteps[tour.step];
      if (
        !feedback?.settled ||
        feedback.key !== presentationKey(state.scene) ||
        feedback.phase !== step.phase
      )
        return tour.elapsed === 0
          ? state
          : { ...state, tour: { ...tour, elapsed: 0 } };
      const dt = Number.isFinite(action.delta)
        ? Math.max(0, Math.min(0.25, action.delta))
        : 0;
      if (!dt) return state;
      const elapsed = tour.elapsed + dt;
      if (elapsed + 1e-6 < step.duration)
        return { ...state, tour: { ...tour, elapsed } };
      const next = (tour.step + 1) % tourSteps.length;
      return enterStep(state, next, tour.cycle + (next === 0 ? 1 : 0));
    }
  }
}
