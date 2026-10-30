import { useState } from "react";
import { deviceObservation } from "../device-data";
import { qualityNames } from "../status";
import type { Action, AppState } from "../domain";
import type { SimulationSnapshot } from "../simulation";
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
  const [selection, setSelection] = useState<{
    view: string;
    metric: "temperature" | "power" | "alarms";
  }>({ view, metric: "temperature" });
  const active =
    selection.view === view
      ? selection.metric
      : view === "power" || view === "alarms"
        ? view
        : "temperature";
  const observation = deviceObservation(
      state.time,
      state.deviceId,
      state.replayCycle,
    ),
    events = observation.quality === "valid" ? sample.events : [];
  return (
    <div className={`observation-dock ${expanded ? "expanded" : "collapsed"}`}>
      {!expanded ? (
        <button
          className="observation-toggle"
          aria-label="打开趋势与时间"
          onClick={() => onExpanded(true)}
        >
          <svg
            width="16"
            height="12"
            viewBox="0 0 16 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 10 5 7 8 9 11 2 15 4"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
          趋势
        </button>
      ) : (
        <>
          <div className="dock-heading">
            <strong>{state.deviceId.toUpperCase()}</strong>
            <div className="trend-tabs">
              {(
                [
                  ["temperature", "温度"],
                  ["power", "功耗"],
                  ["alarms", "事件"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={active === id}
                  onClick={() => setSelection({ view, metric: id })}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              className="dock-close"
              aria-label="关闭趋势与时间"
              onClick={() => onExpanded(false)}
            >
              ×
            </button>
          </div>
          {active !== "alarms" ? (
            <TrendChart
              compact
              time={state.time}
              metric={active}
              deviceId={state.deviceId}
            />
          ) : (
            <ol className="scene-events" aria-label="已发生事件">
              {events.map((event) => (
                <li key={event.id} className={`event-${event.kind}`}>
                  <button
                    onClick={() => dispatch({ type: "seek", time: event.time })}
                  >
                    <time>{event.time}s</time>
                    <strong>{event.title}</strong>
                  </button>
                </li>
              ))}
              {!events.length && (
                <li className="scene-event-empty">
                  {observation.quality === "valid"
                    ? "当前没有事件"
                    : "没有有效观测"}
                </li>
              )}
            </ol>
          )}
          <details className="time-controls">
            <summary>
              时间控制{" "}
              <small>
                {state.time}s / 120s · {qualityNames[observation.quality]}
              </small>
            </summary>
            <div className="scene-playback">
              <button
                aria-label={state.playing ? "暂停运行回放" : "播放运行回放"}
                onClick={() => dispatch({ type: "play" })}
              >
                {state.playing ? "Ⅱ" : "▷"}
              </button>
              <input
                aria-label="运行回放时间"
                type="range"
                min="0"
                max="120"
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
                aria-label="重新播放场景"
                onClick={() => dispatch({ type: "replay" })}
              >
                ↺
              </button>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
