import { StructureActionMenu, StructureMenu } from "./StructureMenu";
import type { Action, AppState } from "../domain";
import { entityById } from "../domain";
import { deviceById, rackForDevice } from "../installation";
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
  pendingId,
  dispatch,
  onOpen,
  onExtract,
  onIsolation,
}: {
  state: AppState;
  selected: string;
  ready: boolean;
  phase: PresentationPhase;
  pendingId: string | null;
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
  const expanded = state.explosion > 0;
  const partVisible = canInspectPart(state);
  const coverRaised = state.coverOpen || expanded;
  const expandLabel = exteriorOnly ? "展开配置示意" : "展开部件";
  const restoreLabel = exteriorOnly ? "复原外观" : "复原部件";
  const rackDevice = state.level === "rack" ? deviceById(selected) : undefined;
  const deviceControls = state.level === "device" && !preview;
  const progress = ready
    ? ""
    : deviceControls &&
        state.explosion > 0 &&
        state.explosion < 1 &&
        (phase === "assembling" || phase === "expanding")
      ? "调整展开比例中"
      : ["closed", "open", "extended", "device-ready"].includes(phase)
        ? "场景切换中…"
        : phaseLabels[phase];
  const doors = state.level === "rack" && (
    <>
      <button
        aria-disabled={!ready}
        aria-pressed={state.doorOpen}
        onClick={() =>
          ready && dispatch({ type: "door", open: !state.doorOpen })
        }
      >
        {state.trayExtended
          ? "推回设备并关闭前门"
          : state.doorOpen
            ? "关闭前门"
            : "打开前门"}
      </button>
      <button
        aria-disabled={!ready}
        aria-pressed={state.rearDoorOpen}
        title="双扇后门结构展示，不代表真实门状态或远程控制"
        onClick={() =>
          ready && dispatch({ type: "rear-door", open: !state.rearDoorOpen })
        }
      >
        {state.rearDoorOpen ? "关闭后门" : "打开后门"}
      </button>
    </>
  );
  return (
    <div
      className={`review-object-actions${deviceControls ? " device-structure-actions" : ""}`}
      role="group"
      aria-label="对象操作"
    >
      <span>对象操作</span>
      {rackDevice ? (
        <>
          <button
            aria-disabled={!ready}
            onClick={() => ready && onOpen(selected)}
          >
            {rackDevice.name} ·{" "}
            {pendingId === selected
              ? "正在切换安装位"
              : resourceOpenLabel(state, selected)}{" "}
            ↗
          </button>
          {rackDevice.rackId === rackForDevice(state.deviceId).id && (
            <StructureActionMenu key={selected} label="机柜操作">
              {state.trayExtended ? (
                <button
                  aria-disabled={!ready}
                  onClick={() =>
                    ready && dispatch({ type: "tray", extended: false })
                  }
                >
                  推回 {deviceById(state.deviceId)!.name}
                </button>
              ) : (
                modelForDevice(selected).category !== "switch" && (
                  <button
                    aria-disabled={!ready}
                    onClick={() => ready && onExtract(selected)}
                  >
                    抽出 {rackDevice.name}
                  </button>
                )
              )}
              {doors}
            </StructureActionMenu>
          )}
        </>
      ) : preview || state.level === "room" ? (
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
          {doors}
          {pduById(selected) && (
            <small>
              {state.rearDoorOpen ? "后立柱观察剖切" : "后侧观察剖切"}
            </small>
          )}
        </>
      ) : (
        <>
          {entity.kind === "part" ? (
            <button
              disabled={!ready}
              data-part-action="isolate"
              onClick={partVisible ? onIsolation : () => onOpen(selected)}
            >
              {progress || (partVisible ? "只看此部件" : "展开并定位部件")}
            </button>
          ) : (
            <button
              disabled={!ready}
              onClick={() =>
                dispatch({ type: "explode", amount: expanded ? 0 : 1 })
              }
            >
              {progress || (expanded ? restoreLabel : expandLabel)}
            </button>
          )}
          <StructureMenu
            key={selected}
            amount={state.explosion}
            showProgress
            onChange={(amount) => dispatch({ type: "explode", amount })}
          >
            {!exteriorOnly && (
              <button
                disabled={!ready}
                onClick={() => dispatch({ type: "cover", open: !coverRaised })}
              >
                {coverRaised ? "合上上盖" : "打开上盖"}
              </button>
            )}
            <button
              disabled={!ready || state.explosion === 1}
              onClick={() => dispatch({ type: "explode", amount: 1 })}
            >
              完全展开
            </button>
            {entity.kind === "part" && (
              <button
                disabled={!ready || !expanded}
                onClick={() => dispatch({ type: "explode", amount: 0 })}
              >
                {restoreLabel}
              </button>
            )}
          </StructureMenu>
        </>
      )}
      {deviceControls && (
        <span className="structure-announcement" role="status">
          {progress}
        </span>
      )}
      {state.level !== "room" && !deviceControls && progress && (
        <small role="status">{progress}</small>
      )}
    </div>
  );
}
