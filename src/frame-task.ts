/** 将同一帧内的界面变化合并；投影完成时可立即执行，卸载后拒绝迟到通知。 */
export class FrameTask {
  private frame: number | null = null;
  private closed = false;
  private run: () => void;
  private request: (callback: FrameRequestCallback) => number;
  private cancel: (frame: number) => void;

  constructor(
    run: () => void,
    request = (callback: FrameRequestCallback) =>
      requestAnimationFrame(callback),
    cancel = (frame: number) => cancelAnimationFrame(frame),
  ) {
    this.run = run;
    this.request = request;
    this.cancel = cancel;
  }

  invalidate = () => {
    if (this.closed || this.frame !== null) return;
    this.frame = this.request(() => {
      this.frame = null;
      if (!this.closed) this.run();
    });
  };

  flush = () => {
    if (this.closed) return;
    if (this.frame !== null) this.cancel(this.frame);
    this.frame = null;
    this.run();
  };

  dispose() {
    this.closed = true;
    if (this.frame !== null) this.cancel(this.frame);
    this.frame = null;
  }
}
