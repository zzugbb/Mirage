export const modelAssets = [
  { id: "server-2u", name: "2U 服务器" },
  { id: "server-1u", name: "1U 服务器" },
  { id: "switch-1u", name: "接入交换机" },
  { id: "storage-4u", name: "4U 存储" },
  { id: "cooling-01", name: "制冷单元" },
  { id: "power-01", name: "配电柜" },
] as const;
export type ModelAssetId = (typeof modelAssets)[number]["id"];
export type ModelStatus = "loading" | "ready" | "failed";
export type ModelLoadState = Record<ModelAssetId, ModelStatus>;
export const initialModelLoads = (): ModelLoadState =>
  Object.fromEntries(
    modelAssets.map(({ id }) => [id, "loading"]),
  ) as ModelLoadState;

/** 每项独立重试；同项请求互斥，关闭后不再通知界面或接纳迟到结果。 */
export class ModelLoading {
  state = initialModelLoads();
  private requests = new Map<ModelAssetId, AbortController>();
  private closed = false;
  private started = false;
  private worker: (id: ModelAssetId, signal: AbortSignal) => Promise<void>;
  private notify: (state: ModelLoadState) => void;
  private timeout: number;
  constructor(
    worker: (id: ModelAssetId, signal: AbortSignal) => Promise<void>,
    notify: (state: ModelLoadState) => void,
    timeout = 30000,
  ) {
    this.worker = worker;
    this.notify = notify;
    this.timeout = timeout;
  }
  start() {
    if (this.started || this.closed) return Promise.resolve();
    this.started = true;
    return this.run(modelAssets.map(({ id }) => id));
  }
  retry() {
    return this.run(
      modelAssets
        .filter(({ id }) => this.state[id] === "failed")
        .map(({ id }) => id),
    );
  }
  private async run(ids: ModelAssetId[]) {
    if (this.closed) return;
    await Promise.all(
      ids.map(async (id) => {
        if (this.requests.has(id)) return;
        const controller = new AbortController();
        this.requests.set(id, controller);
        this.state[id] = "loading";
        this.notify({ ...this.state });
        const timer = setTimeout(() => controller.abort(), this.timeout);
        try {
          await this.worker(id, controller.signal);
          if (!this.closed)
            this.state[id] = controller.signal.aborted ? "failed" : "ready";
        } catch {
          if (!this.closed) this.state[id] = "failed";
        } finally {
          clearTimeout(timer);
          this.requests.delete(id);
          if (!this.closed) this.notify({ ...this.state });
        }
      }),
    );
  }
  dispose() {
    this.closed = true;
    for (const controller of this.requests.values()) controller.abort();
  }
}
