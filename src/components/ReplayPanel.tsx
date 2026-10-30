import { StatePanel } from "./StatePanel";
import { qualityNames } from "../status";
import { deviceObservation } from "../device-data";
import { useMemo } from "react";
import { scenario, severityNames } from "../simulation";
import type { SimulationSnapshot } from "../simulation";
import type { Action, AppState } from "../domain";
import { entityById } from "../domain";
import { deviceById, devices, rackForDevice } from "../installation";
import { spatialSnapshot, selectedReading } from "../spatial";
export type InspectionView =
  "object" | "status" | "temperature" | "power" | "alarms";
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
  const spatial = useMemo(
    () => spatialSnapshot(state.time, state.replayCycle, state.deviceId),
    [state.time, state.replayCycle, state.deviceId],
  );
  const reading = selectedReading(state, spatial.readings);
  const isPart = reading?.id.includes("/");
  const currentObservation = deviceObservation(state.time, state.deviceId);
  const currentPowerAvailable =
    currentObservation.quality === "valid" &&
    currentObservation.lifecycle !== "stopped";
  const visibleDevices = devices.filter(
    (device) =>
      state.selected === "room-01" ||
      device.rackId === state.selected ||
      device.id === (deviceById(state.selected)?.id ?? state.deviceId),
  );
  const coveredEnergy = visibleDevices
    .map((device) => deviceObservation(state.time, device.id).energyWh)
    .filter((value): value is number => value !== null);
  const alarms = visibleDevices
    .map((device) => ({ device, sample: spatial.samples.get(device.id)! }))
    .filter(
      (item) =>
        spatial.readings.get(item.device.id)?.quality === "valid" &&
        item.sample.alarm,
    );
  const title =
    view === "temperature"
      ? "温度云图"
      : view === "power"
        ? "功耗分布"
        : "告警定位";
  if (view === "status")
    return <StatePanel state={state} dispatch={dispatch} />;
  return (
    <section className="replay-panel" aria-label={title}>
      <div className="overline">空间观察 · 模拟</div>
      <h2>{title}</h2>
      <p className="overview-target">
        {reading?.name ?? "未配置数据"} · t + {state.time} s
      </p>
      {reading && reading.quality !== "valid" && (
        <p className="data-quality-note">
          数据质量：{qualityNames[reading.quality]}
          {reading.observedAt !== null
            ? ` · 观测于 t+${reading.observedAt}s`
            : ""}
          ；不按当前有效值汇总。
        </p>
      )}
      {view !== "alarms" ? (
        <>
          <div className="replay-value">
            <strong>
              {reading
                ? ((view === "temperature"
                    ? reading.temperature?.toFixed(1)
                    : reading.power?.toFixed(1)) ?? "未定义")
                : "未配置"}
              <small>
                {reading &&
                (view === "temperature"
                  ? reading.temperature
                  : reading.power) !== null
                  ? view === "temperature"
                    ? " °C"
                    : " W"
                  : ""}
              </small>
            </strong>
            <span>
              {view === "temperature"
                ? reading?.temperatureLabel
                : reading?.powerLabel}
            </span>
          </div>
          <div
            className={`surface-legend ${view}`}
            aria-label={view === "temperature" ? "温度色阶" : "功耗色阶"}
          >
            <div />
            <span>{view === "temperature" ? "20 °C" : "0%"}</span>
            <span>
              {view === "temperature"
                ? state.level === "device"
                  ? "50"
                  : "32.5"
                : "50%"}
            </span>
            <span>
              {view === "temperature"
                ? state.level === "device"
                  ? "80 °C"
                  : "45 °C"
                : "100%"}
            </span>
          </div>
          <p className="legend-caption">
            {view === "temperature"
              ? state.level === "device"
                ? "部件代表温度 + 表面插值 · 示意温度场"
                : "设备进风温度；机柜取设备最高值"
              : "颜色 = 功耗 / 演示预算；灰色为未定义"}
          </p>
          {reading && view === "power" && reading.budget !== null && (
            <dl className="spatial-facts">
              <div>
                <dt>演示预算</dt>
                <dd>{reading.budget.toFixed(1)} W</dd>
              </div>
              <div>
                <dt>已覆盖预算占比</dt>
                <dd>
                  {reading.power === null
                    ? "未定义"
                    : `${((reading.power / reading.budget) * 100).toFixed(1)}%`}
                </dd>
              </div>
            </dl>
          )}
          {view === "power" && reading && !isPart && (
            <dl className="spatial-facts">
              <div>
                <dt>
                  0–{state.time}s 累计电量 · 覆盖 {coveredEnergy.length}/
                  {visibleDevices.length} 台
                </dt>
                <dd>
                  {coveredEnergy.length
                    ? `${coveredEnergy.reduce((sum, value) => sum + value, 0).toFixed(2)} Wh`
                    : "没有有效观测"}
                </dd>
              </div>
            </dl>
          )}
          {reading && reading.count > 1 && (
            <dl className="spatial-facts">
              <div>
                <dt>温度有效覆盖</dt>
                <dd>
                  {reading.coverageTemperature} / {reading.count} 台设备
                </dd>
              </div>
              <div>
                <dt>功耗有效覆盖</dt>
                <dd>
                  {reading.coveragePower} / {reading.count} 台设备
                </dd>
              </div>
              <div>
                <dt>活动告警</dt>
                <dd>{reading.alarmCount} 台设备</dd>
              </div>
            </dl>
          )}
          {view === "temperature" && (
            <>
              <div className="cooling-capacity">
                <span>
                  设定冷却能力<b>{sample.coolingCapacity}%</b>
                </span>
                <div>
                  <i style={{ width: `${sample.coolingCapacity}%` }} />
                </div>
              </div>
              <label className="check-control">
                <input
                  type="checkbox"
                  checked={showCooling}
                  onChange={(e) => onCoolingChange(e.target.checked)}
                />
                显示预设冷却关联
              </label>
            </>
          )}
          {view === "power" &&
            state.level === "device" &&
            currentPowerAvailable && (
              <details className="spatial-allocation">
                <summary>整机功耗分配 · 假设</summary>
                <div className="power-allocation">
                  {sample.allocation.map((item) => (
                    <div key={item.id}>
                      <span>{item.name}</span>
                      <b>{item.watts.toFixed(1)} W</b>
                      <i
                        style={{
                          width: `${(item.watts / sample.power) * 100}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <p className="replay-note">
                  处理器功耗为逻辑分配，尚无独立芯片模型。散热器与上盖为被动构件，耗电为零；盘位构件没有独立耗电数据。分配总和等于整机输入，不把被动散热器当作处理器耗电。
                </p>
              </details>
            )}
          {isPart && (
            <p className="component-source-note">
              {view === "temperature"
                ? "温度来自演示温升模型，没有该部件的独立传感器或告警。"
                : "功耗来自模型分配，没有独立电表。盘位耗电未定义，散热器与上盖为被动件，耗电为零。"}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="replay-value">
            <strong>
              {reading?.alarmCount ?? "—"}
              <small> 台</small>
            </strong>
            <span>当前范围内存在活动告警的设备</span>
          </div>
          <div className="alarm-legend">
            <span>
              <i />
              无活动告警
            </span>
            <span>
              <i />
              预警
            </span>
            <span>
              <i />
              严重
            </span>
          </div>
          {isPart && (
            <p className="component-source-note">
              当前告警属于设备进风测点，未归因到此部件；部件保持中性色。
            </p>
          )}
          <div className="spatial-alarm-list">
            {alarms.map(({ device, sample: other }) => (
              <button
                key={device.id}
                className={`status-${other.alarm!.active ? other.alarm!.severity : "normal"}`}
                onClick={() => dispatch({ type: "locate", id: device.id })}
              >
                <span>
                  <i className="status-dot" />
                  {device.name}
                  <b>
                    {other.alarm!.active
                      ? severityNames[other.alarm!.severity]
                      : "已恢复"}
                  </b>
                </span>
                <small>
                  {other.temperature.toFixed(1)} °C · 触发{" "}
                  {other.alarm!.raisedAt}s
                  {other.alarm!.recoveredAt !== null
                    ? ` · 恢复 ${other.alarm!.recoveredAt}s`
                    : ""}{" "}
                  ↗
                </small>
              </button>
            ))}
          </div>
          {!alarms.length && (
            <p className="replay-note">当前回放时刻没有该范围内的告警记录。</p>
          )}
        </>
      )}
      {reading && state.level !== "device" && (
        <div className="spatial-actions">
          <button
            onClick={() =>
              dispatch({
                type: "locate",
                id:
                  state.level === "rack" &&
                  entityById(state.selected)?.kind !== "device"
                    ? state.deviceId
                    : state.selected === "room-01"
                      ? rackForDevice(state.deviceId).id
                      : state.selected,
              })
            }
          >
            {state.level === "rack" ||
            entityById(state.selected)?.kind === "device"
              ? "查看设备"
              : "进入机柜"}
            <span>↗</span>
          </button>
        </div>
      )}
      {state.level === "device" && (
        <div className="spatial-actions">
          <button
            onClick={() =>
              dispatch({ type: "explode", amount: state.explosion > 0 ? 0 : 1 })
            }
          >
            {state.explosion > 0 ? "复原结构" : "展开部件"}
            <span>↗</span>
          </button>
          <button onClick={() => dispatch({ type: "focus" })}>
            聚焦当前对象
          </button>
        </div>
      )}
      <details className="replay-options">
        <summary>脚本跳转</summary>
        <div className="replay-jumps">
          {[
            [0, "初始"],
            [20, "减弱"],
            [60, "高温"],
            [78, "恢复输入"],
            [120, "结束"],
          ].map(([time, label]) => (
            <button
              key={time}
              onClick={(event) => {
                const panel = event.currentTarget.closest(".inspector-scroll");
                const details = event.currentTarget.closest("details");
                dispatch({ type: "seek", time: Number(time) });
                if (details) details.open = false;
                event.currentTarget.blur();
                requestAnimationFrame(() => panel?.scrollTo({ top: 0 }));
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </details>
      <details className="simulation-rules">
        <summary>数据来源与模拟规则</summary>
        <p>
          {reading?.source ??
            "该设施没有定义运行测点；灰色表示未定义，不是零值。"}
        </p>
        <p>
          八机柜、六十四设备均为演示配置。各设备有独立的进风基线、冷却响应和负载系数，共用
          120
          秒时钟。机柜温度取子设备最高值，功耗仅汇总有效观测，告警取最高级别；只覆盖已展示设备。
        </p>
        <p>
          设备进风温度按一阶模型响应。≥33°C持续5秒预警，≥38°C持续5秒严重，≤36°C持续5秒降级，≤31°C持续8秒恢复。阈值只用于演示。
        </p>
        <p>
          部件温度 = 设备进风温度 +
          预设温升，再在表面做前后方向插值。没有真实部件传感器、空间测温或
          CFD；色块不是测量结果。功耗是预算分配，没有设施能耗或
          PUE。展开与巡游不随数据回看倒放。
        </p>
        <code>{scenario.id}</code>
      </details>
    </section>
  );
}
