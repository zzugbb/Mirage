import type { FixtureCrossing } from "../fixture-crossing";

type Hanger = Extract<FixtureCrossing, { kind: "light-hanger" }>;

export function LightHangerDetails({
  hanger,
  ready,
  onSide,
  onCrossing,
}: {
  hanger: Hanger;
  ready: boolean;
  onSide: (side: -1 | 1) => void;
  onCrossing: () => void;
}) {
  const { light, side, points, drop, inset, nearestCrossing, alongZ } = hanger;
  const [top, bottom] = points;
  return (
    <div className="lighting-round">
      <label>
        吊杆所在端
        <select
          disabled={!ready}
          value={side}
          onChange={(event) => onSide(event.target.value === "-1" ? -1 : 1)}
        >
          <option value="-1">−Z 端</option>
          <option value="1">+Z 端</option>
        </select>
      </label>
      <dl>
        <div>
          <dt>灯具</dt>
          <dd>{light.name}</dd>
        </div>
        <div>
          <dt>吊点 Z 坐标</dt>
          <dd>{top.z.toFixed(3)} m</dd>
        </div>
        <div>
          <dt>机房顶标高</dt>
          <dd>{top.y.toFixed(3)} m</dd>
        </div>
        <div>
          <dt>灯壳顶高</dt>
          <dd>{bottom.y.toFixed(3)} m</dd>
        </div>
        <div>
          <dt>吊杆配置长度</dt>
          <dd>{drop.toFixed(3)} m</dd>
        </div>
        <div>
          <dt>距发光面同侧端部</dt>
          <dd>{inset.toFixed(3)} m</dd>
        </div>
        {nearestCrossing && alongZ !== null && (
          <div>
            <dt>沿 Z 距最近相交桥架轴</dt>
            <dd>{alongZ.toFixed(3)} m</dd>
          </div>
        )}
      </dl>
      <small>
        灯壳与吊杆为原创布置示意。上端标记引用机房配置顶标高，现场锚固形式与承载未登记。
      </small>
      {nearestCrossing && (
        <button disabled={!ready} onClick={onCrossing}>
          核对与{nearestCrossing.tray.name}的交叉高度 ↗
        </button>
      )}
    </div>
  );
}
