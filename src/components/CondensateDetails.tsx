import type { Point } from "../planar-gap";
import { standSensingSegments, type DrainStand } from "../drain-foot";
import { DrainProfile } from "./DrainProfile";
import { DrainFloorPlan } from "./DrainFloorPlan";
import {
  condensate,
  condensateSource,
  mouthGap,
  drainStands,
  condensateSensingSegments,
} from "../condensate";

export function CondensateDetails({
  id,
  ready,
  onLocate,
  segment,
  onSegment,
  onSense,
  onHistory,
}: {
  id: string;
  ready: boolean;
  onLocate: (id: string) => void;
  segment?: number;
  onSegment: (segment: number) => void;
  onSense: (fromJoint: number, segment: number, standId?: string) => void;
  onHistory: () => void;
}) {
  const { pipe, receiver } = condensate;
  const atPipe = id === pipe.id,
    atReceiver = id === receiver.id;
  const stand = drainStands.find((s) => s.id === id);
  const [upstream, downstream] = drainStands;
  const related = stand
    ? [pipe, receiver]
    : atPipe
      ? [receiver, condensateSource]
      : atReceiver
        ? [pipe]
        : id === condensate.sensingCableId
          ? [receiver]
          : [pipe];
  return (
    <section className="panel-port-details" aria-label="冷凝水排水布置">
      <strong>冷凝水排水布置</strong>
      {atPipe && (
        <p>
          管口高 {condensate.mouthHeight.toFixed(3)} m，距斗口上缘{" "}
          {mouthGap.toFixed(3)} m。
        </p>
      )}
      {(atPipe || stand) && (
        <details
          className="drain-support-inspection"
          key={id}
          open={stand ? true : undefined}
        >
          <summary>核对斜管与支座</summary>
          <DrainProfile selected={id} />
          <dl>
            <div>
              <dt>斜管水平长 / 落差</dt>
              <dd>
                {(condensate.run * 1000).toFixed(0)} mm /{" "}
                {(condensate.fall * 1000).toFixed(0)} mm
              </dd>
            </div>
            <div>
              <dt>支座轴距 / 落差</dt>
              <dd>
                {((downstream.offset - upstream.offset) * 1000).toFixed(0)} mm /{" "}
                {((upstream.axis[1] - downstream.axis[1]) * 1000).toFixed(1)} mm
              </dd>
            </div>
            {stand && (
              <div>
                <dt>距上游弯头</dt>
                <dd>{(stand.offset * 1000).toFixed(0)} mm</dd>
              </div>
            )}
          </dl>
          {stand && <p>底板按样板地面布置，锚固与承载待核实。</p>}
          {drainStands
            .filter((s) => s.id !== id)
            .map((s) => (
              <button
                key={s.id}
                disabled={!ready}
                onClick={() => onLocate(s.id)}
              >
                定位{s.name}
              </button>
            ))}
        </details>
      )}
      {stand && (
        <details
          key={stand.id + "-foot"}
          className="drain-comparison"
          open={segment !== undefined || undefined}
        >
          <summary>核对底板与感应线</summary>
          <SensingComparison
            {...{ stand, ready, segment, onSegment, onSense }}
          />
        </details>
      )}
      {related.map((peer) => (
        <button
          key={peer.id}
          disabled={!ready}
          onClick={() => onLocate(peer.id)}
        >
          定位{peer.name}
        </button>
      ))}
      {stand && (
        <button disabled={!ready} onClick={onHistory}>
          回看制冷单元输入 ↗
        </button>
      )}
      {atReceiver && (
        <SensingComparison {...{ ready, segment, onSegment, onSense }} />
      )}
      {(atPipe || atReceiver) && (
        <p>
          按样板安装配置核对。实际接口及斗后去向待核实，水量、水位与检漏信号均未接入。
        </p>
      )}
    </section>
  );
}

function SensingComparison({
  stand,
  ready,
  segment,
  onSegment,
  onSense,
}: {
  ready: boolean;
  segment?: number;
  onSegment: (segment: number) => void;
  onSense: (fromJoint: number, segment: number, standId?: string) => void;
  stand?: DrainStand;
}) {
  const segments: ((typeof condensateSensingSegments)[number] & {
    edge?: Point;
  })[] = stand ? standSensingSegments(stand) : condensateSensingSegments;
  const nearest = segments.reduce((best, s) =>
    s.distance < best.distance ? s : best,
  );
  const selected = segments.find((s) => s.segment === segment) ?? nearest;
  return (
    <>
      <label className="leak-floor-segment">
        对照感应段
        <select
          value={selected.segment}
          onChange={(e) => onSegment(Number(e.target.value))}
        >
          {segments.map((s) => (
            <option key={s.segment} value={s.segment}>
              第 {s.segment} 段{s === nearest ? " · 全线最近" : ""}
            </option>
          ))}
        </select>
      </label>
      <DrainFloorPlan
        segment={selected.segment}
        point={selected.point}
        stand={stand}
        edge={selected.edge}
      />
      {stand ? (
        <p>
          底板 {condensate.supports.footSize[0] * 1000} ×{" "}
          {condensate.supports.footSize[2] * 1000} mm。底板投影至第{" "}
          {selected.segment} 段中心线的最近距离为 {selected.distance.toFixed(3)}{" "}
          m。地面图中亮色矩形为当前底板。实地间距与探测范围待核实。
        </p>
      ) : (
        <p>
          斗口高 {condensate.rimHeight.toFixed(3)} m。斗口中心至第{" "}
          {selected.segment} 段的最近平面距离为 {selected.distance.toFixed(3)}{" "}
          m。
        </p>
      )}
      <button
        disabled={!ready}
        onClick={() => onSense(selected.fromJoint, selected.segment, stand?.id)}
      >
        定位最近感应点 · 距接头 {selected.fromJoint.toFixed(3)} m
      </button>
    </>
  );
}
