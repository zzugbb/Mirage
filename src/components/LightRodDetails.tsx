import type { FixtureCrossing } from "../fixture-crossing";

type LightRod = Extract<FixtureCrossing, { kind: "light-rod" }>;

export function LightRodDetails({
  pair,
  ready,
  onStation,
  onCrossing,
  onSection,
  onHistory,
}: {
  pair: LightRod;
  ready: boolean;
  onStation: (station: number) => void;
  onCrossing: () => void;
  onSection: () => void;
  onHistory: (id: string) => void;
}) {
  const { section } = pair;
  const sectionName =
    section.kind === "tray-support"
      ? (section.side < 0 ? "−X" : "+X") + " 端伸出段"
      : `横托 ${section.index + 1} 至 ${section.index + 2} 跨`;
  return (
    <div className="roof-entry-details">
      <p>
        {pair.source.light.name}与{pair.source.tray.name} · {sectionName}
      </p>
      <label>
        对照吊杆
        <select
          value={pair.index}
          disabled={!ready || pair.stations.length < 2}
          onChange={(event) => onStation(Number(event.target.value))}
        >
          {pair.stations.map((index) => (
            <option key={index} value={index}>
              第 {index + 1} 组外侧吊杆
            </option>
          ))}
        </select>
      </label>
      <dl>
        <div>
          <dt>截面标高</dt>
          <dd>{pair.points[0].y.toFixed(3)} m</dd>
        </div>
        <div>
          <dt>{pair.gap >= 0 ? "沿 X 的外缘间距" : "沿 X 的投影重叠"}</dt>
          <dd>{(Math.abs(pair.gap) * 1000).toFixed(1)} mm</dd>
        </div>
      </dl>
      <small>
        尺寸线连接同一截面的灯壳侧面与吊杆侧面。现场净距、吊装件和照明读数待核实。
      </small>
      <button disabled={!ready} onClick={onCrossing}>
        核对灯罩与侧梁高差 ↗
      </button>
      <button disabled={!ready} onClick={onSection}>
        核对{sectionName} ↗
      </button>
      {pair.racks.map((rack) => (
        <button
          key={rack.id}
          disabled={!ready}
          onClick={() => onHistory(rack.id)}
        >
          回看{rack.name}设备汇总 ↗
        </button>
      ))}
    </div>
  );
}
