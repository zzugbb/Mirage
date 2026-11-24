import type { Ref } from "react";
import { leakDetection } from "../leak-detection";
import { leakFittingChoices } from "../leak-fittings";
import type { LeakFittingTarget, LeakInspection } from "../leak-view";

const mm = (value: number) => (value * 1000).toFixed(0);

export function LeakFittingDetails({
  fitting,
  ready,
  onFitting,
  stateSelect,
  onRoute,
  onCooling,
}: {
  fitting: NonNullable<LeakInspection["fitting"]>;
  ready: boolean;
  onFitting: (target: LeakFittingTarget) => void;
  stateSelect: Ref<HTMLSelectElement>;
  onRoute: () => void;
  onCooling: () => void;
}) {
  const {
    id,
    opened,
    outlet,
    station,
    length,
    diameter,
    leadDiameter,
    sensingDiameter,
  } = fitting;
  const { bottomThickness, boreDiameter, innerLeadLength } =
    leakDetection.controllerOutlet;
  return (
    <>
      <strong>{outlet ? "控制器出线口 · 配置" : "线端装配核对 · 配置"}</strong>
      {!outlet && (
        <label className="leak-floor-segment">
          核对线端
          <select
            disabled={!ready}
            value={id}
            onChange={(event) => {
              const next = leakFittingChoices.find(
                (choice) => choice.id === event.target.value,
              );
              if (next) onFitting({ fitting: next.id, opened });
            }}
          >
            {leakFittingChoices.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="leak-floor-segment">
        外壳状态
        <select
          ref={stateSelect}
          disabled={!ready}
          value={opened ? "section" : "closed"}
          onChange={(event) =>
            onFitting({
              fitting: id,
              opened: event.target.value === "section",
              outlet,
            })
          }
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
        {outlet && (
          <>
            <div>
              <dt>出线中心标高</dt>
              <dd>{fitting.point.y.toFixed(3)} m</dd>
            </div>
            <div>
              <dt>底板厚度 / 出线孔径</dt>
              <dd>
                {mm(bottomThickness)} / Ø{mm(boreDiameter)} mm
              </dd>
            </div>
            <div>
              <dt>从外底面向盒内的引线</dt>
              <dd>{mm(innerLeadLength)} mm</dd>
            </div>
          </>
        )}
        <div>
          <dt>{outlet ? "线首护套直径 × 长度" : "外壳直径 × 长度"}</dt>
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
        {outlet
          ? "底板、导向环与盒内短引线为原创装配示意。实际端子、检漏信号与覆盖范围尚未登记。"
          : "护套和封端为原创装配示意，剖面显示样板线缆位置。实际端子、检漏信号与覆盖范围尚未登记。"}
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
