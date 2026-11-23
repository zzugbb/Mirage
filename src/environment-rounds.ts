import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { trayEndpoints } from "./cable-trays.ts";
import { rackById } from "./installation.ts";

/** 柜排仅用于组织巡检。成员由配置指定，不按最近距离推断监测范围。 */
export const environmentRounds = definition.room.environmentRounds.map(
  ({ rowId, smokeId, trayId, probeId }) => {
    const row = definition.temperatureSlice.vertical.rows.find(
      (r) => r.id === rowId,
    )!;
    const points = [smokeId, trayId, probeId].map((id) =>
      definition.room.fixtures.find((f) => f.id === id)!,
    );
    const [smoke, tray, probe] = points;
    const [start, end] = trayEndpoints(tray.id);
    // 将烟感中心投影到已登记的水平桥架中心线段，端部以外取最近端点。
    const nearestX = Math.max(start[0], Math.min(end[0], smoke.position[0]));
    return {
      row,
      racks: row.rackIds.map((id) => rackById(id)!),
      points,
      probe,
      trayReference: [nearestX, tray.position[1], tray.position[2]],
      smokeOffset: Math.hypot(
        smoke.position[0] - nearestX,
        smoke.position[2] - tray.position[2],
      ),
    };
  },
);
export type EnvironmentRound = (typeof environmentRounds)[number];
export function environmentRoundFor(id: string) {
  return environmentRounds.find(({ points }) =>
    points.some((point) => point.id === id),
  );
}
