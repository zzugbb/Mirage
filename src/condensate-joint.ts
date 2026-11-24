import { Vector3 } from "three";
import {
  condensate,
  condensateOpeningRadius,
  condensateSocket,
  condensateSource,
  mouth,
  outlet,
  rim,
  sleeveStart,
  turn,
} from "./condensate.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

export type DrainJointStage = "cabinet" | "mouth";
export const drainJointObjectIds = [
  condensate.sourceId,
  condensate.pipe.id,
  condensate.receiver.id,
];
const point = (coords: number[]) => new Vector3().fromArray(coords);

function ruler(from: Vector3, to: Vector3, tick: Vector3) {
  return [
    [from, to],
    ...[from, to].map((end) => [end.clone().sub(tick), end.clone().add(tick)]),
  ];
}

function cabinetJoint() {
  const wall = point(outlet),
    corner = point(turn);
  const socket = wall.clone().setX(wall.x + condensateSocket.length);
  const reachY = wall.y + condensateSocket.radius + 0.043;
  const socketY = wall.y + condensateSocket.radius + 0.012;
  // 只画露出段的两把尺。柜内的示意长度用配置核对，不做可见管路。
  const paths = [
    ...ruler(
      wall.clone().setY(reachY),
      corner.clone().setY(reachY),
      new Vector3(0, 0.007, 0),
    ),
    ...ruler(
      wall.clone().setY(socketY),
      socket.clone().setY(socketY),
      new Vector3(0, 0.007, 0),
    ),
  ];
  const markers = [
    {
      id: "drain-joint-cabinet",
      title: "制冷柜东壁",
      // 标签射线从套管旁指向柜壳，两种外观的壁面深度可不同。尺线仍从配置面量起。
      point: wall.clone().add(new Vector3(-0.16, 0.09, -0.075)),
    },
    {
      id: "drain-joint-elbow",
      title: "上游转角",
      point: corner.clone().add(new Vector3(0.008, 0.004, -0.019)),
    },
  ];
  return {
    stage: "cabinet" as const,
    upper: {
      id: condensate.sourceId,
      name: condensateSource.name,
      surface: "东壁配置面",
    },
    lower: {
      id: condensate.pipe.id,
      name: condensate.pipe.name,
      surface: "上游转角",
    },
    metrics: {
      height: wall.y,
      inset: wall.x - sleeveStart[0],
      reach: corner.x - wall.x,
      socketLength: condensateSocket.length,
    },
    points: [
      wall,
      corner,
      socket,
      ...paths.flat(),
      ...markers.map((marker) => marker.point),
    ],
    markers,
    paths,
  };
}

function mouthJoint() {
  const pipe = point(mouth),
    bowl = point(rim);
  const direction = pipe.clone().sub(bowl).setY(0);
  const planarOffset = direction.length();
  if (planarOffset) direction.divideScalar(planarOffset);
  else direction.set(0, 0, 1);
  const marginsHeight = bowl.y + 0.018;
  const marginStart = pipe
    .clone()
    .addScaledVector(direction, condensate.pipeRadius)
    .setY(marginsHeight);
  const marginEnd = bowl
    .clone()
    .addScaledVector(direction, condensateOpeningRadius)
    .setY(marginsHeight);
  const tick = new Vector3(direction.z, 0, -direction.x).multiplyScalar(0.009);
  const upperTick = new Vector3(
    bowl.x + condensate.rimRadius + 0.044,
    pipe.y,
    bowl.z,
  );
  const lowerTick = upperTick.clone().setY(bowl.y);
  const pipeEdge = pipe.clone().setX(pipe.x + condensate.pipeRadius);
  const rimEdge = bowl.clone().setX(bowl.x + condensateOpeningRadius);
  // 外侧竖尺与口缘上方的径向尺分开；斗口中不画液面或落水线。
  const paths = [
    [pipeEdge, upperTick],
    [rimEdge, lowerTick],
    ...ruler(upperTick, lowerTick, new Vector3(0.008, 0, 0)),
    ...ruler(marginStart, marginEnd, tick),
  ];
  const markers = [
    {
      id: "drain-joint-pipe",
      title: "立管下口",
      point: pipe.clone().add(new Vector3(0.019, 0.004, 0.012)),
    },
    {
      id: "drain-joint-mouth",
      title: "接水斗口内沿",
      point: bowl.clone().add(new Vector3(0.055, 0.001, 0.084)),
    },
  ];
  return {
    stage: "mouth" as const,
    upper: {
      id: condensate.pipe.id,
      name: condensate.pipe.name,
      surface: "立管下口",
    },
    lower: {
      id: condensate.receiver.id,
      name: condensate.receiver.name,
      surface: "斗口内沿",
    },
    metrics: {
      verticalGap: pipe.y - bowl.y,
      planarOffset,
      pipeDiameter: condensate.pipeRadius * 2,
      openingDiameter: condensateOpeningRadius * 2,
      radialMargin:
        condensateOpeningRadius - condensate.pipeRadius - planarOffset,
    },
    points: [
      pipe,
      bowl,
      ...paths.flat(),
      ...markers.map((marker) => marker.point),
    ],
    markers,
    paths,
  };
}

export function drainJointInspection(stage: DrainJointStage) {
  return {
    kind: "drain-joint" as const,
    id: `${condensate.pipe.id}:joint:${stage}`,
    title: "冷凝水排水接合核对",
    ...(stage === "cabinet" ? cabinetJoint() : mouthJoint()),
  };
}

export type DrainJointInspection = ReturnType<typeof drainJointInspection>;

export function drainJointFrame(
  pair: DrainJointInspection,
  width: number,
  height: number,
  rect: FrameRect,
) {
  const direction =
    pair.stage === "cabinet"
      ? new Vector3(0.64, 0.28, -1)
      : new Vector3(0.85, 0.44, 0.55);
  return observationFrame(
    pair.points,
    direction,
    width,
    height,
    rect,
    pair.stage === "cabinet" ? 0.6 : 0.73,
    0.04,
  );
}
