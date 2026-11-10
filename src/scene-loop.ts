/** 场景静止后不保留帧预约；交互与异步资源共用唤醒入口。 */
export class SceneLoop {
  private frame: number | null = null;
  private previousTime: number | null = null;
  private enabled = true;
  private generation = 0;
  private disposed = false;
  private run: (time: number, delta: number) => boolean;
  private request: (callback: FrameRequestCallback) => number;
  private cancel: (frame: number) => void;

  constructor(
    run: (time: number, delta: number) => boolean,
    request = (callback: FrameRequestCallback) =>
      requestAnimationFrame(callback),
    cancel = (frame: number) => cancelAnimationFrame(frame),
  ) {
    this.run = run;
    this.request = request;
    this.cancel = cancel;
  }

  wake = () => {
    if (this.disposed || !this.enabled || this.frame !== null) return;
    const generation = this.generation;
    this.frame = this.request((time) => {
      if (generation !== this.generation) return;
      this.frame = null;
      if (this.disposed || !this.enabled) return;
      const delta =
        this.previousTime === null
          ? 0.016
          : Math.min(Math.max((time - this.previousTime) / 1000, 0), 0.05);
      this.previousTime = time;
      if (this.run(time, delta)) this.wake();
      // 下一次由操作唤醒时，不把静止或后台时长计入机构过渡。
      if (this.frame === null) this.previousTime = null;
    });
  };

  setEnabled(enabled: boolean) {
    if (this.disposed || enabled === this.enabled) return;
    this.enabled = enabled;
    if (enabled) this.wake();
    else {
      this.generation++;
      if (this.frame !== null) this.cancel(this.frame);
      this.frame = null;
      this.previousTime = null;
    }
  }

  dispose() {
    this.setEnabled(false);
    this.disposed = true;
  }
}
