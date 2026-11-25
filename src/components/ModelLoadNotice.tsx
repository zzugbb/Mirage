import { useRef, useState } from "react";
import { modelAssets, type ModelLoadState } from "../model-loading";

function restoreFocusOnRemoval(notice: HTMLDetailsElement | null) {
  if (!notice) return;
  return () => {
    if (notice.contains(document.activeElement))
      notice
        .closest(".review-scene")
        ?.querySelector<HTMLElement>(".review-scene-tools summary")
        ?.focus({ preventScroll: true });
  };
}

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
  const summary = useRef<HTMLElement>(null);
  const failed = modelAssets.filter(({ id }) => state[id] === "failed").length;
  const loading = modelAssets.filter(
    ({ id }) => state[id] === "loading",
  ).length;
  const requested = modelAssets.filter(({ id }) => state[id] !== "idle").length;
  if (!failed && !loading && !open) return null;
  return (
    <details
      ref={restoreFocusOnRemoval}
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
          summary.current?.focus({ preventScroll: true });
        }
      }}
    >
      <summary ref={summary}>
        {failed
          ? `${failed} 项模型暂不可用`
          : loading
            ? `模型加载中 · ${requested - loading}/${requested}`
            : "已请求模型就绪"}
      </summary>
      <div className="model-load-body">
        {(loading > 0 || failed > 0) && (
          <p>简模可继续操作，模拟读数照常显示。</p>
        )}
        <ul>
          {modelAssets.map(({ id, name }) => (
            <li key={id} data-model-id={id} data-status={state[id]}>
              <span>{name}</span>
              <span>
                {state[id] === "idle"
                  ? "按需加载"
                  : state[id] === "ready"
                    ? "已就绪"
                    : state[id] === "loading"
                      ? "加载中…"
                      : "暂不可用"}
              </span>
            </li>
          ))}
        </ul>
        {failed > 0 && (
          <button
            onClick={() => {
              summary.current?.focus({ preventScroll: true });
              onRetry();
            }}
          >
            重试失败模型（{failed}）
          </button>
        )}
      </div>
    </details>
  );
}
