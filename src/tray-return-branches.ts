import { airflowSnapshot, representativeAirflowDevice } from "./airflow.ts";
import { airflowReturnTray } from "./airflow-return-tray.ts";
import { trayRow } from "./cable-trays.ts";
import { unitLabel } from "./catalog.ts";
import { roomFacilityById } from "./fixtures.ts";
import { racks } from "./installation.ts";
import type { SpatialReading } from "./spatial.ts";

/** 在每柜代表支路中按实际平面交会反查指定侧梁，不参与运行读数汇总。 */
export function trayReturnBranches(trayId: string) {
  if (!trayRow(trayId)) return [];
  const readings = new Map<string, SpatialReading>();
  return racks.flatMap((rack) => {
    const device = representativeAirflowDevice(rack.id);
    if (!device) return [];
    const [route] = airflowSnapshot(0, readings, device.id).routes;
    if (!route) return [];
    const crossings = airflowReturnTray(route).crossings.filter(
      (crossing) => crossing.fixtureId === trayId,
    );
    if (!crossings.length) return [];
    return [
      {
        rackId: rack.id,
        rackName: rack.name,
        deviceId: device.id,
        deviceName: device.name,
        units: unitLabel(device.id),
        sourceId: route.sourceId,
        sourceName: roomFacilityById(route.sourceId)!.name,
        crossings,
      },
    ];
  });
}

export type TrayReturnBranch = ReturnType<typeof trayReturnBranches>[number];
