import { partsForDevice, subpartsForDevice, modelForDevice } from "../catalog";
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
  const parts = partsForDevice(state.deviceId),
    subparts = subpartsForDevice(state.deviceId);
  const exteriorOnly = modelForDevice(state.deviceId).category !== "server";
  return (
    <section className="assembly-controls" aria-label="设备结构控制">
      <div className="section-heading">
        <h3>{exteriorOnly ? "内部配置示意" : "结构拆解"}</h3>
        <span className="assembly-percent">
          {Math.round(state.explosion * 100)}
          <small>%</small>
        </span>
      </div>
      <fieldset disabled={!ready} aria-label="部件展开与选择">
        {!exteriorOnly && (
          <button
            className="component-focus"
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
            {exteriorOnly ? "展开配置示意" : "爆炸展开"} <span>↗</span>
          </button>
          <button onClick={() => dispatch({ type: "explode", amount: 0 })}>
            {exteriorOnly ? "复原外观" : "复原部件"} <span>↙</span>
          </button>
        </div>
        <label className="part-select-label" htmlFor="part-select">
          选择部件{" "}
          <span>
            {parts.length} 模组 · {subparts.length} 子件
          </span>
        </label>
        <select
          id="part-select"
          value={
            [...parts, ...subparts].some((part) => part.id === state.selected)
              ? state.selected
              : ""
          }
          onChange={(event) => {
            dispatch({
              type: "select",
              id: event.target.value || state.deviceId,
            });
            if (
              subparts.some((part) => part.id === event.target.value) &&
              state.explosion === 0
            )
              dispatch({ type: "explode", amount: 1 });
          }}
        >
          <option value="">整台设备</option>
          {parts.map((part) => (
            <option key={part.id} value={part.id}>
              {part.name} · {part.slot}
            </option>
          ))}
          {parts
            .filter((part) =>
              subparts.some((child) => child.parent === part.id),
            )
            .map(({ id: parent }) => (
              <optgroup
                key={parent}
                label={parts.find((part) => part.id === parent)!.name}
              >
                {subparts
                  .filter((part) => part.parent === parent)
                  .map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.name} · {part.slot}
                    </option>
                  ))}
              </optgroup>
            ))}
        </select>
        <button
          className="component-focus"
          onClick={() => dispatch({ type: "focus" })}
        >
          聚焦当前部件 ↗
        </button>
      </fieldset>
    </section>
  );
}
