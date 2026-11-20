import { reviewTransition } from "./review-model.ts";
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
  network: "网络接入",
  airflow: "气流路径",
  alarms: "告警清单",
  inlet: "进风对照",
  power: "功耗对照",
} as const;
export type ResourceView = keyof typeof resourceViews;

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
  if (layer === "overview") return ["list", "layout", "space", "network"];
  if (layer === "environment") return ["inlet", "list"];
  if (layer === "power") return ["power", "list"];
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
