import { entranceCabinet } from "../entrance-cabinet";
import { entranceFixture } from "../entrance";
import type { EntranceInspection } from "../entrance-view";

type Sweep = Extract<EntranceInspection, { view: "sweep" }>["sweep"];

function SweepPlan({ sweep }: { sweep: Sweep }) {
  const { pose, footprint, arc, closed } = sweep;
  const points = [...closed.leaf, ...arc, ...footprint];
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const margin = 0.13;
  const left = Math.min(...xs) - margin;
  const top = Math.min(...zs) - margin;
  const width = Math.max(...xs) - left + margin;
  const height = Math.max(...zs) - top + margin;
  const coordinates = (points: { x: number; z: number }[]) =>
    points.map(({ x, z }) => `${x},${z}`).join(" ");

  return (
    <svg
      className="entrance-cabinet-plan"
      role="img"
      aria-label="门板与柜体的俯视投影。弧线标出门板自由角轨迹，黄线连到当前最近点。"
      viewBox={[left, top, width, height].join(" ")}
    >
      <polygon
        points={coordinates(footprint)}
        fill="#314550"
        stroke="#93a6b0"
        strokeWidth={0.013}
      />
      <text
        x={(footprint[0].x + footprint[2].x) / 2}
        y={(footprint[0].z + footprint[2].z) / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={0.14}
        fill="currentColor"
      >
        {entranceCabinet.name}
      </text>
      <polyline
        points={coordinates(arc)}
        fill="none"
        stroke="#a7bbc7"
        strokeWidth={0.015}
        strokeDasharray="0.045 0.035"
      />
      <polygon
        points={coordinates(pose.leaf)}
        fill="#4e918c"
        stroke="#9fe1d6"
        strokeWidth={0.013}
      />
      <line
        x1={pose.doorPoint.x}
        y1={pose.doorPoint.z}
        x2={pose.cabinetPoint.x}
        y2={pose.cabinetPoint.z}
        stroke="#f1ce8e"
        strokeWidth={0.015}
      />
      {[pose.doorPoint, pose.cabinetPoint].map(({ x, z }, i) => (
        <circle key={i} cx={x} cy={z} r={0.022} fill="#f1ce8e" />
      ))}
    </svg>
  );
}

export function EntranceSweepDetails({
  sweep,
  selectedId,
  ready,
  onSample,
  onPreview,
  onHistory,
}: {
  sweep: Sweep;
  selectedId: string;
  ready: boolean;
  onSample: (index: number) => void;
  onPreview: (id: string) => void;
  onHistory: (id: string) => void;
}) {
  const { index, count, pose, minimum, closed, displayed } = sweep;
  const angle = `${pose.deg.toFixed(1)}°`;
  const distance = `${pose.distance.toFixed(3)} m`;
  const references = [
    { name: "合拢位", pose: closed },
    { name: "最接近姿态", pose: minimum },
    { name: "配置展示位", pose: displayed },
  ];
  return (
    <section className="entrance-view-details" aria-label="入口布置核对">
      <strong>整扇门板与配电柜</strong>
      <label className="entrance-sweep-angle">
        <span>门扇参考角</span>
        <span>{angle}</span>
        <input
          type="range"
          aria-label="门扇参考角"
          aria-valuetext={`${angle}，平面间距 ${distance}`}
          min={0}
          max={count - 1}
          step={1}
          value={index}
          disabled={!ready}
          onChange={(event) => onSample(event.currentTarget.valueAsNumber)}
        />
      </label>
      <div
        className="entrance-view-peer entrance-sweep-actions"
        role="group"
        aria-label="参考姿态"
      >
        {references.map(({ name, pose: reference }) => (
          <button
            key={name}
            aria-pressed={index === reference.index}
            disabled={!ready}
            onClick={() => onSample(reference.index)}
          >
            {name}
          </button>
        ))}
      </div>
      <dl>
        <div>
          <dt>当前平面间距</dt>
          <dd>{distance}</dd>
        </div>
        <div>
          <dt>抽样最小 · {minimum.deg.toFixed(1)}°</dt>
          <dd>{minimum.distance.toFixed(3)} m</dd>
        </div>
      </dl>
      <SweepPlan sweep={sweep} />
      <small>
        {count} 个参考姿态，步进不超过
        1°。按门板全厚度与柜体配置矩形量取，现场通行净距待实测。
      </small>
      <div
        className="entrance-view-peer entrance-sweep-actions"
        role="group"
        aria-label="核对对象"
      >
        {[entranceFixture, entranceCabinet].map(({ id, name }) => (
          <button
            key={id}
            aria-label={`选中${name}`}
            aria-pressed={id === selectedId}
            onClick={() => onPreview(id)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="entrance-view-peer">
        <button disabled={!ready} onClick={() => onHistory(entranceCabinet.id)}>
          回看配电柜关联输入 ↗
        </button>
      </div>
    </section>
  );
}
