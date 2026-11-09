import type { InletProcessState } from "../inlet-process";
import type { Ref } from "react";
import { InletProcess } from "./InletProcess";
import type { SpatialReading } from "../spatial";
import { inletAssessment } from "../inlet-assessment";
import type { SimulationSnapshot } from "../simulation";

export function InletAssessment({
  processState,
  onProcessChange,
  headingRef,
  reading,
  sample,
  component,
  ready,
  time,
  onSeek,
  onAirflow,
  onLocate,
}: {
  processState: InletProcessState;
  onProcessChange: (next: InletProcessState) => void;
  headingRef: Ref<HTMLElement>;
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
  return (
    <section
      ref={headingRef}
      tabIndex={-1}
      className="inlet-assessment"
      aria-label="整机进风判定"
    >
      <header>
        <strong>
          {component ? `${reading.name} · 整机进风判定` : "整机进风判定"}
        </strong>
        <span>{status}</span>
      </header>
      <p>{detail}</p>
      <InletProcess
        reviewState={processState}
        onChange={onProcessChange}
        id={reading.id}
        time={time}
        since={since}
        confirmed={confirmed}
        onSeek={onSeek}
      />
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
