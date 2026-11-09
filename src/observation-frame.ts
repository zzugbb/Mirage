import { Vector3 } from "three";
export type FrameRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** 将配置位置投影到控件之外，沿用场景 40° 透视；不更改对象或深度遮挡。 */
export function observationFrame(
  points: Vector3[],
  requestedDirection: Vector3,
  width: number,
  height: number,
  rect: FrameRect,
  minimumDistance: number,
  padding: number,
) {
  const min = new Vector3(Infinity, Infinity, Infinity),
    max = min.clone().negate();
  for (const point of points) {
    min.min(point);
    max.max(point);
  }
  const center = min.clone().add(max).multiplyScalar(0.5);
  const direction = requestedDirection.clone().normalize();
  const right = new Vector3(direction.z, 0, -direction.x).normalize();
  const up = direction.clone().cross(right);
  const tangent = Math.tan((40 * Math.PI) / 360),
    horizontal = (tangent * width) / height;
  const l = (2 * rect.left) / width - 1,
    r = (2 * rect.right) / width - 1;
  const b = 1 - (2 * rect.bottom) / height,
    t = 1 - (2 * rect.top) / height;
  const cx = (l + r) / 2,
    cy = (b + t) / 2;
  let distance = minimumDistance;
  for (const point of points)
    for (const dx of [-padding, padding])
      for (const dy of [-padding, padding])
        for (const dz of [-padding, padding]) {
          const p = point
            .clone()
            .add(new Vector3(dx, dy, dz))
            .sub(center);
          const x = p.dot(right),
            y = p.dot(up),
            z = p.dot(direction);
          distance = Math.max(
            distance,
            (x + r * z * horizontal) / ((r - cx) * horizontal),
            (-x - l * z * horizontal) / ((cx - l) * horizontal),
            (y + t * z * tangent) / ((t - cy) * tangent),
            (-y - b * z * tangent) / ((cy - b) * tangent),
          );
        }
  const target = center
    .addScaledVector(right, -cx * distance * horizontal)
    .addScaledVector(up, -cy * distance * tangent);
  return {
    target,
    position: target.clone().addScaledVector(direction, distance),
    distance,
  };
}
