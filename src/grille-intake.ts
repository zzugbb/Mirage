import { Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { airflowSnapshot } from "./airflow.ts";
import type { GrilleSeat } from "./grille-seat.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

/** 代表设备、落点和进风标记复用现有机房气流配置。尺寸从格栅开口面量起。 */
export function grilleIntakeInspection(seat: GrilleSeat) {
  const { branch } = seat;
  if (!branch || seat.reference) return null;
  const route = airflowSnapshot(0, new Map(), branch.device.id).routes.find(
    (candidate) =>
      candidate.rackId === branch.rack.id &&
      candidate.deviceId === branch.device.id &&
      candidate.floorGrille.id === seat.id,
  );
  if (!route) return null;
  const floor = route.endpoints.find((endpoint) => endpoint.kind === "floor");
  const endpoint = route.endpoints.find((item) => item.kind === "intake");
  if (!floor || !endpoint) return null;
  const opening = new Vector3()
    .fromArray(floor.point)
    .setY(route.floorGrille.position[1]);
  const intake = new Vector3().fromArray(endpoint.point);
  const projected = intake.clone().setY(opening.y);
  const { x, y, z } = intake.clone().sub(opening);
  const [width, height] = route.faceSize;
  const faceOutline = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([dx, dy]) =>
    intake.clone().add(new Vector3((dx * width) / 2, (dy * height) / 2, 0)),
  );
  // 水平投影略抬高以避开地面；竖尺避开进风框，并保留两端刻线。
  const plan = [opening, projected].map((point) =>
    point.clone().setY(opening.y + 0.008),
  );
  const rulerOffset = new Vector3(width / 2 + 0.09, 0, 0.018);
  const heightRuler = [projected, intake].map((point) =>
    point.clone().add(rulerOffset),
  );
  const doorZ =
    branch.rack.position[2] + definition.rack.enclosure.frontDoor.hingeZ;
  return {
    kind: "grille-intake" as const,
    title: "格栅落点与进风位置",
    id: `${seat.id}:intake:${route.deviceId}`,
    seat,
    route,
    upper: { id: seat.row.id, name: seat.row.name, surface: "格栅开口面中心" },
    lower: {
      id: route.rackId,
      name: branch.rack.name,
      surface: "代表进风位置",
    },
    offsets: { x, y, z },
    opening,
    intake,
    projected,
    plan,
    heightRuler,
    faceOutline,
    points: [
      opening,
      intake,
      projected,
      ...seat.outline,
      ...heightRuler,
      ...faceOutline,
    ],
    markers: [
      {
        id: "grille-intake-grille",
        title: `${seat.index + 1} 号格栅`,
        point: seat.points[1],
      },
      {
        id: "grille-intake-device",
        title: `${branch.device.name} · 代表进风`,
        point: intake.clone().setZ(doorZ),
      },
    ],
  };
}

export type GrilleIntakeInspection = NonNullable<
  ReturnType<typeof grilleIntakeInspection>
>;

export function grilleIntakeViewFrame(
  pair: GrilleIntakeInspection,
  width: number,
  height: number,
  rect: FrameRect,
) {
  // 从柜前斜看，格栅和进风框均可见；排间取景经过相邻机柜之间的空隙。
  return observationFrame(
    pair.points,
    new Vector3(-0.42, 0.58, 1),
    width,
    height,
    rect,
    2.55,
    0.095,
  );
}
