import { reviewTransition } from "./review-model.ts";
import type { ReviewState } from "./review-model.ts";
import type { Resource } from "./review-resources.ts";
import type { SpatialReading } from "./spatial.ts";

export const workspaceShots = [
  { id: "overview", name: "机房浏览" },
  { id: "structure", name: "设备内部" },
  { id: "alarms", name: "告警排查" },
  { id: "time", name: "时间分析" },
] as const;
export type WorkspaceShot = (typeof workspaceShots)[number]["id"];

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
