import { environmentProbes } from "../environment-monitoring";
import { rackById } from "../installation";
import { patchPanelById } from "../patch-panels";
import type { rearWallCrossing } from "../rear-wall";

export function RearWallCrossingDetails({
  pair,
  selected,
  ready,
  onSelect,
  onHistory,
}: {
  pair: NonNullable<ReturnType<typeof rearWallCrossing>>;
  selected: string;
  ready: boolean;
  onSelect: (id: string) => void;
  onHistory: (id: string) => void;
}) {
  const { upper, lower, distance, points } = pair;
  const panel = patchPanelById(upper.id) ?? patchPanelById(lower.id);
  const rack = panel?.referenceRackId && rackById(panel.referenceRackId);
  const [first, second] = points;
  return (
    <>
      <div className="rear-wall-ends" role="group" aria-label="相邻设施">
        {[upper, lower].map((item) => (
          <button
            key={item.id}
            aria-label={`选中 ${item.name}`}
            aria-pressed={selected === item.id}
            onClick={() => onSelect(item.id)}
          >
            {item.name} · {item.surface}
          </button>
        ))}
      </div>
      <p>
        两处外缘在后墙立面相距 <b>{distance.toFixed(3)} m</b>。X 向分离{" "}
        {Math.abs(second.x - first.x).toFixed(3)} m，Y 向分离{" "}
        {Math.abs(second.y - first.y).toFixed(3)} m。
      </p>
      <p>按样板配置的安装外缘投影量取。现场净距、走线与接线待核实。</p>
      {rack ? (
        <div>
          <span>配线架登记的参考机柜 · 设备模拟汇总</span>
          <button disabled={!ready} onClick={() => onHistory(rack.id)}>
            回看 {rack.name}设备汇总 ↗
          </button>
        </div>
      ) : (
        <div>
          <span>同机房墙面探头 · 点位模拟采样</span>
          {environmentProbes.map(({ fixture }) => (
            <button
              key={fixture.id}
              disabled={!ready}
              onClick={() => onHistory(fixture.id)}
            >
              回看{fixture.name} ↗
            </button>
          ))}
        </div>
      )}
    </>
  );
}
