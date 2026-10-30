import { StatePanel } from "./StatePanel";
import { qualityNames } from "../status";
import { deviceObservation } from "../device-data";
import { useMemo } from "react";
import { severityNames } from "../simulation";
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
      <div className="overline">空间观察</div>
      <h2>{title}</h2>
      <p className="overview-target">{reading?.name ?? "未配置数据"}</p>
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
          {view === "temperature" && state.level === "room" && (
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
                  按当前配置分配整机输入；被动结构为零功耗。
                </p>
              </details>
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
              设备进风告警，未归因到当前部件。
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
    </section>
  );
}
