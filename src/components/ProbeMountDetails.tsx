import type { ProbeMountInspection } from "../probe-mount";

export function ProbeMountDetails({
  check,
  ready,
  onToggle,
  onHeight,
}: {
  check: ProbeMountInspection;
  ready: boolean;
  onToggle: () => void;
  onHeight: () => void;
}) {
  return (
    <div className="roof-entry-details">
      <p>
        {check.round.probe.name} · {check.round.probe.location} ·{" "}
        {check.opened
          ? `本体向室内移开 ${Math.round(check.bodyTravel * 1000)} mm，底座留在墙柱上。`
          : "本体贴合固定底座。"}
      </p>
      <dl className="grille-seat-sizes">
        <div>
          <dt>探头中心标高</dt>
          <dd>{check.centerHeight.toFixed(3)} m</dd>
        </div>
        <div>
          <dt>固定底座厚度</dt>
          <dd>{(check.plateThickness * 1000).toFixed(1)} mm</dd>
        </div>
        <div>
          <dt>本体壳体深度</dt>
          <dd>{Math.round(check.bodyDepth * 1000)} mm</dd>
        </div>
      </dl>
      <button disabled={!ready} onClick={onToggle}>
        {check.opened ? "复位探头本体" : "移开探头本体"}
      </button>
      <button disabled={!ready} onClick={onHeight}>
        核对同排柜前标高 ↗
      </button>
      <small>
        原创安装示意。点位和模拟采样沿用登记位置，接线与监测范围待核实。
      </small>
    </div>
  );
}
