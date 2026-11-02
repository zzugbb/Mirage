import { createReview, reviewTransition } from "./review-model.ts";
import type { ReviewState } from "./review-model.ts";
import type { Resource } from "./review-resources.ts";
import type { SpatialReading } from "./spatial.ts";

export const studyShots = [
  { id: "overview", name: "机房浏览" },
  { id: "structure", name: "设备内部" },
  { id: "alarms", name: "告警排查" },
  { id: "time", name: "时间分析" },
] as const;
export type StudyShot = (typeof studyShots)[number]["id"];

export function studyPreset(
  current: ReviewState,
  shot: StudyShot,
): ReviewState {
  const next = reviewTransition(current, {
    type: "shot",
    shot: shot === "structure" || shot === "time" ? "assembly" : "overview",
  });
  if (shot === "alarms") {
    next.layer = "alarms";
    next.selectedId = "rack-a01";
  }
  if (shot === "time") {
    next.scene.explosion = 0;
    next.scene.coverOpen = true;
    next.analysis = true;
  }
  return next;
}
export const initialStudy = () => createReview();

/** 保留资源的结构顺序；部件模型评估不能充当独立设备告警。 */
export function studyVisibleRows(
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
export function studyRowText(resource: Resource) {
  const device = ["server", "switch", "storage"].includes(resource.kind);
  return {
    title: device ? resource.name.split(" · ").at(-1)! : resource.name,
    detail: device
      ? `${resource.name.split(" · ")[0]} · ${resource.location.split(" / ").at(-1)}`
      : resource.kind === "rack"
        ? resource.detail.split(" · ").slice(0, 2).join(" · ")
        : resource.detail,
  };
}
