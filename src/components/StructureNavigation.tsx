import type { ReactNode } from "react";
import type { Action, AppState } from "../domain";
import type { FanInspection } from "../fan-inspection";
import type { StorageSlotInspection } from "../storage-slots";
import { modelForDevice, subpartsForDevice } from "../catalog";
import { StructureMenu } from "./StructureMenu";

export function StructureNavigation({
  visit,
  state,
  analysis,
  ready,
  dispatch,
  onSide,
  onFront,
  onToggleDrive,
  onGroup,
  onFinish,
}: {
  visit: FanInspection | StorageSlotInspection;
  state: AppState;
  analysis: boolean;
  ready: boolean;
  dispatch: (action: Action) => void;
  onSide: (side: FanInspection["side"]) => void;
  onFront: () => void;
  onToggleDrive: () => void;
  onGroup: () => void;
  onFinish: () => void;
}) {
  const fan = "fanId" in visit ? visit : null;
  const deeper = analysis || visit.mode !== "group";
  const back = deeper ? onGroup : onFinish;
  const disabled = !ready || visit.pending;
  const id = "fanId" in visit ? visit.fanId : visit.diskId;
  const part = subpartsForDevice(visit.deviceId).find((part) => part.id === id);
  const scope = {
    group: fan ? "风扇组" : "盘位总览",
    single: "单件检视",
    disk: "盘体与托架",
    tray: "盘体与托架",
    contact: "中板接点",
    board: "中板正面",
  }[visit.mode];
  const driveInspection = visit.mode === "disk" || visit.mode === "tray";
  const hasDuct = fan && !!modelForDevice(visit.deviceId).fanDuctLayout;
  const group = fan
    ? fan.side === "duct"
      ? "风扇与导风罩"
      : `风扇组${fan.side === "rear" ? "后侧" : "前侧"}`
    : "盘位总览";
  return (
    <StructureToolbar
      label={fan ? "风扇核对操作" : "盘位核对操作"}
      state={state}
      disabled={disabled}
      dispatch={dispatch}
      destination={deeper ? group : "完整结构"}
      onBack={back}
      menuActions={
        deeper && (
          <button disabled={disabled} onClick={onFinish}>
            结束核对，返回完整结构
          </button>
        )
      }
    >
      <div
        className={
          hasDuct
            ? "structure-check-scope fan-duct-scope"
            : driveInspection
              ? "structure-check-scope assembly-layer-scope"
              : "structure-check-scope"
        }
      >
        <b>
          {visit.pending ? "正在展开" : scope}
          {visit.mode !== "group" && part && ` · ${part.slot}`}
        </b>
        {driveInspection && (
          <button disabled={disabled} onClick={onToggleDrive}>
            {visit.mode === "tray" ? "放回托架" : "抬起盘体"}
          </button>
        )}
        {visit.mode === "group" &&
          !analysis &&
          (fan ? (
            <div
              role="group"
              aria-label="整组观察方向"
              className="fan-view-sides"
            >
              {(["front", "rear"] as const).map((side) => (
                <button
                  key={side}
                  disabled={disabled}
                  aria-label={side === "front" ? "前侧观察" : "后侧观察"}
                  aria-pressed={fan.side === side}
                  onClick={() => onSide(side)}
                >
                  {side === "front" ? "前侧" : "后侧"}
                </button>
              ))}
              {hasDuct && (
                <button
                  disabled={disabled}
                  aria-pressed={fan.side === "duct"}
                  onClick={() => onSide("duct")}
                >
                  对照导风罩
                </button>
              )}
            </div>
          ) : (
            <button
              disabled={disabled}
              onClick={onFront}
              aria-label="正面观察盘组"
            >
              正面观察
            </button>
          ))}
      </div>
    </StructureToolbar>
  );
}

export function StructureToolbar({
  label,
  state,
  disabled,
  dispatch,
  destination,
  onBack,
  menuActions,
  children,
}: {
  label: string;
  state: AppState;
  disabled: boolean;
  dispatch: (action: Action) => void;
  destination: string;
  onBack: () => void;
  menuActions?: ReactNode;
  children: ReactNode;
}) {
  const server = modelForDevice(state.deviceId).category === "server";
  return (
    <div
      className="review-object-actions structure-task-bar"
      role="group"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        const menu =
          event.currentTarget.querySelector<HTMLDetailsElement>(
            "details[open]",
          );
        if (menu) {
          menu.open = false;
          menu.querySelector("summary")?.focus();
        } else if (!disabled) onBack();
      }}
    >
      {children}
      <button disabled={disabled} onClick={onBack}>
        ← 返回{destination}
      </button>
      <StructureMenu
        amount={state.explosion}
        onChange={(amount) => dispatch({ type: "explode", amount })}
      >
        <button
          disabled={disabled}
          onClick={() => dispatch({ type: "explode", amount: 0 })}
        >
          {server ? "复原部件" : "复原外观"}
        </button>
        {server && (
          <button
            disabled={disabled}
            onClick={() => dispatch({ type: "cover", open: false })}
          >
            合上上盖
          </button>
        )}
        {menuActions}
      </StructureMenu>
    </div>
  );
}
