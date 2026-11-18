import type { InletDifferenceReview } from "../inlet-difference";
import { InletDifferenceProcess } from "./InletDifferenceProcess";
import { InletViewActions } from "./InletViewActions";
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
  viewActive,
  viewAvailable,
  onObserve,
  onRestoreView,
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
  viewActive: boolean;
  viewAvailable: boolean;
  onObserve: () => void;
  onRestoreView: () => void;
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
      <InletViewActions
        active={viewActive}
        available={viewAvailable}
        ready={ready}
        onObserve={onObserve}
        onReturn={onRestoreView}
      />
      <div className="inlet-pair-readings">
        {[pair.first, pair.second].map((point, index) => (
          <div
            key={point.id}
            className={index ? "pair-reference" : "pair-primary"}
            aria-current={selectedId === point.id ? "true" : undefined}
          >
            <span className="inlet-pair-label">
              {index ? "基准 · 虚线" : "所查 · 实线"}
            </span>
            <strong>{point.name}</strong>
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
            <div className="inlet-pair-actions">
              <button
                onClick={() => onPreview(point.id)}
                aria-label={`预览对照设备 ${point.name}`}
                aria-pressed={selectedId === point.id}
              >
                预览
              </button>
              <button
                disabled={!ready}
                onClick={() => onLocate(point.id)}
                aria-label={`定位对照设备 ${point.name} 安装位`}
              >
                安装位
              </button>
              <button
                disabled={!ready}
                onClick={() => onAirflow(point.id)}
                aria-label={`查看对照设备 ${point.name} 气流`}
              >
                气流
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="inlet-pair-difference">
        <span>所查 − 基准</span>
        <strong>
          {pair.difference === null
            ? "—"
            : `${pair.difference > 0 ? "+" : ""}${pair.difference.toFixed(1)} °C`}
        </strong>
        <small>
          {pair.difference === null
            ? "缺少同秒有效进风，暂不计算差值"
            : "同秒有效读数之差"}
        </small>
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
      <p className="inlet-pair-boundary">
        同框轮廓对应两台设备的完整安装跨度，不代表真实风口或供风覆盖；柜前标签跟随场景时间，图表游标不改动场景。两条曲线共用温度刻度，只绘制已发生的有效读数。预览不改变镜头与结构；定位后可检视设备，再返回原对照。差值不表示异常阈值、冷却效果或故障根因。
      </p>
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
