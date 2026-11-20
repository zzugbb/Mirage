import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  alarmQueue,
  alarmVisitLabel,
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
  onPreview: (id: string, previous?: AlarmVisit) => void;
}) {
  const queue = alarmQueue(readings, query, severity);
  const host = useRef<HTMLDivElement>(null);
  const returnedRow =
    returned && queue.rows.some((row) => row.device.id === returned.id);
  const search = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (!visible || !host.current) return;
    host.current.scrollTop = scroll.current;
    if (!restoreRevision || !returned) return;
    const button = host.current.querySelector<HTMLButtonElement>(
      `[data-alarm-id="${returned.id}"]`,
    );
    (button ?? search.current)?.focus({ preventScroll: true });
    if (button) button.scrollIntoView({ block: "nearest" });
    else host.current.scrollTop = 0;
  }, [visible, restoreRevision, scroll]);
  return (
    <section className="alarm-queue" aria-label="当前告警设备">
      <div className="alarm-queue-search">
        <label>
          <input
            ref={search}
            aria-label="查找告警设备"
            placeholder="查找设备、机柜或 U 位"
            value={query}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (
                event.key === "Enter" &&
                query.trim() &&
                queue.rows.length === 1
              ) {
                event.preventDefault();
                const target =
                  host.current?.querySelector<HTMLButtonElement>(
                    "[data-alarm-id]",
                  );
                target?.focus();
                target?.click();
                return;
              }
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
              data-active-severity={count > 0 ? value : undefined}
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
        {query.trim() && queue.all.length > 0 && (
          <p className="alarm-queue-count" role="status">
            匹配 {queue.rows.length} 台
            {queue.rows.length === 1 && <span> · Enter 预览设备</span>}
          </p>
        )}
      </div>
      <div
        className="alarm-queue-list"
        ref={host}
        onScroll={(event) => {
          scroll.current = event.currentTarget.scrollTop;
        }}
      >
        {returned && !returnedRow && (
          <div className="alarm-queue-followup">
            <strong>{deviceById(returned.id)?.name}</strong>
            <small>
              {rackForDevice(returned.id).name} · {unitLabel(returned.id)}
            </small>
            <p>
              {alarmVisitLabel(returned)}。
              {alarmCurrentStatus(readings.get(returned.id))}
              {queue.all.some((row) => row.device.id === returned.id) &&
                "，未匹配当前筛选"}
              。
            </p>
            <button
              disabled={!ready}
              onClick={() => onPreview(returned.id, returned)}
            >
              继续排查
            </button>
          </div>
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
            {returned?.id === device.id && (
              <p className="alarm-queue-visit">{alarmVisitLabel(returned)}</p>
            )}
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
            {queue.all.length > 0 && (query || severity !== "all") && (
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
        <details>
          <summary>判定与数据边界</summary>
          <p>
            列表随共享模拟时间更新，仅列设备进风温度的有效活动告警。
            {queue.unavailable}{" "}
            台读数缺失、过期或离线，不能据此判定正常。机柜是汇总，部件是模型评估；均不重复计数。这里不执行告警确认或消除。
          </p>
        </details>
      </div>
    </section>
  );
}
