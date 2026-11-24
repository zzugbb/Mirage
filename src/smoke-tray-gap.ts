import { MathUtils, Vector3 } from "three";
import { cableTraySettings } from "./cable-trays.ts";
import type { EnvironmentRound } from "./environment-rounds.ts";
import { smokeMount, smokeMountHeights } from "./smoke-mount.ts";

/** 圆壳与同排侧梁的平面投影间距，以及独立量取的上下标高差。 */
export function smokeTrayGap(round: EnvironmentRound) {
  const [smoke, tray] = round.points;
  const center = new Vector3().fromArray(smoke.position);
  const [trayX, trayY, trayZ] = tray.position;
  const { length, railSpacing, railSize, railCenterY } = cableTraySettings;
  const [width, height] = railSize;
  const side = center.z < trayZ ? -1 : 1;
  const railZ = trayZ + (side * railSpacing) / 2;
  const xMin = trayX - length / 2;
  const xMax = trayX + length / 2;
  const zMin = railZ - width / 2;
  const zMax = railZ + width / 2;
  const railEdge = new Vector3(
    MathUtils.clamp(center.x, xMin, xMax),
    trayY + railCenterY + height / 2,
    MathUtils.clamp(center.z, zMin, zMax),
  );
  const towardRail = railEdge.clone().sub(center).setY(0);
  const centerDistance = towardRail.length();
  if (centerDistance === 0) towardRail.z = -side;
  towardRail.normalize();
  const { bodyTop } = smokeMountHeights(center.y);
  const { bodyUpperRadius, bodyLowerRadius, bodyHeight } = smokeMount;
  const housingEdge = center
    .clone()
    .addScaledVector(towardRail, Math.min(centerDistance, bodyUpperRadius))
    .setY(bodyTop);
  const housingBottom = center
    .clone()
    .addScaledVector(towardRail, bodyLowerRadius)
    .setY(bodyTop - bodyHeight);
  // 标注略收进表面，量距仍以原外廓为准。
  const inset = 0.004;
  const housingMarker = center
    .clone()
    .addScaledVector(towardRail, bodyUpperRadius - inset)
    .setY(bodyTop);
  const railMarker = railEdge.clone();
  railMarker.x = MathUtils.clamp(railEdge.x, xMin + inset, xMax - inset);
  railMarker.z = MathUtils.clamp(railEdge.z, zMin + inset, zMax - inset);
  return {
    horizontal: Math.max(0, centerDistance - bodyUpperRadius),
    difference: housingBottom.y - railEdge.y,
    housingEdge,
    railEdge,
    housingBottom,
    housingMarker,
    railMarker,
  };
}
