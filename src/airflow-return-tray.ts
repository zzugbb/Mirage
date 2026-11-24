import { Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import type { AirflowRoute, FlowPoint } from "./airflow.ts";
import { cableTraySettings as tray } from "./cable-trays.ts";

const tolerance = 1e-8;
const sides = [-1, 1] as const;
const trays = definition.room.fixtures.filter(
  (fixture) =>
    fixture.kind === "cable-tray" &&
    tray.rows.some((row) => row.fixtureId === fixture.id),
);

type RailCrossing = {
  id: string;
  fixtureId: string;
  fixtureName: string;
  side: (typeof sides)[number];
  title: string;
  path: Vector3;
  bottom: Vector3;
  clearance: number;
  instanceId: number;
};

function crossingsAtZ(points: FlowPoint[], z: number) {
  const crossings: { order: number; path: Vector3 }[] = [];
  let previous = -1;
  for (const [index, current] of points.entries()) {
    if (Math.abs(current[2] - z) < tolerance) continue;
    const start = points[previous];
    if (start && (start[2] - z) * (current[2] - z) < 0) {
      const vertices = points.slice(previous + 1, index);
      const first = vertices[0];
      // 同一点的重复折点只计一次，沿梁轴线行进的区间不算独立交会。
      if (!first) {
        const fraction = (z - start[2]) / (current[2] - start[2]);
        crossings.push({
          order: previous + fraction,
          path: new Vector3(...start)
            .lerp(new Vector3(...current), fraction)
            .setZ(z),
        });
      } else if (
        vertices.every((vertex) =>
          vertex.every(
            (value, dim) => Math.abs(value - first[dim]) < tolerance,
          ),
        )
      ) {
        crossings.push({
          order: previous + 1,
          path: new Vector3(...first).setZ(z),
        });
      }
    }
    previous = index;
  }
  return crossings;
}

/** 俯视对应取回风中心线与侧梁轴线交点，量距取该处中心线与侧梁底面。 */
export function airflowReturnTray(route: AirflowRoute) {
  const returnPoints =
    route.segments.find(({ kind }) => kind === "return")?.points ?? [];
  const ordered: { order: number; crossing: RailCrossing }[] = [];
  for (const fixture of trays) {
    const [centerX, centerY, centerZ] = fixture.position;
    for (const [sideIndex, side] of sides.entries()) {
      const z = centerZ + (side * tray.railSpacing) / 2;
      const title = side > 0 ? "+Z 侧梁" : "−Z 侧梁";
      let index = 0;
      for (const { order, path } of crossingsAtZ(returnPoints, z)) {
        if (Math.abs(path.x - centerX) > tray.length / 2 + tolerance) continue;
        const bottom = path
          .clone()
          .setY(centerY + tray.railCenterY - tray.railSize[1] / 2);
        ordered.push({
          order,
          crossing: {
            id: `return-tray-${fixture.id}-${side}-${index++}`,
            fixtureId: fixture.id,
            fixtureName: fixture.name,
            side,
            title,
            path,
            bottom,
            clearance: bottom.y - path.y,
            // 一根侧梁与两端端帽在同一实例批次内依次生成。
            instanceId: sideIndex * 3,
          },
        });
      }
    }
  }
  const crossings = ordered
    .sort((a, b) => a.order - b.order)
    .map(({ crossing }) => crossing);
  const paths = crossings.flatMap(({ path, bottom }) => [
    [path, bottom],
    ...[path, bottom].map((end) => [
      end.clone().setX(end.x - 0.045),
      end.clone().setX(end.x + 0.045),
    ]),
  ]);
  const markers = crossings.map(({ id, title, fixtureId, bottom }) => ({
    id,
    title,
    point: bottom.clone().setY(bottom.y + tray.railSize[1] / 2),
    objectId: fixtureId,
  }));
  return {
    crossings,
    points: [...paths.flat(), ...markers.map(({ point }) => point)],
    paths,
    markers,
  };
}
