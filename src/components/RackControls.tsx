import type { Action, AppState } from "../domain";
import { phaseLabels } from "../mechanics";
import type { PresentationPhase } from "../mechanics";

export function RackControls({
  state,
  phase,
  dispatch,
}: {
  state: AppState;
  phase: PresentationPhase;
  dispatch: React.Dispatch<Action>;
}) {
  const busy = !["closed", "open", "extended"].includes(phase);
  return (
    <section className="rack-controls" aria-label="机柜结构控制">
      <div className="section-heading">
        <h3>结构操作</h3>
        <span className="tag">姿态演示</span>
      </div>
      <div className={`mechanism-status ${busy ? "busy" : ""}`} role="status">
        <i />
        {phaseLabels[phase]}
      </div>
      <div className="mechanism-actions">
        <button
          aria-pressed={state.doorOpen}
          onClick={() => dispatch({ type: "door", open: !state.doorOpen })}
        >
          {state.doorOpen ? "关闭柜门" : "打开柜门"}
          <span>{state.doorOpen ? "↙" : "↗"}</span>
        </button>
        <button
          aria-pressed={state.trayExtended}
          onClick={() =>
            dispatch({ type: "tray", extended: !state.trayExtended })
          }
        >
          {state.trayExtended ? "推回服务器" : "抽出服务器"}
          <span>{state.trayExtended ? "↤" : "↦"}</span>
        </button>
      </div>
      <p>抽出前开门，关门前回位。仅改变三维模型姿态。</p>
    </section>
  );
}
