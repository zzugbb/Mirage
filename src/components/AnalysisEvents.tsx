import type { Ref } from "react";
import { eventsBySource } from "../review-model";
import type { ReviewEvent } from "../review-model";
import { deviceById, rackForDevice } from "../installation";
import { unitLabel } from "../catalog";

const changes = {
  input: "输入",
  raised: "预警",
  escalated: "升级",
  downgraded: "降级",
  recovered: "恢复",
};

export function AnalysisEvents({
  title,
  headingRef,
  events,
  time,
  onSeek,
  onLocateDevice,
}: {
  title: string;
  headingRef: Ref<HTMLHeadingElement>;
  events: ReviewEvent[];
  time: number;
  onSeek: (time: number) => void;
  onLocateDevice?: (id: string) => void;
}) {
  const row = (event: ReviewEvent) => (
    <button
      key={event.id}
      className="analysis-event"
      data-event-kind={event.kind}
      aria-pressed={event.time === time}
      title={event.detail}
      onClick={() => onSeek(event.time)}
    >
      <time>{event.time}s</time>
      <span>
        {event.title}
        {event.time === time ? (
          <small>{event.detail}</small>
        ) : (
          !onLocateDevice && (
            <small>
              {event.kind === "input"
                ? "场景输入"
                : event.entityId.toUpperCase()}
            </small>
          )
        )}
      </span>
    </button>
  );
  return (
    <section className="review-events">
      <h3 ref={headingRef} tabIndex={-1}>
        {title}
        <span>{events.length} 条</span>
      </h3>
      {!events.length ? (
        <p>当前范围没有已发生事件</p>
      ) : !onLocateDevice ? (
        events.map(row)
      ) : (
        eventsBySource(events).map(({ source, history }) => {
          const latest = history[history.length - 1];
          const device = deviceById(source);
          return (
            <details key={source} className="event-source" data-source={source}>
              <summary>
                <strong>{device?.name ?? "公共冷却输入"}</strong>
                <span>
                  {latest.time}s · {changes[latest.kind]}
                </span>
                <small>{history.length} 条</small>
              </summary>
              <div className="event-history">
                {device && (
                  <div className="event-location">
                    <span>
                      {rackForDevice(source).name} / {unitLabel(source)}
                    </span>
                    <button
                      aria-label={`定位 ${device.name}`}
                      onClick={() => onLocateDevice(source)}
                    >
                      定位 ↗
                    </button>
                  </div>
                )}
                {history.map(row)}
              </div>
            </details>
          );
        })
      )}
    </section>
  );
}
