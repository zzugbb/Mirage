import type { Action, AppState } from "../domain";
import { entityById } from "../domain";
import { modelForDevice } from "../catalog";
import { resourceOpenLabel, resourceCatalog } from "../review-resources";
import type { PresentationPhase } from "../mechanics";
import { phaseLabels } from "../mechanics";
import { pduById } from "../power-config";
import { canInspectPart } from "../part-inspection";

export function ResourceActions({
  state,
  selected,
  ready,
  phase,
  dispatch,
  onOpen,
  onExtract,
  onIsolation,
}: {
  state: AppState;
  selected: string;
  ready: boolean;
  phase: PresentationPhase;
  dispatch: (action: Action) => void;
  onOpen: (id: string) => void;
  onExtract: (id: string) => void;
  onIsolation: () => void;
}) {
  const entity = entityById(selected)!;
  const name =
    resourceCatalog(state.deviceId).find((r) => r.id === selected)?.name ??
    entity.name;
  const preview = selected !== state.selected;
  const exteriorOnly = modelForDevice(state.deviceId).category !== "server";
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
            {state.doorOpen ? "关闭前门" : "打开前门"}
          </button>
          <button
            disabled={!ready}
            aria-pressed={state.rearDoorOpen}
            title="双扇后门结构展示，不代表真实门状态或远程控制"
            onClick={() =>
              dispatch({ type: "rear-door", open: !state.rearDoorOpen })
            }
          >
            {state.rearDoorOpen ? "关闭后门" : "打开后门"}
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
                {modelForDevice(selected).category === "server"
                  ? "查看设备内部"
                  : "查看设备"}{" "}
                ↗
              </button>
            </>
          ) : null}
          {pduById(selected) && (
            <small>
              {state.rearDoorOpen ? "后立柱观察剖切" : "后侧观察剖切"}
            </small>
          )}
        </>
      ) : (
        <>
          {!exteriorOnly && (
            <button
              disabled={!ready}
              aria-pressed={state.coverOpen || state.explosion > 0}
              onClick={() =>
                dispatch({
                  type: "cover",
                  open: !(state.coverOpen || state.explosion > 0),
                })
              }
            >
              {state.coverOpen || state.explosion > 0 ? "合上上盖" : "打开上盖"}
            </button>
          )}
          {entity.kind === "part" && (
            <>
              <button disabled={!ready} onClick={() => onOpen(selected)}>
                定位部件
              </button>
              <button
                disabled={!ready || !canInspectPart(state)}
                data-part-action="isolate"
                title={
                  !canInspectPart(state)
                    ? "先展开部件，再单独查看"
                    : "临时隐藏其余结构，保留当前展开姿态"
                }
                onClick={onIsolation}
              >
                只看此部件
              </button>
            </>
          )}
          <button
            disabled={!ready}
            aria-pressed={state.explosion > 0}
            onClick={() => dispatch({ type: "explode", amount: 1 })}
          >
            {exteriorOnly ? "展开配置示意" : "展开部件"}
          </button>
          <button
            disabled={!ready || state.explosion === 0}
            onClick={() => dispatch({ type: "explode", amount: 0 })}
          >
            {exteriorOnly ? "复原外观" : "复原部件"}
          </button>
          <details className="review-explode-settings">
            <summary>展开进度</summary>
            <ExplosionSlider
              amount={state.explosion}
              onChange={(amount) => dispatch({ type: "explode", amount })}
            />
          </details>
        </>
      )}
      {state.level !== "room" && !ready && (
        <small role="status">
          {!ready &&
          ![
            "opening-cover",
            "closing-cover",
            "assembling",
            "expanding",
            "opening-rear",
            "closing-rear",
          ].includes(phase)
            ? "场景切换中…"
            : phaseLabels[phase]}
        </small>
      )}
    </div>
  );
}

export function ExplosionSlider({
  amount,
  onChange,
}: {
  amount: number;
  onChange: (amount: number) => void;
}) {
  return (
    <label className="review-explode-label">
      展开{" "}
      <input
        aria-label="部件展开进度"
        type="range"
        min="0"
        max="100"
        value={amount * 100}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
      />
      <output>{Math.round(amount * 100)}%</output>
    </label>
  );
}
