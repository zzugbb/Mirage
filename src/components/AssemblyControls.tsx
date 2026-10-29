import { parts } from "../domain";
import type { Action, AppState } from "../domain";

export function AssemblyControls({
  state,
  dispatch,
  ready,
}: {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  ready: boolean;
}) {
  return (
    <section className="assembly-controls" aria-label="设备结构控制">
      <div className="section-heading">
        <h3>结构拆解</h3>
        <span className="assembly-percent">
          {Math.round(state.explosion * 100)}
          <small>%</small>
        </span>
      </div>
      <fieldset disabled={!ready} aria-label="部件展开与选择">
        <label className="slider-label" htmlFor="explosion">
          爆炸展开进度
        </label>
        <input
          id="explosion"
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(state.explosion * 100)}
          style={
            { "--progress": `${state.explosion * 100}%` } as React.CSSProperties
          }
          onChange={(event) =>
            dispatch({
              type: "explode",
              amount: Number(event.target.value) / 100,
            })
          }
        />
        <div className="slider-ends">
          <span>装配</span>
          <span>展开</span>
        </div>
        <div className="assembly-actions">
          <button
            className={state.explosion > 0 ? "active" : ""}
            onClick={() => dispatch({ type: "explode", amount: 1 })}
          >
            爆炸展开 <span>↗</span>
          </button>
          <button onClick={() => dispatch({ type: "explode", amount: 0 })}>
            复原装配 <span>↙</span>
          </button>
        </div>
        <label className="part-select-label" htmlFor="part-select">
          选择部件 <span>09 个模组</span>
        </label>
        <select
          id="part-select"
          value={
            parts.some((part) => part.id === state.selected)
              ? state.selected
              : ""
          }
          onChange={(event) =>
            dispatch({ type: "select", id: event.target.value || "srv-01" })
          }
        >
          <option value="">整台设备</option>
          {parts.map((part) => (
            <option key={part.id} value={part.id}>
              {part.name} · {part.slot}
            </option>
          ))}
        </select>
        <p className="assembly-hint">
          展开后可直接点击部件。示意装配，不代表实际维修步骤。
        </p>
      </fieldset>
    </section>
  );
}
