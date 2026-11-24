import type { AirflowRoute } from "./airflow.ts";
import { condensate, isCondensate } from "./condensate.ts";

export function coolingDrainLink(
  route: Pick<AirflowRoute, "sourceId" | "deviceId" | "endpoints">,
) {
  if (route.sourceId !== condensate.sourceId) return null;
  const supply = route.endpoints.find((endpoint) => endpoint.kind === "supply");
  const receiver = route.endpoints.find(
    (endpoint) => endpoint.kind === "receiver",
  );
  if (!supply || !receiver) return null;
  return {
    sourceId: route.sourceId,
    deviceId: route.deviceId,
    supplyHeight: supply.point[1],
    returnHeight: receiver.point[1],
    socketHeight: condensate.outletHeight,
  };
}

export function coolingDrainIncludes(id: string) {
  return (
    id === condensate.sourceId ||
    id === condensate.sensingCableId ||
    isCondensate(id)
  );
}
