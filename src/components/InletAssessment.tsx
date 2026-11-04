import { useEffect, useState } from "react";
import type { SpatialReading } from "../spatial";
import { inletAssessment } from "../inlet-assessment";
import type { SimulationSnapshot } from "../simulation";

export function InletAssessment({
  reading,
  sample,
  component,
  ready,
  time,
  onSeek,
  onAirflow,
  onLocate,
}: {
  reading: SpatialReading;
  sample: SimulationSnapshot;
  component: boolean;
  ready: boolean;
  time: number;
  onSeek: (time: number) => void;
  onAirflow: () => void;
  onLocate: () => void;
}) {
  const { status, detail, since, confirmed } = inletAssessment(reading, sample);
  const [visit, setVisit] = useState<{ from: number; to: number } | null>(null);
  useEffect(() => {
    if (visit && time !== visit.to) setVisit(null);
  }, [visit, time]);
  const inspectTime = (target: number) => {
    setVisit({ from: time, to: target });
    onSeek(target);
  };
  return (
    <section className="inlet-assessment" aria-label="整机进风判定">
      <header>
        <strong>
          {component ? `${reading.name} · 整机进风判定` : "整机进风判定"}
        </strong>
        <span>{status}</span>
      </header>
      <p>{detail}</p>
      {since !== null && (
        <div className="inlet-times">
          <button disabled={time === since} onClick={() => inspectTime(since)}>
            条件起点 {since}s
          </button>
          {visit?.to === time && (
            <button
              onClick={() => {
                setVisit(null);
                onSeek(visit.from);
              }}
            >
              返回 {visit.from}s
            </button>
          )}
          {confirmed !== null && (
            <button
              disabled={time === confirmed}
              onClick={() => inspectTime(confirmed)}
            >
              状态变化 {confirmed}s
            </button>
          )}
        </div>
      )}
      <div className="inlet-locations">
        <button disabled={!ready} onClick={onAirflow}>
          查看机房气流
        </button>
        <button disabled={!ready} onClick={onLocate}>
          定位安装位
        </button>
      </div>
    </section>
  );
}
