import type { SmokeLightInspection } from "../fixture-crossing";

export function SmokeLightDetails({
  pair,
  ready,
  onInspect,
  onProbe,
}: {
  pair: SmokeLightInspection;
  ready: boolean;
  onInspect: (lightId: string, view: SmokeLightInspection["view"]) => void;
  onProbe: () => void;
}) {
  const [smoke, tray, probe] = pair.round.points;
  return (
    <div className="lighting-round roof-entry-details">
      <label>
        {tray.name}的交叉顶灯
        <select
          disabled={!ready}
          value={pair.light.id}
          onChange={(e) => onInspect(e.target.value, pair.view)}
        >
          {pair.candidates.map(({ light, horizontal }) => (
            <option key={light.id} value={light.id}>
              {light.name} · 距{smoke.name} {horizontal.toFixed(2)} m
            </option>
          ))}
        </select>
      </label>
      <label>
        核对位置
        <select
          disabled={!ready}
          value={pair.view}
          onChange={(e) =>
            onInspect(
              pair.light.id,
              e.target.value === "crossing" ? "crossing" : "housing",
            )
          }
        >
          <option value="housing">烟感中心与灯壳近缘</option>
          <option value="crossing">灯罩底面与桥架侧梁</option>
        </select>
      </label>
      <small>
        顶灯按烟感中心至灯壳的水平投影距离排列。照明与烟感均无运行读数。
      </small>
      <button disabled={!ready} onClick={onProbe}>
        回看{probe.name} ↗
      </button>
    </div>
  );
}
