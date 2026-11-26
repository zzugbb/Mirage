import { AirflowIntervalReview } from "./AirflowIntervalReview";
import { useEffect, useMemo, useRef } from "react";
import {
  airflowResponseHistory,
  airflowResponseEvents,
  type AirflowResponseTarget,
} from "../airflow-response";
import { deviceById, rackForDevice } from "../installation";
import { coolingSource } from "../cooling";
import { unitLabel } from "../catalog";
import { lifecycleNames, qualityNames } from "../status";
import type { SpatialReading } from "../spatial";
import { ReviewAnalysis } from "./ReviewAnalysis";

export function AirflowResponseAnalysis({
  target,
  time,
  cycle,
  reading,
  ready,
  onSeek,
  onReturn,
}: {
  target: AirflowResponseTarget;
  time: number;
  cycle: number;
  reading: SpatialReading;
  ready: boolean;
  onSeek: (time: number) => void;
  onReturn: () => void;
}) {
  const histories = useMemo(() => airflowResponseHistory(target)!, [target.id]);
  const events = useMemo(
    () => airflowResponseEvents(target, time, cycle),
    [target.deviceId, time, cycle],
  );
  const heading = useRef<HTMLHeadingElement>(null);
  const context = useRef<HTMLDivElement>(null);
  useEffect(() => {
    context.current
      ?.closest<HTMLElement>(".study-inspector")
      ?.scrollTo({ top: 0 });
    context.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section className="airflow-response" aria-label="支路输入与进风对照">
      <div className="airflow-response-context" ref={context} tabIndex={-1}>
        <strong>
          {coolingSource.name} → {deviceById(target.deviceId)!.name}
        </strong>
        <span>
          {rackForDevice(target.deviceId).name} / {unitLabel(target.deviceId)}
        </span>
        <small>
          当前整机：{lifecycleNames[reading.lifecycle]} ·{" "}
          {qualityNames[reading.quality]}
          {reading.quality === "stale" && reading.observedAt !== null
            ? ` · 最后观测 t+${reading.observedAt}s`
            : ""}
          {reading.quality === "valid" && reading.temperature === null
            ? " · 无当前进风"
            : ""}
        </small>
        <button disabled={!ready} onClick={onReturn}>
          ← 返回气流观察
        </button>
      </div>
      <ReviewAnalysis
        evidence={
          <AirflowIntervalReview
            key={target.id}
            target={target}
            time={time}
            cycle={cycle}
            onSeek={onSeek}
          />
        }
        labels={{ temperature: "设备进风温度", power: "" }}
        histories={{ temperature: histories.temperature, power: [] }}
        cooling={histories.cooling}
        coolingTarget="device"
        events={events}
        eventHeading={heading}
        time={time}
        cycle={cycle}
        component={false}
        ready={ready}
        onSeek={onSeek}
        onViewDeviceAirflow={onReturn}
      />
    </section>
  );
}
