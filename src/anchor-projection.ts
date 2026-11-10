export type AnchorPoint = { x: number; y: number; hidden: boolean };

/** 仅归一屏幕坐标到 0.01px，避免阻尼浮点尾差反复写 DOM，不改变三维位置。 */
export class AnchorProjection {
  private points = new WeakMap<object, AnchorPoint>();

  update(key: object, x: number, y: number, hidden: boolean) {
    const point = {
      x: Number.isFinite(x) ? Math.round(x * 100) / 100 : 0,
      y: Number.isFinite(y) ? Math.round(y * 100) / 100 : 0,
      hidden: hidden || !Number.isFinite(x) || !Number.isFinite(y),
    };
    const previous = this.points.get(key);
    if (
      previous?.x === point.x &&
      previous.y === point.y &&
      previous.hidden === point.hidden
    )
      return null;
    this.points.set(key, point);
    return point;
  }
}
