import type { FixtureCrossing } from "../fixture-crossing";

type Hanger = Extract<FixtureCrossing, { kind: "light-hanger" }>;

export function LightHangerDetails({
  hanger,
  ready,
  onSide,
  onMount,
  onCrossing,
}: {
  hanger: Hanger;
  ready: boolean;
  onSide: (side: -1 | 1) => void;
  onMount: () => void;
  onCrossing: () => void;
}) {
  const { light, side, mount, drop, inset, nearestCrossing, alongZ } = hanger;
  const [top, bottom] = hanger.points;
  const dimension = (size: number[]) =>
    size.map((value) => (value * 1000).toFixed(0)).join(" × ");
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
        {mount ? (
          <>
            <div>
              <dt>顶板参考标高</dt>
              <dd>{mount.ceilingY.toFixed(3)} m</dd>
            </div>
            <div>
              <dt>吊杆上端接合标高</dt>
              <dd>{mount.jointY.toFixed(3)} m</dd>
            </div>
            <div>
              <dt>安装座总高</dt>
              <dd>{(mount.height * 1000).toFixed(1)} mm</dd>
            </div>
            <div>
              <dt>顶板底座 X × Y × Z</dt>
              <dd>{dimension(mount.plateSize)} mm</dd>
            </div>
            <div>
              <dt>接续座 X × Y × Z</dt>
              <dd>{dimension(mount.socketSize)} mm</dd>
            </div>
            <div>
              <dt>吊杆配置长度</dt>
              <dd>{mount.rodLength.toFixed(3)} m</dd>
            </div>
          </>
        ) : (
          <>
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
              <dt>顶板至灯壳落差</dt>
              <dd>{drop.toFixed(3)} m</dd>
            </div>
            <div>
              <dt>距发光面同侧端部</dt>
              <dd>{inset.toFixed(3)} m</dd>
            </div>
          </>
        )}
        {nearestCrossing && alongZ !== null && (
          <div>
            <dt>沿 Z 距最近相交桥架轴</dt>
            <dd>{alongZ.toFixed(3)} m</dd>
          </div>
        )}
      </dl>
      <small>
        {mount
          ? "顶板底座与吊杆接续座为原创布置示意。虚线标出配置顶板参考面，实线量取安装座高度。现场锚固与承载待核实。"
          : "灯壳、吊杆和顶板安装座为原创布置示意。现场锚固与承载待核实。"}
      </small>
      <button disabled={!ready} onClick={onMount}>
        {mount ? "返回原吊点" : "核对顶灯顶板安装 ↗"}
      </button>
      {nearestCrossing && (
        <button disabled={!ready} onClick={onCrossing}>
          核对与{nearestCrossing.tray.name}的交叉高度 ↗
        </button>
      )}
    </div>
  );
}
