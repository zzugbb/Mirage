import type {
  DrainJointInspection,
  DrainJointStage,
} from "../condensate-joint";
import { nearestCondensateSensing } from "../condensate";
import type { coolingDrainLink } from "../cooling-drain";

const mm = (value: number, precision: number) =>
  `${Number((value * 1000).toFixed(precision))} mm`;

export function DrainJointDetails({
  inspection,
  selected,
  ready,
  onStage,
  onPreview,
  onSense,
  onHistory,
  coolingLink,
}: {
  inspection: DrainJointInspection;
  selected: string;
  ready: boolean;
  onStage: (stage: DrainJointStage) => void;
  onPreview: (id: string) => void;
  onSense: (fromJoint: number, segment: number) => void;
  onHistory: () => void;
  coolingLink?: NonNullable<ReturnType<typeof coolingDrainLink>>;
}) {
  const atCabinet = inspection.stage === "cabinet";
  const atReceiver = inspection.stage === "receiver";
  const measures: [string, number][] = atCabinet
    ? [
        ["套管轴标高", inspection.metrics.height],
        ["管轴伸入配置外廓", inspection.metrics.inset],
        ["柜面至转角轴线", inspection.metrics.reach],
        ["外露套管长", inspection.metrics.socketLength],
      ]
    : atReceiver
      ? [
          ["斗口离地高度", inspection.metrics.bodyHeight],
          ["斗体收口深度", inspection.metrics.bowlDepth],
          ["下口内径", inspection.metrics.outletDiameter],
          ["下口标高", inspection.metrics.outletHeight],
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
          onChange={(event) => onStage(event.target.value as DrainJointStage)}
        >
          <option value="cabinet">柜侧套管与转角</option>
          <option value="mouth">管口与斗口</option>
          <option value="receiver">斗体与地面剖面</option>
        </select>
      </label>
      <dl>
        {measures.map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{mm(value, atReceiver ? 1 : 0)}</dd>
          </div>
        ))}
      </dl>
      {atCabinet && coolingLink && (
        <details>
          <summary>同柜气流标高</summary>
          <dl>
            <div>
              <dt>逻辑送风端</dt>
              <dd>{coolingLink.supplyHeight.toFixed(3)} m</dd>
            </div>
            <div>
              <dt>逻辑回风端</dt>
              <dd>{coolingLink.returnHeight.toFixed(3)} m</dd>
            </div>
          </dl>
        </details>
      )}
      {!atReceiver && (
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
      )}
      <div className="drain-joint-actions">
        {!atCabinet && (
          <button
            disabled={!ready}
            aria-label="定位最近感应点 ↗"
            onClick={() =>
              onSense(
                nearestCondensateSensing.fromJoint,
                nearestCondensateSensing.segment,
              )
            }
          >
            最近感应点 ↗
          </button>
        )}
        <button
          disabled={!ready}
          aria-label="回看制冷单元输入 ↗"
          onClick={onHistory}
        >
          制冷单元输入 ↗
        </button>
      </div>
      <details className="geometry-basis">
        <summary>量取依据</summary>
        <p>
          {atCabinet
            ? "套管轴线、转角和气流标高来自样板配置。实际风口和柜体排水接口待核实。"
            : atReceiver
              ? "斗体按原样板截面剖开，配置下口止于地面。斗后管网和排水状态待现场资料。"
              : "径向余量按管口外缘向斗口内缘的平面投影计算。实际水量、水位和斗后去向待核实。"}
        </p>
      </details>
    </div>
  );
}
