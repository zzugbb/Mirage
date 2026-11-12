import type { AirflowRoute } from "./airflow.ts";
import { coolingRelations, coolingSource } from "./cooling.ts";
import { deviceById } from "./installation.ts";
import {
  reviewHistory,
  reviewEvents,
  type ReviewPoint,
  type ReviewEvent,
} from "./review-model.ts";
import { coolingCapacityAt, simulate } from "./simulation.ts";

export type AirflowResponseTarget = Pick<
  AirflowRoute,
  "id" | "sourceId" | "deviceId"
>;
/** 固定可见支路的已登记两端，不借用范围最高值或部件推导。 */
export function airflowResponseTarget(route: AirflowResponseTarget) {
  return deviceById(route.deviceId) &&
    route.sourceId === coolingSource.id &&
    coolingRelations.some(
      (link) =>
        link.id === route.id &&
        link.source === route.sourceId &&
        link.target === route.deviceId,
    )
    ? { id: route.id, sourceId: route.sourceId, deviceId: route.deviceId }
    : null;
}
export function airflowResponseHistory(target: AirflowResponseTarget) {
  if (!airflowResponseTarget(target)) return null;
  const cooling: ReviewPoint[] = Array.from({ length: 121 }, (_, time) => ({
    time,
    value: Math.round(coolingCapacityAt(time)),
    quality: "valid",
    coverage: 1,
    count: 1,
  }));
  return {
    cooling,
    temperature: reviewHistory(target.deviceId, target.deviceId, "temperature"),
  };
}
/** 回看和分段观察保留对照；选择、路径配置或固定演示画面会结束。 */
export function airflowResponseContext(context: string, selected: string) {
  return JSON.stringify([context, selected]);
}

/** 公共输入独立于设备采样质量；设备历史仍受最后观测时间约束。 */
export function airflowResponseEvents(
  target: AirflowResponseTarget,
  time: number,
  cycle = 0,
): ReviewEvent[] {
  if (!airflowResponseTarget(target)) return [];
  const inputs = simulate(time, cycle, target.deviceId)
    .events.filter(
      (event) =>
        event.kind === "input" &&
        event.entityId === target.sourceId &&
        event.time <= time,
    )
    .map((event) => ({ ...event, deviceIds: [target.deviceId] }));
  return [
    ...inputs,
    ...reviewEvents([target.deviceId], time, cycle).filter(
      (event) => event.kind !== "input",
    ),
  ].sort((a, b) => b.time - a.time || a.id.localeCompare(b.id));
}
