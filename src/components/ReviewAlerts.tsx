import { useState } from "react";
import { devices, rackForDevice } from "../installation";
import { resourceCatalog } from "../review-resources";
import type { SpatialReading } from "../spatial";
import { signalFor, signalStyles } from "../status";

export function ReviewAlerts({
  readings,
  selected,
  time,
  onPick,
  onLocate,
}: {
  readings: Map<string, SpatialReading>;
  selected: string;
  time: number;
  onPick: (id: string) => void;
  onLocate: (id: string) => void;
}) {
  const [filter, setFilter] = useState("all");
  const alerts = devices
    .map((d) => readings.get(d.id)!)
    .filter((r) => r.alarm > 0)
    .sort((a, b) => b.alarm - a.alarm || a.name.localeCompare(b.name));
  const names = new Map(resourceCatalog("srv-01").map((r) => [r.id, r.name]));
  const filtered = alerts.filter(
    (r) => filter === "all" || r.alarm === Number(filter),
  );
  return (
    <section className="review-alerts-view" aria-label="告警列表">
      <div className="review-alerts-heading">
        <div>
          <h2>
            当前告警 <small>{alerts.length} 台设备</small>
          </h2>
          <p>全机房 · t+{time}s · 设备进风温度</p>
        </div>
        <div className="review-alerts-filters" aria-label="告警级别">
          {[
            ["all", "全部"],
            ["2", "◆ 严重"],
            ["1", "▲ 预警"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="review-alerts-list">
        {filtered.map((reading) => {
          const signal = signalStyles[signalFor(reading)];
          return (
            <div
              className={`review-alert-row ${selected === reading.id ? "selected" : ""}`}
              key={reading.id}
            >
              <button
                className="review-alert-select"
                onClick={() => onPick(reading.id)}
                aria-pressed={selected === reading.id}
              >
                <span style={{ color: signal.color }}>
                  {signal.icon} {signal.label}
                </span>
                <strong>{names.get(reading.id)}</strong>
                <small>
                  {rackForDevice(reading.id).name} · 进风{" "}
                  {reading.temperature?.toFixed(1)} °C
                </small>
              </button>
              <button
                className="review-alert-locate"
                onClick={() => onLocate(reading.id)}
              >
                定位
              </button>
            </div>
          );
        })}
        {!filtered.length && (
          <p className="review-alert-empty">
            {alerts.length ? "当前级别没有告警" : "当前时刻没有活动告警"}
          </p>
        )}
      </div>
    </section>
  );
}
