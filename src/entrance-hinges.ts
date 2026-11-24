import { Vector3 } from "three";
import {
  entranceFixture,
  entranceHinges,
  entranceOpening,
  entranceSettings as s,
} from "./entrance.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

const labels = ["下铰链", "中铰链", "上铰链"];

function axisDashes(start: Vector3, end: Vector3, pitch: number) {
  const count = Math.ceil(start.distanceTo(end) / pitch);
  return Array.from({ length: count }, (_, i) => [
    start.clone().lerp(end, i / count),
    start.clone().lerp(end, (i + 0.62) / count),
  ]);
}

/** 从同一门扇轴心量取已登记的三处轴段。门框和门扇标记分别指向现有构件的可见面。 */
export function entranceHingeInspection(sample?: number) {
  const origin = new Vector3().fromArray(entranceFixture.position);
  const joints = entranceHinges.map(({ index, name, fromBottom, offset }) => ({
    index,
    name,
    fromBottom,
    label: labels[index],
    center: new Vector3().fromArray(offset).add(origin),
  }));
  const joint = sample === undefined ? undefined : joints[sample];
  const hinges = {
    joints,
    selected: joint?.index ?? null,
    spacing: joints
      .slice(1)
      .map(({ center }, i) => center.y - joints[i].center.y),
    diameter: s.hingeRadius * 2,
    length: s.hingeLength,
  };
  const markers = (joint ? [joint] : joints).map(({ name, label, center }) => ({
    id: name,
    title: label,
    point: center.clone().setZ(center.z + s.hingeRadius * 0.96),
  }));
  const { x, z } = joints[0].center;
  const ruler = (y: number) => new Vector3(x - 0.105, y, z + 0.041);
  const tick = (center: Vector3) => [
    center.clone().setX(center.x - 0.024),
    center.clone().setX(center.x + 0.024),
  ];
  if (joint) {
    const { center } = joint;
    const jambFace = new Vector3(
      entranceOpening.left + s.frameWidth * 0.48,
      center.y + 0.078,
      z,
    );
    const leafFace = new Vector3(0.154, -0.043, 0)
      .applyAxisAngle(new Vector3(0, 1, 0), s.displayAngle)
      .add(center);
    markers.push(
      { id: "entrance-hinge-frame", title: "固定门框", point: jambFace },
      { id: "entrance-hinge-leaf", title: "门扇", point: leafFace },
    );
    const ends = [
      ruler(center.y - s.hingeLength / 2),
      ruler(center.y + s.hingeLength / 2),
    ];
    const paths = [ends, ...ends.map(tick)];
    const points = [
      ...paths.flat(),
      ...markers.map((m) => m.point),
      center.clone().add(new Vector3(-0.15, 0.155, 0)),
      center.clone().add(new Vector3(0.23, -0.155, 0.17)),
    ];
    return { hinges, paths, markers, points };
  }
  const paths = [
    ...axisDashes(
      ruler(joints[0].center.y),
      ruler(joints.at(-1)!.center.y),
      0.105,
    ),
    ...joints.map(({ center }) => tick(ruler(center.y))),
  ];
  const points = [
    ...paths.flat(),
    ...markers.map((m) => m.point),
    new Vector3(entranceOpening.left, entranceOpening.bottom, z),
    new Vector3(entranceOpening.left, entranceOpening.top, z),
    new Vector3(x + 0.63, entranceOpening.top, z + 0.38),
  ];
  return { hinges, paths, markers, points };
}

export function entranceHingeFrame(
  inspection: ReturnType<typeof entranceHingeInspection>,
  width: number,
  height: number,
  rect: FrameRect,
) {
  const overview = inspection.hinges.selected === null;
  return observationFrame(
    inspection.points,
    new Vector3(overview ? -0.4 : -0.3, overview ? 0.052 : 0.1, 1),
    width,
    height,
    rect,
    overview ? 3.8 : 0.76,
    overview ? 0.075 : 0.05,
  );
}
