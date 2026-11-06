import { useState } from "react";
import { modelAssets, type ModelLoadState } from "../model-loading";

/** 加载状态属于模型资源，不与设备通信、测点质量或告警混用。 */
export function ModelLoadNotice({
  state,
  onRetry,
  onInteract,
}: {
  state: ModelLoadState;
  onRetry: () => void;
  onInteract: () => void;
}) {
  const [open, setOpen] = useState(false);
  const failed = modelAssets.filter(({ id }) => state[id] === "failed").length;
  const loading = modelAssets.filter(
    ({ id }) => state[id] === "loading",
  ).length;
  if (!failed && !loading && !open) return null;
  return (
    <details
      className="review-loading model-load-notice"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      onPointerDownCapture={onInteract}
      onKeyDownCapture={onInteract}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          event.preventDefault();
          setOpen(false);
          const target =
            failed || loading
              ? event.currentTarget.querySelector<HTMLElement>("summary")
              : event.currentTarget
                  .closest(".review-scene")
                  ?.querySelector<HTMLElement>(".review-scene-tools summary");
          target?.focus();
        }
      }}
    >
      <summary>
        {failed
          ? `${failed} 项模型未就绪`
          : loading
            ? `模型加载中 · ${modelAssets.length - loading}/${modelAssets.length}`
            : "模型已全部就绪"}
      </summary>
      <div className="model-load-body">
        <p>未就绪模型暂用简化结构。设备数据与告警保持原口径。</p>
        <ul>
          {modelAssets.map(({ id, name }) => (
            <li key={id} data-model-id={id} data-status={state[id]}>
              <span>{name}</span>
              <span>
                {state[id] === "ready"
                  ? "已就绪"
                  : state[id] === "loading"
                    ? "加载中…"
                    : "暂不可用"}
              </span>
            </li>
          ))}
        </ul>
        {failed > 0 && (
          <button onClick={onRetry}>重试未就绪模型（{failed}）</button>
        )}
        <small>
          {loading
            ? "加载期间保留简化结构与现有模拟数据。"
            : failed
              ? "重试保留当前镜头、结构与模拟时间。"
              : "详细模型已就绪，当前选择与姿态已保留。"}
        </small>
      </div>
    </details>
  );
}
