import { airflowSnapshot } from "./airflow.ts";
import { pduOutlet } from "./pdu-outlets.ts";

/** 按插座的登记对端查代表气流，仅用于配置关系核对。 */
export function outletAirflow(pduId: string, outlet: number | null) {
  const input = pduOutlet(pduId, outlet)?.link;
  if (!input) return null;
  const route = airflowSnapshot(0, new Map(), input.deviceId).routes.find(
    (item) => item.deviceId === input.deviceId,
  );
  return route ? { input, route } : null;
}
