import { useRef } from "react";
import type { Action, AppState } from "../domain";
import type { FanInspection } from "../fan-inspection";
import type { StorageSlotInspection } from "../storage-slots";
import { modelForDevice, subpartsForDevice } from "../catalog";
import { ExplosionSlider } from "./ResourceActions";

export function StructureNavigation({
  visit,
  state,
  analysis,
  ready,
  dispatch,
  onSide,
  onGroup,
  onFinish,
}: {
  visit: FanInspection | StorageSlotInspection;
  state: AppState;
  analysis: boolean;
  ready: boolean;
  dispatch: (action: Action) => void;
  onSide: (side: FanInspection["side"]) => void;
  onGroup: () => void;
  onFinish: () => void;
}) {
  const fan = "fanId" in visit ? visit : null;
  const deeper = analysis || visit.mode !== "group";
  const back = deeper ? onGroup : onFinish;
  const disabled = !ready || visit.pending;
  const server = modelForDevice(visit.deviceId).category === "server";
  const id = "fanId" in visit ? visit.fanId : visit.diskId;
  const part = subpartsForDevice(visit.deviceId).find((part) => part.id === id);
  const scope = {
    group: fan ? "风扇组" : "盘位总览",
    single: "单件检视",
    disk: "单盘检视",
    contact: "中板接点",
  }[visit.mode];
  const group = fan
    ? `风扇组${fan.side === "rear" ? "后侧" : "前侧"}`
    : "盘位总览";
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <div
      className="review-object-actions structure-task-bar"
      role="group"
      aria-label={fan ? "风扇核对操作" : "盘位核对操作"}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        if (menu.current?.open) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        } else if (!disabled) back();
      }}
    >
      <b>
        {visit.pending ? (fan ? "正在展开风扇组" : "正在展开盘组") : scope}
        {visit.mode !== "group" && part && ` · ${part.slot}`}
      </b>
      {fan?.mode === "group" && !analysis && (
        <div role="group" aria-label="整组观察方向" className="fan-view-sides">
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
        </div>
      )}
      <button disabled={disabled} onClick={back}>
        ← 返回{deeper ? group : "完整结构"}
      </button>
      <details
        ref={menu}
        className="review-explode-settings structure-task-menu"
      >
        <summary>结构操作</summary>
        <div>
          <ExplosionSlider
            amount={state.explosion}
            onChange={(amount) => dispatch({ type: "explode", amount })}
          />
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
          {deeper && (
            <button disabled={disabled} onClick={onFinish}>
              结束核对，返回完整结构
            </button>
          )}
        </div>
      </details>
    </div>
  );
}
