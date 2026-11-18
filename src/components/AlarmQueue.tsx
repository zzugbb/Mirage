import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  alarmQueue,
  alarmCurrentStatus,
  type AlarmSeverity,
  type AlarmVisit,
} from "../alarm-queue";
import { deviceById, rackForDevice } from "../installation";
import { unitLabel } from "../catalog";
import type { SpatialReading } from "../spatial";

export function AlarmQueue({
  readings,
  query,
  onQuery,
  severity,
  onSeverity,
  selected,
  ready,
  visible,
  scroll,
  restoreRevision,
  returned,
  onSelect,
  onPreview,
}: {
  readings: Map<string, SpatialReading>;
  query: string;
  onQuery: (query: string) => void;
  severity: AlarmSeverity;
  onSeverity: (severity: AlarmSeverity) => void;
  selected: string;
  ready: boolean;
  visible: boolean;
  scroll: RefObject<number>;
  restoreRevision: number;
  returned: AlarmVisit | null;
  onSelect: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  const queue = alarmQueue(readings, query, severity);
  const host = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (!visible || !host.current) return;
    host.current.scrollTop = scroll.current;
    if (!restoreRevision) return;
    const button = host.current.querySelector<HTMLButtonElement>(
      `[data-alarm-id="${returned?.id}"]`,
    );
    (button ?? search.current)?.focus({ preventScroll: true });
    (button ?? search.current)?.scrollIntoView({ block: "nearest" });
  }, [visible, restoreRevision, scroll]);
  return (
    <section
      className="alarm-queue"
      aria-label="当前告警设备"
      ref={host}
      onScroll={(event) => {
        scroll.current = event.currentTarget.scrollTop;
      }}
    >
      <label>
        查找设备或柜位
        <input
          ref={search}
          aria-label="查找告警设备"
          placeholder="设备、机柜或 U 位"
          value={query}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !query) return;
            event.stopPropagation();
            onQuery("");
          }}
          onChange={(event) => {
            scroll.current = 0;
            if (host.current) host.current.scrollTop = 0;
            onQuery(event.target.value);
          }}
        />
      </label>
      <div className="alarm-queue-filters" role="group" aria-label="告警级别">
        {(
          [
            ["all", "全部", queue.all.length],
            ["critical", "严重", queue.critical],
            ["warning", "预警", queue.warning],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            aria-pressed={severity === value}
            onClick={() => {
              scroll.current = 0;
              if (host.current) host.current.scrollTop = 0;
              onSeverity(value);
            }}
          >
            {label} {count}
          </button>
        ))}
      </div>
      {returned && (
        <p className="alarm-queue-returned">
          刚排查 {deviceById(returned.id)?.name} · 进入时{" "}
          {returned.time.toFixed(0)} s /{" "}
          {returned.severity === 2 ? "严重" : "预警"}。<br />
          {alarmCurrentStatus(readings.get(returned.id))}
          {!queue.rows.some((row) => row.device.id === returned.id) &&
            "；不在当前筛选列表中"}
          。
        </p>
      )}
      {query.trim() && queue.rows.length > 0 && (
        <p className="alarm-queue-count">匹配 {queue.rows.length} 台</p>
      )}
      {queue.rows.map(({ device, reading, location }) => (
        <article
          key={device.id}
          aria-label={`${device.name}告警`}
          className={selected === device.id ? "selected" : ""}
        >
          <button
            className="alarm-queue-preview"
            data-alarm-id={device.id}
            aria-pressed={selected === device.id}
            onClick={() => onSelect(device.id)}
          >
            <strong>
              {device.name}
              <span className={reading.alarm === 2 ? "critical" : "warning"}>
                {reading.alarm === 2 ? "◆ 严重" : "▲ 预警"}
              </span>
            </strong>
            <small>
              <span>{location}</span>
              <span>进风 {reading.temperature?.toFixed(1) ?? "—"} °C</span>
            </small>
          </button>
          {selected === device.id && (
            <button
              className="alarm-queue-details"
              onClick={() => onPreview(device.id)}
            >
              查看告警详情
            </button>
          )}
        </article>
      ))}
      {!queue.rows.length && (
        <p className="study-empty">
          {queue.all.length
            ? "没有匹配的告警设备"
            : "当前有效读数中没有活动告警"}
          {(query || severity !== "all") && (
            <button
              onClick={() => {
                onQuery("");
                onSeverity("all");
              }}
            >
              清除告警筛选
            </button>
          )}
        </p>
      )}
      {returned && !queue.all.some((row) => row.device.id === returned.id) && (
        <div className="alarm-queue-followup">
          <p>
            原对象 · {rackForDevice(returned.id).name} ·{" "}
            {unitLabel(returned.id)}
          </p>
          <button disabled={!ready} onClick={() => onPreview(returned.id)}>
            查看原设备详情
          </button>
        </div>
      )}
      <details>
        <summary>判定与数据边界</summary>
        <p>
          列表随共享模拟时间更新，仅列设备进风温度的有效活动告警。
          {queue.unavailable}{" "}
          台读数缺失、过期或离线，不能据此判定正常。机柜是汇总，部件是模型评估；均不重复计数。这里不执行告警确认或消除。
        </p>
      </details>
    </section>
  );
}
