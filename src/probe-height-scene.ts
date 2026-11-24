import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import { Vector3 } from "three";
import { environmentRoundFor } from "./environment-rounds.ts";
import { rackUnitAtHeight } from "./rack-installation.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

/** 将探头中心的机房 Y 投到已登记同排机柜的闭合柜门面上。 */
export function probeHeightScene(probeId: string, rackId?: string) {
  const round = environmentRoundFor(probeId);
  if (!round || round.probe.id !== probeId) return null;
  const rack =
    rackId === undefined
      ? round.racks[0]
      : round.racks.find((item) => item.id === rackId);
  if (!rack) return null;
  const probe = new Vector3().fromArray(round.probe.position);
  const { y: height } = probe;
  const placement = rackUnitAtHeight(rack.id, height);
  if (!placement) return null;
  const segment = placement.segment ?? null;
  const unit = segment ? placement.unit : null;
  const {
    unitOrigin,
    unitPitch,
    enclosure: { frontDoor },
  } = definition.rack;
  const unitBase = rack.position[1] + unitOrigin;
  const unitBottom = unit === null ? null : unitBase + (unit - 0.5) * unitPitch;
  const unitTop = unit === null ? null : unitBase + (unit + 0.5) * unitPitch;
  const front = new Vector3(
    rack.position[0],
    height,
    rack.position[2] + frontDoor.hingeZ,
  );
  // 真正的柜门投影和柜前通道里的尺线分开；主线避过整排关门外廓。
  const aisle = front.clone().setZ(front.z + 0.085);
  const ruler = [probe, probe.clone().setZ(aisle.z), aisle, front];
  const half = frontDoor.width / 2 - 0.038;
  const unitOutline =
    unitBottom === null || unitTop === null
      ? []
      : [
          new Vector3(front.x - half, unitBottom, aisle.z),
          new Vector3(front.x - half, unitTop, aisle.z),
          new Vector3(front.x + half, unitTop, aisle.z),
          new Vector3(front.x + half, unitBottom, aisle.z),
        ];
  const surface = unit === null ? "安装范围外" : `U${unit}`;
  return {
    kind: "probe-height" as const,
    id: `${probeId}:height:${rack.id}`,
    title: "探头与柜前标高核对",
    round,
    rack,
    unit,
    segment,
    upper: { id: probeId, name: round.probe.name, surface: "探头中心" },
    lower: { id: rack.id, name: rack.name, surface },
    points: [probe, front, ruler[1], aisle, ...unitOutline],
    markers: [
      {
        id: "probe-height-detector",
        title: `${round.probe.name} · ${height.toFixed(2)} m`,
        point: probe,
      },
      {
        id: "probe-height-rack",
        title: `${rack.name} · ${surface}`,
        point: front,
      },
    ],
    height,
    offsetX: front.x - probe.x,
    offsetZ: front.z - probe.z,
    unitBottom,
    unitTop,
    ruler,
    unitOutline,
  };
}

export type ProbeHeightScene = NonNullable<ReturnType<typeof probeHeightScene>>;

export function probeHeightViewFrame(
  pair: ProbeHeightScene,
  width: number,
  height: number,
  rect: FrameRect,
) {
  // 朝所有机柜的 +Z 正面看，适度抬高越过前排柜体，不移除中途设备。
  return observationFrame(
    pair.points,
    new Vector3(0.28, 0.43, 1),
    width,
    height,
    rect,
    4.3,
    0.19,
  );
}
