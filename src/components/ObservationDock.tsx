import { deviceObservation } from "../device-data";
import { qualityNames } from "../status";
import { trendScale } from "../chart";
import type { Action, AppState } from "../domain";
import type { SimulationSnapshot } from "../simulation";
import { severityNames } from "../simulation";
import type { InspectionView } from "./ReplayPanel";
import { TrendChart } from "./TrendChart";

export function ObservationDock({
  state,
  sample,
  view,
  dispatch,
  onExpanded,
  expanded,
}: {
  state: AppState;
  sample: SimulationSnapshot;
  view: Exclude<InspectionView, "object">;
  dispatch: React.Dispatch<Action>;
  onExpanded: (expanded: boolean) => void;
  expanded: boolean;
}) {
  const observation = deviceObservation(
    state.time,
    state.deviceId,
    state.replayCycle,
  );
  const current = observation.quality === "valid";
  const events = current ? sample.events : [];
  return (
    <div
      className={`observation-dock ${view} ${expanded ? "expanded" : "collapsed"}`}
    >
      {expanded && (
        <>
          <div className="dock-heading">
            <strong>
              {view === "temperature"
                ? "设备进风温度"
                : view === "power"
                  ? "整机输入功耗"
                  : "告警事件回放"}
            </strong>
            <span>{state.deviceId.toUpperCase()} · 模拟</span>
            <small>
              {view === "power"
                ? `${trendScale("power", state.deviceId).caption} · 模拟`
                : view === "temperature"
                  ? "单点测温 · 非空间热场"
                  : !current
                    ? qualityNames[observation.quality]
                    : sample.alarm?.active
                      ? `当前${severityNames[sample.alarm.severity]}`
                      : sample.alarm
                        ? "已恢复"
                        : "当前无告警"}
            </small>
          </div>
          {view !== "alarms" && view !== "status" ? (
            <TrendChart
              compact
              time={state.time}
              metric={view}
              deviceId={state.deviceId}
            />
          ) : (
            <ol className="scene-events" aria-label="已发生事件">
              {events.map((event) => (
                <li key={event.id} className={`event-${event.kind}`}>
                  <button
                    onClick={() => dispatch({ type: "seek", time: event.time })}
                    title={event.detail}
                  >
                    <time>{String(event.time).padStart(3, "0")} s</time>
                    <strong>{event.title}</strong>
                    <span>回看此刻 ↗</span>
                  </button>
                </li>
              ))}
              {!events.length && (
                <li className="scene-event-empty">
                  {current
                    ? "当前时刻没有事件 · 20 秒开始注入冷却变化"
                    : "没有当前有效观测，事件记录不可用"}
                </li>
              )}
            </ol>
          )}
        </>
      )}
      <div className="scene-playback">
        <button
          className="dock-expand"
          aria-label={expanded ? "收起趋势与事件" : "展开趋势与事件"}
          aria-expanded={expanded}
          onClick={() => {
            onExpanded(!expanded);
          }}
        >
          {expanded ? "收起" : "趋势"}
        </button>
        <button
          aria-label={state.playing ? "暂停运行回放" : "播放运行回放"}
          onClick={() => dispatch({ type: "play" })}
        >
          {state.playing ? "Ⅱ" : "▷"}
        </button>
        <output htmlFor="scene-replay-time">
          {String(state.time).padStart(3, "0")}
          <small> /120 s</small>
        </output>
        <input
          id="scene-replay-time"
          aria-label="运行回放时间"
          aria-valuetext={`${state.time} 秒，${qualityNames[observation.quality]}`}
          type="range"
          min="0"
          max="120"
          step="1"
          value={state.time}
          onChange={(e) =>
            dispatch({ type: "seek", time: Number(e.target.value) })
          }
        />
        <select
          aria-label="回放倍速"
          value={state.playbackRate}
          onChange={(e) =>
            dispatch({
              type: "rate",
              rate: Number(e.target.value) as 1 | 2 | 4,
            })
          }
        >
          {[1, 2, 4].map((rate) => (
            <option key={rate} value={rate}>
              {rate}×
            </option>
          ))}
        </select>
        <button
          className="loop-control"
          aria-label="循环运行回放"
          aria-pressed={state.loop}
          onClick={() => dispatch({ type: "loop" })}
        >
          循环
        </button>
        <button
          aria-label="重新播放模拟"
          title="重新播放模拟"
          onClick={() => dispatch({ type: "replay" })}
        >
          ↺
        </button>
      </div>
    </div>
  );
}
