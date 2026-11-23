import type { AirflowRoute, FlowEndpoint } from "./airflow.ts";
import type { AppState } from "./domain.ts";
import { grilleRowForRack } from "./floor-grilles.ts";

export function airflowEndpointObject(
  route: AirflowRoute,
  kind: FlowEndpoint["kind"],
) {
  if (kind === "floor")
    return {
      id: grilleRowForRack(route.rackId)!.id,
      name: "格栅排",
      locate: "定位格栅排",
    };
  if (kind === "intake")
    return { id: route.deviceId, name: "进风设备", locate: "定位安装位" };
  return {
    id: route.sourceId,
    name: kind === "return" ? "回风关联" : "制冷单元",
    locate: "定位制冷单元",
  };
}

export type AirflowInspection = {
  originId: string;
  targetId: string;
  deviceId: string;
  context: string;
  nav: boolean;
  inspector: boolean;
  analysis: boolean;
};

/** 回看与播放不改变核对范围；定位、图层和演示预设会结束往返。 */
export function airflowInspectionContext(
  state: Pick<AppState, "level" | "focusRevision">,
  layer: string,
  revision: number,
) {
  return JSON.stringify([state.level, state.focusRevision, layer, revision]);
}

export function activeAirflowInspection(
  visit: AirflowInspection | null,
  selectedId: string,
  context: string,
) {
  return visit?.targetId === selectedId && visit.context === context
    ? visit
    : null;
}

/** 连续核对不同端点时保留首次对象和面板状态，只固定设备身份，不冻结读数。 */
export function beginAirflowInspection(
  previous: AirflowInspection | null,
  route: AirflowRoute,
  targetId: string,
  origin: Omit<AirflowInspection, "targetId" | "deviceId">,
): AirflowInspection | null {
  if (
    !route.endpoints.some(
      (endpoint) => airflowEndpointObject(route, endpoint.kind).id === targetId,
    )
  )
    return null;
  const anchor =
    previous?.context === origin.context && previous.deviceId === route.deviceId
      ? previous
      : origin;
  return { ...anchor, targetId, deviceId: route.deviceId };
}
