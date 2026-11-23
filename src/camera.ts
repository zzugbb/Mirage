// 40° 垂直视场角的保守取景；窄屏由水平视野决定距离。
export function frameDistance(size: number, aspect: number, minimum: number) {
  return Math.max(minimum, (size * 1.55) / Math.min(1, Math.max(0.2, aspect)));
}
/** 还原检视前的距离，画幅收窄时留出原视野，同时遵循原轨道的缩放范围。 */
export function inspectionReturnDistance(
  distance: number,
  previousAspect: number,
  aspect: number,
  minimum: number,
  maximum: number,
) {
  const fit = distance * Math.max(1, previousAspect / aspect);
  return Math.min(maximum, Math.max(minimum, fit));
}

export type CameraView =
  "iso" | "top" | "front" | "rear" | "right" | "interior";
export const cameraMinimumDistance = {
  room: 3,
  rack: 1,
  device: 0.35,
} as const;

const paddedFocalLength = 1.12 / Math.tan((40 * Math.PI) / 360);
const availableField = (inset: number) =>
  1 - 2 * Math.min(0.45, Math.max(0, inset));

/** 根据取景方向投影包围盒八角，保留 12% 边距；不以包围球对细长设备过度缩小。 */
export function boundsFrameDistance(
  size: number[],
  direction: number[],
  aspect: number,
  minimum: number,
  topInsetFraction = 0,
  bottomInsetFraction = 0,
) {
  const points: number[][] = [];
  for (const x of [-size[0] / 2, size[0] / 2])
    for (const y of [-size[1] / 2, size[1] / 2])
      for (const z of [-size[2] / 2, size[2] / 2]) points.push([x, y, z]);
  return pointsFrameDistance(
    points,
    direction,
    aspect,
    minimum,
    topInsetFraction,
    bottomInsetFraction,
  );
}

export function pointsFrameDistance(
  points: number[][],
  direction: number[],
  aspect: number,
  minimum: number,
  topInsetFraction = 0,
  bottomInsetFraction = 0,
) {
  const length = Math.hypot(...direction);
  const n = direction.map((value) => value / length);
  const horizontal = Math.hypot(n[0], n[2]);
  const right =
    horizontal > 1e-8 ? [n[2] / horizontal, 0, -n[0] / horizontal] : [1, 0, 0];
  const up = [
    n[1] * right[2] - n[2] * right[1],
    n[2] * right[0] - n[0] * right[2],
    n[0] * right[1] - n[1] * right[0],
  ];
  // 保持目标中心，分别为场景上下沿的操作区留出画幅。
  const upperField = availableField(topInsetFraction);
  const lowerField = availableField(bottomInsetFraction);
  let result = minimum;
  for (const [x, y, z] of points) {
    const vertical = x * up[0] + y * up[1] + z * up[2];
    const lateral = x * right[0] + z * right[2];
    const depth = x * n[0] + y * n[1] + z * n[2];
    result = Math.max(
      result,
      (Math.abs(lateral) * paddedFocalLength) / Math.max(0.2, aspect) + depth,
      (vertical > 0 ? vertical / upperField : -vertical / lowerField) *
        paddedFocalLength +
        depth,
    );
  }
  return result;
}
