import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { Vector3 } from "three";
import type { AirflowRoute } from "./airflow.ts";
import { coolingRelations } from "./cooling.ts";
import { floorSurfaceY } from "./floor-grilles.ts";

function dashedEdge(from: Vector3, to: Vector3) {
  const count = Math.max(1, Math.ceil(from.distanceTo(to) / 0.14));
  return Array.from({ length: count }, (_, index) => [
    from.clone().lerp(to, index / count),
    from.clone().lerp(to, (index + 0.62) / count),
  ]);
}

/** 沿机房 Z 轴量取逻辑端点相对配置柜面的有符号偏移。 */
export function coolingTerminalFace(
  route: Pick<AirflowRoute, "sourceId" | "endpoints">,
) {
  const source = definition.facilities.find(
    (item) => item.id === route.sourceId,
  );
  const supply = route.endpoints.find((endpoint) => endpoint.kind === "supply");
  const receiver = route.endpoints.find(
    (endpoint) => endpoint.kind === "receiver",
  );
  if (
    !source ||
    !coolingRelations.some((relation) => relation.source === source.id) ||
    !supply ||
    !receiver ||
    !supply.point.every(Number.isFinite) ||
    !receiver.point.every(Number.isFinite)
  )
    return null;

  const [x, y, z] = source.position;
  const [width, height, depth] = source.size;
  const faceZ = z + depth / 2;
  const terminals = (
    [
      ["supply", supply],
      ["receiver", receiver],
    ] as const
  ).map(([kind, endpoint]) => {
    const point = new Vector3(...endpoint.point);
    return {
      kind,
      title: endpoint.title,
      point,
      projection: point.clone().setZ(faceZ),
      offset: point.z - faceZ,
      heightAboveFloor: point.y - floorSurfaceY,
    };
  });
  const tick = new Vector3(0, 0.036, 0);
  const rulers = terminals.flatMap(({ point, projection }) => [
    [projection, point],
    ...[projection, point].map((end) => [
      end.clone().sub(tick),
      end.clone().add(tick),
    ]),
  ]);
  // 虚线略离表面以避开与简模柜面重合，量尺端点仍取实际配置坐标。
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(
    ([sx, sy]) =>
      new Vector3(x + (sx * width) / 2, y + (sy * height) / 2, faceZ + 0.003),
  );
  const outline = corners.flatMap((corner, index) =>
    dashedEdge(corner, corners[(index + 1) % corners.length]),
  );
  return {
    source,
    faceZ,
    floorY: floorSurfaceY,
    separation: Math.abs(receiver.point[1] - supply.point[1]),
    terminals,
    rulers,
    outline,
    points: [...rulers, ...outline].flat(),
  };
}
