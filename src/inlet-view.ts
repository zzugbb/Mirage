import { Box3, Ray, Vector3 } from "three";
import definition from "../assets/public/scenes/room-01.json" with { type: "json" };
import {
  deviceById,
  deviceHeight,
  rackForDevice,
  racks,
} from "./installation.ts";
import { modelForDevice, unitLabel } from "./catalog.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

export type InletViewPair = { firstId: string; secondId: string };
export type InletViewCommand = {
  revision: number;
  action: "observe" | "return";
};
/** 安装跨度沿用柜面代表位置，不增加风口、测点或两设备间的关系。 */
export function inletInspection(pair: InletViewPair) {
  if (
    pair.firstId === pair.secondId ||
    !deviceById(pair.firstId) ||
    !deviceById(pair.secondId)
  )
    return null;
  const devices = [pair.firstId, pair.secondId].map((id) => {
    const device = deviceById(id)!,
      rack = rackForDevice(id);
    const point = new Vector3(
      rack.position[0],
      deviceHeight(id),
      rack.position[2] +
        definition.rack.size[2] / 2 +
        definition.airflow.faceClearance,
    );
    const halfHeight =
      (modelForDevice(id).units * definition.rack.unitPitch - 0.003) / 2;
    const corners = [
      [-0.25, -halfHeight],
      [0.25, -halfHeight],
      [0.25, halfHeight],
      [-0.25, halfHeight],
    ].map(([x, y]) => point.clone().add(new Vector3(x, y, 0)));
    return {
      id,
      name: device.name,
      rackId: rack.id,
      location: `${rack.name.split(" ")[0]} / ${unitLabel(id)}`,
      point,
      corners,
    };
  });
  return {
    pair: { ...pair },
    crossRack: devices[0].rackId !== devices[1].rackId,
    devices,
    points: devices.flatMap((device) => device.corners),
  };
}
export type InletInspection = NonNullable<ReturnType<typeof inletInspection>>;
const blockers = racks.map((rack) =>
  new Box3().setFromCenterAndSize(
    new Vector3(
      rack.position[0],
      rack.position[1] + definition.rack.size[1] / 2,
      rack.position[2],
    ),
    new Vector3(...definition.rack.size),
  ),
);
export function inletViewFrame(
  inspection: InletInspection,
  width: number,
  height: number,
  rect: FrameRect,
) {
  // 从柜前选择不穿过既有柜体的方向；保留深度测试，不透视柜体。
  let best: ReturnType<typeof observationFrame> | undefined,
    score = Infinity;
  for (const y of [0.35, 0.8, 1.5, 2.5, 4, 6])
    for (const x of [0, 0.8, -0.8, 1.8, -1.8, 3, -3]) {
      const fit = observationFrame(
        inspection.points,
        new Vector3(x, y, 1),
        width,
        height,
        rect,
        2.2,
        0.16,
      );
      let blocked = 0;
      for (const point of inspection.points)
        for (const box of blockers) {
          const hit = new Ray(
            fit.position,
            point.clone().sub(fit.position).normalize(),
          ).intersectBox(box, new Vector3());
          if (
            hit &&
            hit.distanceTo(fit.position) <
              point.distanceTo(fit.position) - 0.001
          )
            blocked++;
        }
      const candidate =
        blocked * 10000 + y * 2 + Math.abs(x) + fit.distance * 0.01;
      if (candidate < score) {
        best = fit;
        score = candidate;
      }
    }
  return best!;
}
