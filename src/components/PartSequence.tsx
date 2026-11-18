import type { Action, AppState } from "../domain";
import type { partInspectionSequence } from "../part-inspection";
import { StructureToolbar } from "./StructureNavigation";

export function PartSequence({
  sequence,
  ready,
  state,
  dispatch,
  onSelect,
  onFinish,
  onRestore,
}: {
  sequence: NonNullable<ReturnType<typeof partInspectionSequence>>;
  ready: boolean;
  state: AppState;
  dispatch: (action: Action) => void;
  onSelect: (id: string, action: string) => void;
  onFinish: () => void;
  onRestore: () => void;
}) {
  const { parent, siblings, index, previous, next, children } = sequence;
  return (
    <StructureToolbar
      label="逐部件检视"
      state={state}
      disabled={!ready}
      dispatch={dispatch}
      destination={parent?.name ?? "完整结构"}
      onBack={parent ? () => onSelect(parent.id, "heading") : onFinish}
      menuActions={
        <>
          {parent && (
            <button disabled={!ready} onClick={onFinish}>
              结束检视，返回完整结构
            </button>
          )}
          <button
            disabled={!ready}
            onClick={onRestore}
            title="显示完整结构，保留所选部件并恢复进入检视前的镜头"
          >
            保留选择，恢复原视角
          </button>
        </>
      }
    >
      <div className="part-sequence" role="group" aria-label="同级部件">
        <button
          aria-label="上一个部件"
          title="上一个部件"
          data-part-action="previous"
          disabled={!ready || !previous}
          onClick={() => previous && onSelect(previous.id, "previous")}
        >
          ‹
        </button>
        <div tabIndex={-1} data-part-action="heading" aria-live="polite">
          <b>{siblings[index].name}</b>
          <small>
            {parent ? "子件" : "模块"} {index + 1}/{siblings.length}
          </small>
        </div>
        <button
          aria-label="下一个部件"
          title="下一个部件"
          data-part-action="next"
          disabled={!ready || !next}
          onClick={() => next && onSelect(next.id, "next")}
        >
          ›
        </button>
      </div>
      {children.length > 0 && (
        <button
          disabled={!ready}
          onClick={() => onSelect(children[0].id, "heading")}
        >
          检视子件 · {children.length}
        </button>
      )}
    </StructureToolbar>
  );
}
