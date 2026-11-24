import { leakFittingChoices, type LeakFittingId } from "../leak-fittings";
import type { LeakInspection } from "../leak-view";

export function LeakFittingDetails({
  fitting,
  ready,
  onFitting,
  onRoute,
  onCooling,
}: {
  fitting: NonNullable<LeakInspection["fitting"]>;
  ready: boolean;
  onFitting: (id: LeakFittingId, opened: boolean) => void;
  onRoute: () => void;
  onCooling: () => void;
}) {
  const {
    id,
    opened,
    station,
    length,
    diameter,
    leadDiameter,
    sensingDiameter,
  } = fitting;
  const mm = (value: number) => (value * 1000).toFixed(0);
  return (
    <>
      <strong>线端装配核对 · 配置</strong>
      <label className="leak-floor-segment">
        核对线端
        <select
          disabled={!ready}
          value={id}
          onChange={(event) => {
            const next = leakFittingChoices.find(
              (choice) => choice.id === event.target.value,
            );
            if (next) onFitting(next.id, opened);
          }}
        >
          {leakFittingChoices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </select>
      </label>
      <label className="leak-floor-segment">
        外壳状态
        <select
          disabled={!ready}
          value={opened ? "section" : "closed"}
          onChange={(event) => onFitting(id, event.target.value === "section")}
        >
          <option value="closed">外壳合拢</option>
          <option value="section">局部剖面</option>
        </select>
      </label>
      <dl>
        <div>
          <dt>距控制器线首</dt>
          <dd>{station.toFixed(3)} m</dd>
        </div>
        <div>
          <dt>外壳直径 × 长度</dt>
          <dd>
            {mm(diameter)} × {mm(length)} mm
          </dd>
        </div>
        {leadDiameter !== null && (
          <div>
            <dt>引线直径</dt>
            <dd>{mm(leadDiameter)} mm</dd>
          </div>
        )}
        {sensingDiameter !== null && (
          <div>
            <dt>感应线直径</dt>
            <dd>{mm(sensingDiameter)} mm</dd>
          </div>
        )}
      </dl>
      <small>
        护套和封端为原创装配示意，剖面显示样板线缆位置。实际端子、检漏信号与覆盖范围尚未登记。
      </small>
      <button disabled={!ready} onClick={onRoute}>
        查看整支路同一里程点 ↗
      </button>
      <button disabled={!ready} onClick={onCooling}>
        定位制冷单元 ↗
      </button>
    </>
  );
}
