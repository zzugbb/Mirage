import { modelForDevice, unitLabel } from "../catalog";
import { useMemo } from "react";
import type { Action, AppState } from "../domain";
import { entityById } from "../domain";
import { racks, devices, rackForDevice } from "../installation";
import { spatialSnapshot, selectedReading } from "../spatial";
import type { SpatialReading } from "../spatial";
import {
  signalStyles,
  signalFor,
  signalText,
  lifecycleNames,
  qualityNames,
} from "../status";
import type { Signal } from "../status";
export function SignalBadge({
  reading,
}: {
  reading: SpatialReading | null | undefined;
}) {
  const signal = signalFor(reading);
  return (
    <span
      className={`signal-badge signal-${signal}`}
      style={
        { "--signal-color": signalStyles[signal].color } as React.CSSProperties
      }
    >
      <i aria-hidden="true">{signalStyles[signal].icon}</i>
      {signalText(reading)}
    </span>
  );
}
const value = (
  number: number | null,
  unit: string,
  reading: SpatialReading | null,
) =>
  number === null
    ? reading && reading.quality !== "valid"
      ? qualityNames[reading.quality]
      : "未配置"
    : `${number.toFixed(1)} ${unit}`;
export function StatePanel({
  state,
  dispatch,
}: {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}) {
  const { readings } = useMemo(
    () => spatialSnapshot(state.time, state.replayCycle, state.deviceId),
    [state.time, state.replayCycle, state.deviceId],
  );
  const reading = selectedReading(state, readings);
  const kind = entityById(state.selected)?.kind;
  const isPart = kind === "part";
  const rows =
    kind === "room"
      ? racks.map((rack) => ({
          id: rack.id,
          label: rack.name,
          detail: `${devices.filter((device) => device.rackId === rack.id).length} 台设备`,
        }))
      : kind === "rack"
        ? devices
            .filter((device) => device.rackId === state.selected)
            .toSorted((a, b) => b.startUnit - a.startUnit)
            .map((device) => ({
              id: device.id,
              label: device.name,
              detail: `${unitLabel(device.id)} · ${modelForDevice(device.id).name}`,
            }))
        : [];
  const scope =
    kind === "room"
      ? devices
      : kind === "rack"
        ? devices.filter((device) => device.rackId === state.selected)
        : devices.filter((device) => device.id === state.deviceId);
  const severity = scope.reduce(
    (counts, device) => {
      const alarm = readings.get(device.id)!.alarm;
      counts[alarm]++;
      return counts;
    },
    [0, 0, 0],
  );
  const source = reading?.quality;
  return (
    <section className="state-panel" aria-label="运行状态">
      <div className="overline">
        {kind === "device" ? modelForDevice(state.deviceId).name : "运行状态"}
      </div>
      <h2>{reading?.name ?? entityById(state.selected)?.name}</h2>
      {kind === "device" && (
        <p className="equipment-brief">
          {modelForDevice(state.deviceId).description}
        </p>
      )}
      <div className="state-primary">
        <SignalBadge reading={reading} />
        <span>{kind === "rack" ? "42U" : ""}</span>
      </div>
      {reading && reading.count > 1 ? (
        <>
          <dl className="lifecycle-totals">
            {(
              Object.keys(lifecycleNames) as (keyof typeof lifecycleNames)[]
            ).map((key) => (
              <div key={key}>
                <dt>{lifecycleNames[key]}</dt>
                <dd>{reading.lifecycleCounts[key]}</dd>
              </div>
            ))}
          </dl>
          <div className="severity-totals">
            <span>
              <i className="severity-critical" />
              严重 <b>{severity[2]}</b>
            </span>
            <span>
              <i className="severity-warning" />
              预警 <b>{severity[1]}</b>
            </span>
            <span>告警按设备计</span>
          </div>
          <p className="coverage-line">
            有效遥测 {reading.qualityCounts.valid} / {reading.count}
            <span>
              过期 {reading.qualityCounts.stale} · 未配置{" "}
              {reading.qualityCounts.missing}
            </span>
          </p>
        </>
      ) : (
        <>
          <dl className="state-metrics">
            <div>
              <dt>{reading?.temperatureLabel ?? "温度"}</dt>
              <dd>{value(reading?.temperature ?? null, "°C", reading)}</dd>
            </div>
            <div>
              <dt>{reading?.powerLabel ?? "功耗"}</dt>
              <dd>{value(reading?.power ?? null, "W", reading)}</dd>
            </div>
          </dl>
          {reading && !isPart && (
            <dl className="spatial-facts">
              <div>
                <dt>生命周期</dt>
                <dd>{lifecycleNames[reading.lifecycle]}</dd>
              </div>
              <div>
                <dt>数据质量</dt>
                <dd>{qualityNames[reading.quality]}</dd>
              </div>
              {reading.observedAt !== null && source === "stale" && (
                <div>
                  <dt>观测时刻</dt>
                  <dd>
                    t + {reading.observedAt}s · 已过{" "}
                    {state.time - reading.observedAt}s
                  </dd>
                </div>
              )}
            </dl>
          )}
        </>
      )}
      {rows.length > 0 && (
        <div
          className="state-object-list"
          aria-label={kind === "room" ? "机柜状态列表" : "设备状态列表"}
        >
          {rows.map((row) => {
            const child = readings.get(row.id)!;
            return (
              <button
                key={row.id}
                onClick={() =>
                  dispatch({
                    type: kind === "room" ? "select" : "locate",
                    id: row.id,
                  })
                }
              >
                <span className="state-object-name">
                  <strong>{row.label}</strong>
                  <small>{row.detail}</small>
                </span>
                <SignalBadge reading={child} />
              </button>
            );
          })}
        </div>
      )}
      {reading && state.level !== "device" && (
        <div className="spatial-actions">
          <button
            onClick={() =>
              dispatch({
                type: "locate",
                id:
                  state.level === "rack" && kind !== "device"
                    ? state.deviceId
                    : kind === "room"
                      ? rackForDevice(state.deviceId).id
                      : state.selected,
              })
            }
          >
            {state.level === "rack" || kind === "device"
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
      <details className="status-key">
        <summary>状态图例与边界</summary>
        <div>
          {(Object.keys(signalStyles) as Signal[])
            .filter((key) => key !== "partial")
            .map((key) => (
              <span key={key} style={{ color: signalStyles[key].color }}>
                <i>{signalStyles[key].icon}</i>
                {signalStyles[key].label}
              </span>
            ))}
        </div>
        <p>
          运行状态、告警级别与数据质量独立记录。灰色不代表正常；离线不按零功耗处理，过期值不进入当前功耗合计。部件分级来自演示温升模型。
        </p>
      </details>
    </section>
  );
}
