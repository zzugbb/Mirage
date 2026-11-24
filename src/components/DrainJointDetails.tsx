import type {
  DrainJointInspection,
  DrainJointStage,
} from "../condensate-joint";
import { nearestCondensateSensing } from "../condensate";

const mm = (value: number) => `${(value * 1000).toFixed(0)} mm`;

export function DrainJointDetails({
  inspection,
  selected,
  ready,
  onStage,
  onPreview,
  onSense,
  onHistory,
}: {
  inspection: DrainJointInspection;
  selected: string;
  ready: boolean;
  onStage: (stage: DrainJointStage) => void;
  onPreview: (id: string) => void;
  onSense: (fromJoint: number, segment: number) => void;
  onHistory: () => void;
}) {
  const atCabinet = inspection.stage === "cabinet";
  const measures: [string, number][] = atCabinet
    ? [
        ["套管轴标高", inspection.metrics.height],
        ["管轴伸入配置外廓", inspection.metrics.inset],
        ["柜面至转角轴线", inspection.metrics.reach],
        ["外露套管长", inspection.metrics.socketLength],
      ]
    : [
        ["管口至斗口高差", inspection.metrics.verticalGap],
        ["轴线平面偏移", inspection.metrics.planarOffset],
        ["管口外径", inspection.metrics.pipeDiameter],
        ["斗口内径", inspection.metrics.openingDiameter],
        ["投影径向余量", inspection.metrics.radialMargin],
      ];
  return (
    <div className="drain-joint-details">
      <label>
        排水接合观察范围
        <select
          aria-label="排水接合观察范围"
          disabled={!ready}
          value={inspection.stage}
          onChange={(event) =>
            onStage(event.target.value === "cabinet" ? "cabinet" : "mouth")
          }
        >
          <option value="cabinet">柜侧套管与转角</option>
          <option value="mouth">管口与斗口</option>
        </select>
      </label>
      <dl>
        {measures.map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{mm(value)}</dd>
          </div>
        ))}
      </dl>
      <p>
        {atCabinet
          ? "套管轴线与转角取自样板配置，实际柜体排水接口待核实。"
          : "径向余量按管口外缘向斗口内缘的平面投影计算。实际水量、水位和斗后去向待核实。"}
      </p>
      <div className="drain-joint-peers" role="group" aria-label="接合设施">
        {[inspection.upper, inspection.lower].map(({ id, name }) => (
          <button
            key={id}
            aria-label={`选中${name}`}
            aria-pressed={id === selected}
            onClick={() => onPreview(id)}
          >
            {name}
          </button>
        ))}
      </div>
      {!atCabinet && (
        <button
          disabled={!ready}
          onClick={() =>
            onSense(
              nearestCondensateSensing.fromJoint,
              nearestCondensateSensing.segment,
            )
          }
        >
          定位最近感应点 ↗
        </button>
      )}
      <button disabled={!ready} onClick={onHistory}>
        回看制冷单元输入 ↗
      </button>
    </div>
  );
}
