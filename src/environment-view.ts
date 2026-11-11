import { Vector3 } from "three";
import { environmentProbe } from "./environment-monitoring.ts";
import { environmentPair, type EnvironmentPair } from "./environment-pair.ts";
import { observationFrame, type FrameRect } from "./observation-frame.ts";

export type EnvironmentViewCommand = {
  revision: number;
  action: "observe" | "return";
};
/** 只对照已登记点位的布置，不从两点之间生成测点、插值或覆盖范围。 */
export function environmentInspection(pair: EnvironmentPair) {
  if (!environmentPair(pair.firstId, pair.secondId)) return null;
  const probes = [pair.firstId, pair.secondId].map((id) => {
    const fixture = environmentProbe(id)!.fixture;
    return { id, name: fixture.name, point: new Vector3(...fixture.position) };
  });
  const points = probes.flatMap(({ point }) => [
    point.clone(),
    point.clone().setY(0),
  ]);
  return {
    pair: { ...pair },
    probes,
    points,
    distance: probes[0].point.distanceTo(probes[1].point),
  };
}
export type EnvironmentInspection = NonNullable<
  ReturnType<typeof environmentInspection>
>;
export function environmentViewFrame(
  inspection: EnvironmentInspection,
  width: number,
  height: number,
  rect: FrameRect,
) {
  // 当前两点同装左墙；从室内上方观察，视线越过已登记柜体，保留墙面与深度遮挡。
  return observationFrame(
    inspection.points,
    new Vector3(0.8, 1.15, 0.08),
    width,
    height,
    rect,
    4,
    0.18,
  );
}
