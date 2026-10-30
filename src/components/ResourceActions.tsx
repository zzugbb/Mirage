import type { Action, AppState } from "../domain";
import { entityById } from "../domain";
import { modelForDevice } from "../catalog";
import { resourceOpenLabel, resourceCatalog } from "../review-resources";
import type { PresentationPhase } from "../mechanics";
import { phaseLabels } from "../mechanics";

export function ResourceActions({
  state,
  selected,
  ready,
  phase,
  dispatch,
  onOpen,
  onExtract,
}: {
  state: AppState;
  selected: string;
  ready: boolean;
  phase: PresentationPhase;
  dispatch: (action: Action) => void;
  onOpen: (id: string) => void;
  onExtract: (id: string) => void;
}) {
  const entity = entityById(selected)!;
  const name =
    resourceCatalog(state.deviceId).find((r) => r.id === selected)?.name ??
    entity.name;
  const preview = selected !== state.selected;
  return (
    <div className="review-object-actions" aria-label="对象操作">
      <span>对象操作</span>
      {preview || state.level === "room" ? (
        <>
          <strong>{name}</strong>
          {entity.kind !== "room" ? (
            <button disabled={!ready} onClick={() => onOpen(selected)}>
              {resourceOpenLabel(state, selected)} ↗
            </button>
          ) : (
            <small>选择一个机柜开始浏览</small>
          )}
        </>
      ) : state.level === "rack" ? (
        <>
          <button
            disabled={!ready}
            aria-pressed={state.doorOpen}
            onClick={() => dispatch({ type: "door", open: !state.doorOpen })}
          >
            {state.doorOpen ? "关闭柜门" : "打开柜门"}
          </button>
          {entity.kind === "device" ? (
            <>
              {modelForDevice(selected).category !== "switch" && (
                <button
                  disabled={!ready}
                  aria-pressed={state.trayExtended}
                  onClick={() => onExtract(selected)}
                >
                  {state.trayExtended ? "推回设备" : "抽出设备"}
                </button>
              )}
              <button disabled={!ready} onClick={() => onOpen(selected)}>
                查看设备内部 ↗
              </button>
            </>
          ) : (
            <small>选择设备后可查看内部</small>
          )}
        </>
      ) : (
        <>
          {entity.kind === "part" && (
            <button disabled={!ready} onClick={() => onOpen(selected)}>
              定位部件
            </button>
          )}
          <button
            disabled={!ready}
            aria-pressed={state.explosion > 0}
            onClick={() => dispatch({ type: "explode", amount: 1 })}
          >
            展开部件
          </button>
          <button
            disabled={!ready}
            onClick={() => dispatch({ type: "explode", amount: 0 })}
          >
            复原装配
          </button>
          <label className="review-explode-label">
            展开{" "}
            <input
              aria-label="评审部件展开进度"
              type="range"
              min="0"
              max="100"
              value={state.explosion * 100}
              onChange={(e) =>
                dispatch({
                  type: "explode",
                  amount: Number(e.target.value) / 100,
                })
              }
            />
            <output>{Math.round(state.explosion * 100)}%</output>
          </label>
        </>
      )}
      {state.level !== "room" && (
        <small role="status">
          {!ready ? "场景切换中…" : phaseLabels[phase]}
        </small>
      )}
    </div>
  );
}
