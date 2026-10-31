// 40° 垂直视场角的保守取景；窄屏由水平视野决定距离。
export function frameDistance(size: number, aspect: number, minimum: number) {
  return Math.max(minimum, (size * 1.55) / Math.min(1, Math.max(0.2, aspect)));
}
export type CameraView = "iso" | "top" | "front" | "right" | "interior";
export const cameraMinimumDistance = {
  room: 3,
  rack: 1,
  device: 0.35,
} as const;

/** 根据取景方向投影包围盒八角，保留 12% 边距；不以包围球对细长设备过度缩小。 */
export function boundsFrameDistance(
  size: number[],
  direction: number[],
  aspect: number,
  minimum: number,
) {
  const points: number[][] = [];
  for (const x of [-size[0] / 2, size[0] / 2])
    for (const y of [-size[1] / 2, size[1] / 2])
      for (const z of [-size[2] / 2, size[2] / 2]) points.push([x, y, z]);
  return pointsFrameDistance(points, direction, aspect, minimum);
}

export function pointsFrameDistance(
  points: number[][],
  direction: number[],
  aspect: number,
  minimum: number,
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
  const tangent = Math.tan((40 * Math.PI) / 360);
  let result = minimum;
  for (const point of points) {
    const dot = (axis: number[]) =>
      point.reduce((sum, value, i) => sum + value * axis[i], 0);
    result = Math.max(
      result,
      (Math.abs(dot(right)) * 1.12) / (tangent * Math.max(0.2, aspect)) +
        dot(n),
      (Math.abs(dot(up)) * 1.12) / tangent + dot(n),
    );
  }
  return result;
}
