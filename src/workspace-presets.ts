import { reviewLayers, reviewTransition } from "./review-model.ts";
import type { ReviewLayer, ReviewState } from "./review-model.ts";
import type { Level } from "./domain.ts";
import type { Resource } from "./review-resources.ts";
import type { SpatialReading } from "./spatial.ts";

export const workspaceShots = [
  { id: "overview", name: "机房浏览" },
  { id: "structure", name: "设备内部" },
  { id: "alarms", name: "告警排查" },
  { id: "time", name: "时间分析" },
] as const;
export type WorkspaceShot = (typeof workspaceShots)[number]["id"];

export const resourceViews = {
  list: "列表",
  installation: "安装图",
  layout: "布置图",
  space: "空间核查",
  aisles: "排间通道",
  network: "网络接入",
  airflow: "气流路径",
  alarms: "告警清单",
  inlet: "进风对照",
  probes: "环境测点",
  power: "功耗对照",
  feeders: "配电出线",
} as const;
export type ResourceView = keyof typeof resourceViews;

export type WorkspaceView = ReviewLayer | "space" | "network";
type WorkspaceEntry = {
  id: WorkspaceView;
  name: string;
  description: string;
  roomDescription?: string;
  layer: ReviewLayer;
  roomResources?: readonly ResourceView[];
};

const [overview, temperature, cooling, power, alarms] = reviewLayers;

// 空间和网络共用总览图层，资源呈现决定机房的当前入口。
export const workspaceEntries: readonly WorkspaceEntry[] = [
  {
    ...overview,
    layer: overview.id,
    roomDescription: "查找机柜、设备与设施",
    roomResources: ["list"],
  },
  {
    id: "space",
    name: "空间",
    description: "布置图、U 位容量和排间通道",
    layer: "overview",
    roomResources: ["layout", "space", "aisles"],
  },
  {
    ...temperature,
    layer: temperature.id,
    roomDescription: "设备进风、温度切片与环境测点",
  },
  { ...cooling, layer: cooling.id },
  { ...power, layer: power.id },
  {
    id: "network",
    name: "网络",
    description: "查设备接入、端口和走线路径",
    layer: "overview",
    roomResources: ["network"],
  },
  { ...alarms, layer: alarms.id },
];

export function activeWorkspaceEntry(
  level: Level,
  layer: ReviewLayer,
  resource: ResourceView,
) {
  const specialized =
    level === "room" && layer === "overview"
      ? workspaceEntries.find(
          (entry) =>
            entry.layer === layer && entry.roomResources?.includes(resource),
        )
      : undefined;
  return specialized ?? workspaceEntries.find((entry) => entry.id === layer)!;
}

// 第一项是从其他图层进入时使用的清单。已选的呈现只在当前范围支持时保留。
export function navigationViews(
  level: Level,
  layer: ReviewLayer,
): ResourceView[] {
  if (level === "device") return ["list"];
  if (level === "rack") {
    if (layer === "overview") return ["installation", "list", "space"];
    return layer === "alarms"
      ? ["list", "installation"]
      : ["installation", "list"];
  }
  if (layer === "overview")
    return ["list", "layout", "space", "aisles", "network"];
  if (layer === "environment") return ["inlet", "probes", "list"];
  if (layer === "power") return ["power", "feeders", "list"];
  return layer === "airflow" ? ["airflow", "list"] : ["alarms", "list"];
}

export function workspacePreset(
  current: ReviewState,
  shot: WorkspaceShot,
): ReviewState {
  const next = reviewTransition(current, {
    type: "shot",
    shot: shot === "structure" || shot === "time" ? "assembly" : "overview",
  });
  if (shot === "alarms") next.layer = "alarms";
  if (shot === "time") {
    next.scene.explosion = 0;
    next.scene.coverOpen = true;
    next.analysis = true;
  }
  return next;
}

/** 保留资源的结构顺序；部件模型评估不能充当独立设备告警。 */
export function visibleResourceRows(
  rows: Resource[],
  readings: Map<string, SpatialReading>,
  onlyAlarms: boolean,
): Resource[] {
  return onlyAlarms
    ? rows.filter(
        (row) => row.kind !== "part" && (readings.get(row.id)?.alarm ?? 0) > 0,
      )
    : rows;
}
export function resourceRowText(resource: Resource, includeLocation = false) {
  const device = ["server", "switch", "storage"].includes(resource.kind);
  return {
    title: device ? resource.name.split(" · ").at(-1)! : resource.name,
    detail: device
      ? `${resource.name.split(" · ")[0]} · ${includeLocation ? resource.location : resource.location.split(" / ").at(-1)}`
      : resource.kind === "rack"
        ? resource.detail.split(" · ").slice(0, 2).join(" · ")
        : resource.kind === "part"
          ? resource.detail.replace(/ · 独立部件$/, "")
          : resource.detail,
  };
}
