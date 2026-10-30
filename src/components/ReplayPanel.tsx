import { TrendChart } from "./TrendChart";
import { phaseNames, scenario, severityNames } from "../simulation";
import type { SimulationSnapshot } from "../simulation";
import type { Action, AppState } from "../domain";

export type InspectionView = "object" | "temperature" | "power" | "alarms";
export function ReplayPanel({
  state,
  sample,
  view,
  dispatch,
  showCooling,
  onCoolingChange,
}: {
  state: AppState;
  sample: SimulationSnapshot;
  view: Exclude<InspectionView, "object">;
  dispatch: React.Dispatch<Action>;
  showCooling: boolean;
  onCoolingChange: (show: boolean) => void;
}) {
  const active = !!sample.alarm?.active;
  const status = active ? sample.alarm!.severity : "normal";
  const title =
    view === "temperature"
      ? "温度与冷却"
      : view === "power"
        ? "功耗与电量"
        : "告警与事件";
  const clock = (
    <div className="replay-clock">
      <div className="replay-clock-heading">
        <label htmlFor="replay-time">回放时间</label>
        <output htmlFor="replay-time">
          {String(state.time).padStart(3, "0")}
          <small> / 120 s</small>
        </output>
      </div>
      <input
        id="replay-time"
        type="range"
        min={0}
        max={120}
        step={1}
        value={state.time}
        aria-valuetext={`${state.time} 秒，${sample.temperature} 摄氏度，${sample.temperatureStatus}`}
        onChange={(event) =>
          dispatch({ type: "seek", time: Number(event.target.value) })
        }
      />
      <div className="replay-playback">
        <button
          className="replay-toggle"
          onClick={() => dispatch({ type: "play" })}
        >
          {state.playing ? "Ⅱ 暂停回放" : "▷ 播放回放"}
        </button>
        <select
          aria-label="回放倍速"
          value={state.playbackRate}
          onChange={(event) =>
            dispatch({
              type: "rate",
              rate: Number(event.target.value) as 1 | 2 | 4,
            })
          }
        >
          {[1, 2, 4].map((rate) => (
            <option key={rate} value={rate}>
              {rate}×
            </option>
          ))}
        </select>
        <button onClick={() => dispatch({ type: "replay" })}>↺ 重播</button>
      </div>
    </div>
  );
  const options = (
    <details className="replay-options">
      <summary>脚本节点与循环设置</summary>
      <div className="replay-jumps" aria-label="跳转脚本时刻">
        {[
          [0, "初始"],
          [20, "减弱"],
          [60, "高温"],
          [78, "恢复输入"],
          [120, "结束"],
        ].map(([time, label]) => (
          <button
            key={time}
            onClick={() => dispatch({ type: "seek", time: Number(time) })}
            title={`回看 ${time} 秒`}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="check-control">
        <input
          type="checkbox"
          checked={state.loop}
          onChange={() => dispatch({ type: "loop" })}
        />
        循环回放<span>拖动会暂停并接管巡游</span>
      </label>
    </details>
  );
  return (
    <section className={`replay-panel status-${status}`} aria-label={title}>
      <div className="overline">模拟运行 · 冷却扰动 v1</div>
      <h2>{title}</h2>
      <div className="replay-phase">
        <i className="status-dot" />
        {phaseNames[sample.phase]}
        <span>第 {state.replayCycle + 1} 轮</span>
      </div>
      {clock}

      {view === "temperature" && (
        <>
          <div className="replay-value">
            <strong>
              {sample.temperature.toFixed(1)}
              <small> °C</small>
            </strong>
            <span>SRV-01 · 进风温度</span>
          </div>
          <TrendChart time={state.time} metric="temperature" />
          <div className="cooling-capacity">
            <span>
              设定冷却能力 <b>{sample.coolingCapacity}%</b>
            </span>
            <div>
              <i style={{ width: `${sample.coolingCapacity}%` }} />
            </div>
          </div>
          <div className="replay-condition">
            {sample.pending
              ? `${sample.pending.label}：${sample.pending.elapsed} / ${sample.pending.required} s`
              : active
                ? `当前温度告警：${severityNames[sample.alarm!.severity]}`
                : sample.alarm
                  ? "告警已恢复"
                  : "当前无温度告警"}
          </div>
          {options}
          <div className="relationship-card">
            <span>预设冷却作用 · 模拟</span>
            <div>
              <button
                onClick={() =>
                  dispatch({ type: "locate", id: scenario.relation.source })
                }
              >
                制冷单元
              </button>
              <i>→</i>
              <button
                onClick={() =>
                  dispatch({ type: "locate", id: scenario.relation.target })
                }
              >
                SRV-01
              </button>
            </div>
            <label className="check-control">
              <input
                type="checkbox"
                checked={showCooling}
                onChange={(event) => onCoolingChange(event.target.checked)}
              />
              显示三维关联示意
            </label>
            <p className="replay-note">
              虚线只表示本场景的预设作用关系，不是真实管路或气流计算。
            </p>
          </div>
          <p className="replay-note">
            只提供设备进风温度模拟测点。芯片、内存和出风口尚未定义独立测点；曲线不是热流体仿真。
          </p>
        </>
      )}

      {view === "power" && (
        <>
          <div className="replay-value">
            <strong>
              {sample.power.toFixed(1)}
              <small> W</small>
            </strong>
            <span>SRV-01 · 整机输入功耗</span>
          </div>
          <TrendChart time={state.time} metric="power" />
          <div className="energy-total">
            <span>0–{state.time} s 累计电量</span>
            <strong>
              {sample.energyWh.toFixed(2)}
              <small> Wh</small>
            </strong>
          </div>
          {options}
          <h3 className="replay-section-title">
            模型功耗分配 <span>假设值</span>
          </h3>
          <div className="power-allocation">
            {sample.allocation.map((item) => (
              <div key={item.id}>
                <span>{item.name}</span>
                <b>{item.watts.toFixed(1)} W</b>
                <i style={{ width: `${(item.watts / sample.power) * 100}%` }} />
              </div>
            ))}
          </div>
          <p className="replay-note">
            整机输入 =
            各项分配与转换损耗之和。固定负载，风扇分配随温度变化；这些是演示假设，不是分项实测。未计入制冷、配电或未定义扩展卡，不计算机房
            PUE。
          </p>
        </>
      )}

      {view === "alarms" && (
        <>
          <section
            className={`alarm-card status-${status}`}
            aria-label="当前温度告警"
          >
            <div className="section-heading">
              <h3>
                {active
                  ? `温度${severityNames[sample.alarm!.severity]}`
                  : sample.alarm
                    ? "温度告警已恢复"
                    : "当前无告警"}
              </h3>
              <span className="tag">模拟</span>
            </div>
            <p>SRV-01 · 设备进风温度 {sample.temperature.toFixed(1)} °C</p>
            {sample.pending && (
              <p>
                {sample.pending.label}：{sample.pending.elapsed} /{" "}
                {sample.pending.required} s
              </p>
            )}
            {sample.alarm && (
              <dl>
                <div>
                  <dt>首次触发</dt>
                  <dd>t + {sample.alarm.raisedAt} s</dd>
                </div>
                <div>
                  <dt>恢复时间</dt>
                  <dd>
                    {sample.alarm.recoveredAt === null
                      ? "尚未恢复"
                      : `t + ${sample.alarm.recoveredAt} s`}
                  </dd>
                </div>
                <div>
                  <dt>历史最高级别</dt>
                  <dd>{severityNames[sample.alarm.peakSeverity]}</dd>
                </div>
              </dl>
            )}
            <button
              className="primary-button"
              onClick={() =>
                dispatch({ type: "locate", id: scenario.relation.target })
              }
            >
              定位设备<span>↗</span>
            </button>
          </section>
          {options}
          <h3 className="replay-section-title">
            已发生事件 <span>{sample.events.length}</span>
          </h3>
          <ol className="event-list">
            {sample.events.toReversed().map((event) => (
              <li key={event.id} className={`event-${event.kind}`}>
                <time>t + {event.time} s</time>
                <strong>{event.title}</strong>
                <p>{event.detail}</p>
                <div>
                  <button
                    onClick={() => dispatch({ type: "seek", time: event.time })}
                  >
                    回看此刻
                  </button>
                  <button
                    onClick={() =>
                      dispatch({ type: "locate", id: event.entityId })
                    }
                  >
                    定位对象
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {!sample.events.length && (
            <p className="event-empty">
              当前回放时刻还没有事件。20 秒开始注入冷却变化。
            </p>
          )}
        </>
      )}

      <details className="simulation-rules">
        <summary>模拟规则与边界</summary>
        <p>
          1 秒采样，一阶响应：T ← T + [27 + 20 × (1 − 冷却能力) − T] /
          12。冷却能力取 0–1，温度以 0.1 °C 分辨率参与判断。
        </p>
        <p>
          ≥33 °C 持续5秒触发预警，≥38 °C 持续5秒升级严重；≤36 °C
          持续5秒降级，≤31 °C 持续8秒恢复。阈值仅用于本演示。
        </p>
        <p>
          温度、功耗、告警和三维状态提示共用运行回放时钟。曲线和事件只显示到当前时刻；记录不跨循环累积，无真实设备接入。巡游与拆解姿态独立控制，不随回看时间倒放。
        </p>
        <code>{scenario.id}</code>
      </details>
    </section>
  );
}
