/** 只决定是否提交颜色/阴影绘制；机构、拾取与标签仍按原节奏更新。 */
export class RenderDemand {
  private dirty = true;
  private wasAnimating = false;
  private lastView: number[] = [];

  invalidate() {
    this.dirty = true;
  }

  consume(view: ArrayLike<number>, animating: boolean) {
    const changed =
      view.length !== this.lastView.length ||
      this.lastView.some(
        (value, index) => Math.abs(view[index] - value) > 1e-10,
      );
    // 动效结束后补绘终态，尤其是透明过渡结束后重新启用的接触阴影。
    const draw = this.dirty || changed || animating || this.wasAnimating;
    this.wasAnimating = animating;
    if (draw) {
      this.dirty = false;
      this.lastView = Array.from(view);
    }
    return draw;
  }
}
