import type { ProbeHeightScene } from "../probe-height-scene";

export function ProbeHeightDetails({
  check,
  ready,
  onRack,
  onLocate,
}: {
  check: ProbeHeightScene;
  ready: boolean;
  onRack: (id: string) => void;
  onLocate: (id: string) => void;
}) {
  const {
    round,
    rack,
    height,
    offsetX,
    offsetZ,
    unit,
    segment,
    unitBottom,
    unitTop,
  } = check;
  const displacement = (value: number) =>
    `${value > 0 ? "+" : ""}${value.toFixed(3)} m`;
  return (
    <div className="lighting-round">
      <label>
        核对机柜
        <select
          disabled={!ready}
          value={rack.id}
          onChange={(event) => onRack(event.target.value)}
        >
          {round.racks.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <dl>
        <div>
          <dt>探头中心标高</dt>
          <dd>{height.toFixed(3)} m</dd>
        </div>
        <div>
          <dt>到柜前的 X 向偏移</dt>
          <dd>{displacement(offsetX)}</dd>
        </div>
        <div>
          <dt>到柜前的 Z 向偏移</dt>
          <dd>{displacement(offsetZ)}</dd>
        </div>
        <div>
          <dt>同高安装位</dt>
          <dd>
            {unit === null
              ? "安装范围外"
              : `U${unit} · ${segment?.name ?? "未登记"}`}
          </dd>
        </div>
        {unitBottom !== null && unitTop !== null && (
          <div>
            <dt>该 U 位标高范围</dt>
            <dd>
              {unitBottom.toFixed(3)} – {unitTop.toFixed(3)} m
            </dd>
          </div>
        )}
      </dl>
      <small>
        标线投影到柜前，机柜范围取自本排巡检配置。探头只代表安装位置。
      </small>
      {segment?.kind === "device" && (
        <button disabled={!ready} onClick={() => onLocate(segment.id)}>
          定位同高设备 {segment.name} ↗
        </button>
      )}
    </div>
  );
}
