import type { InletDifferenceReview } from "../inlet-difference";
import { InletDifferenceProcess } from "./InletDifferenceProcess";
import { useMemo, useState, type Ref } from "react";
import { inletHistory, inletPairSnapshot } from "../inlet-pair";
import { reviewEvents } from "../review-model";
import { ReviewTrend } from "./ReviewTrend";
import { AnalysisEvents } from "./AnalysisEvents";

const valueText = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)} °C`;

export function InletPairAnalysis({
  differenceReview,
  onDifferenceReview,
  firstId,
  secondId,
  time,
  cycle,
  selectedId,
  ready,
  eventHeading,
  onSeek,
  onPreview,
  onLocate,
  onAirflow,
  onClose,
}: {
  differenceReview: InletDifferenceReview;
  onDifferenceReview: (state: InletDifferenceReview) => void;
  firstId: string;
  secondId: string;
  time: number;
  cycle: number;
  selectedId: string | null;
  ready: boolean;
  eventHeading: Ref<HTMLHeadingElement>;
  onSeek: (time: number) => void;
  onPreview: (id: string) => void;
  onLocate: (id: string) => void;
  onAirflow: (id: string) => void;
  onClose: () => void;
}) {
  const [inspection, setInspection] = useState<number | null>(null);
  const cursor = Math.min(time, inspection ?? time);
  const pair = inletPairSnapshot(firstId, secondId, cursor)!;
  const current = pair.second.id === selectedId ? pair.second : pair.first;
  const first = useMemo(() => inletHistory(firstId), [firstId]);
  const second = useMemo(() => inletHistory(secondId), [secondId]);
  const events = useMemo(
    () => reviewEvents([firstId, secondId], time, cycle),
    [firstId, secondId, time, cycle],
  );
  return (
    <section className="inlet-pair-analysis" aria-label="双设备进风分析">
      <header>
        <strong>双设备进风对照</strong>
        <button onClick={onClose}>单对象分析</button>
      </header>
      <p className="inlet-pair-time">
        {inspection === null
          ? `场景 t+${time}s`
          : `游标 t+${cursor}s · 场景 t+${time}s`}{" "}
        · 整机进风模拟
      </p>
      <div className="inlet-pair-readings">
        {[pair.first, pair.second].map((point, index) => (
          <button
            key={point.id}
            className={index ? "pair-reference" : "pair-primary"}
            aria-label={`预览对照设备 ${point.name}`}
            aria-describedby={`inlet-pair-reading-${point.id}`}
            aria-pressed={selectedId === point.id}
            onClick={() => onPreview(point.id)}
          >
            <span className="inlet-pair-label">
              {index ? "② 基准" : "① 所查"}
            </span>
            <strong>{point.name}</strong>
            <span id={`inlet-pair-reading-${point.id}`}>
              <small>{point.location}</small>
              <b className="inlet-pair-value">{valueText(point.value)}</b>
              <small>
                {point.reason} · {point.lifecycle}
              </small>
              {point.lastValue !== null && (
                <small>
                  最后观测 {point.observedAt}s · {valueText(point.lastValue)}
                </small>
              )}
            </span>
          </button>
        ))}
      </div>
      <div
        className="inlet-pair-actions"
        role="group"
        aria-label={`${current.name} 设备操作`}
      >
        <span>{current.name}</span>
        <button
          disabled={!ready}
          onClick={() => onLocate(current.id)}
          aria-label={`定位对照设备 ${current.name} 安装位`}
        >
          定位安装位
        </button>
        <button
          disabled={!ready}
          onClick={() => onAirflow(current.id)}
          aria-label={`查看对照设备 ${current.name} 气流`}
        >
          查看气流
        </button>
      </div>
      <div className="inlet-pair-difference">
        <span>所查 − 基准</span>
        <strong>
          {pair.difference === null
            ? "—"
            : `${pair.difference > 0 ? "+" : ""}${pair.difference.toFixed(1)} °C`}
        </strong>
        {pair.difference === null && <small>缺少同秒有效读数</small>}
      </div>
      <ReviewTrend
        series={first}
        comparison={{ series: second, label: pair.second.name }}
        seriesLabel="双设备进风"
        metric="temperature"
        time={time}
        cursorTime={cursor}
        events={events}
        onInspect={setInspection}
        onSeek={onSeek}
      />
      <InletDifferenceProcess
        firstId={firstId}
        secondId={secondId}
        time={time}
        state={differenceReview}
        onChange={onDifferenceReview}
        onSeek={(target) => {
          setInspection(null);
          onSeek(target);
        }}
      />
      <details className="inlet-pair-boundary">
        <summary>对照读数说明</summary>
        <p>
          实线为所查设备，虚线为基准设备。两条曲线共用温度刻度，空白表示当时无有效读数。游标只预览，回看同步到场景。
        </p>
        <p>温差仅比较同秒有效进风，不能据此判断故障或冷却效果。</p>
      </details>
      <AnalysisEvents
        title="两台设备已发生事件"
        events={events}
        headingRef={eventHeading}
        time={time}
        onLocateDevice={onLocate}
        onViewDeviceAirflow={onAirflow}
        ready={ready}
        onSeek={(target) => {
          setInspection(null);
          onSeek(target);
        }}
      />
    </section>
  );
}
