import type { FixtureCrossing } from "../fixture-crossing";

type Mount = Extract<FixtureCrossing, { kind: "tray-mount" }>;

export function TrayMountDetails({
  mount,
  ready,
  onMount,
  onReturn,
}: {
  mount: Mount;
  ready: boolean;
  onMount: (station: number, side: -1 | 1) => void;
  onReturn: () => void;
}) {
  return (
    <div className="lighting-round">
      {mount.stations.length > 1 ? (
        <label>
          支吊组
          <select
            disabled={!ready}
            value={mount.station}
            onChange={(event) =>
              onMount(Number(event.target.value), mount.side)
            }
          >
            {mount.stations.map((station) => (
              <option key={station} value={station}>
                第 {station + 1} 组
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p>
          {mount.upper.name} · 第 {mount.station + 1} 组
        </p>
      )}
      <label>
        吊杆侧
        <select
          disabled={!ready}
          value={mount.side}
          onChange={(event) =>
            onMount(mount.station, event.target.value === "-1" ? -1 : 1)
          }
        >
          <option value="-1">−Z 侧</option>
          <option value="1">+Z 侧</option>
        </select>
      </label>
      <dl>
        <div>
          <dt>顶板参考标高</dt>
          <dd>{mount.ceilingY.toFixed(3)} m</dd>
        </div>
        <div>
          <dt>吊杆上端标高</dt>
          <dd>{mount.rodTopY.toFixed(3)} m</dd>
        </div>
        <div>
          <dt>安装座总高</dt>
          <dd>{(mount.mountHeight * 1000).toFixed(1)} mm</dd>
        </div>
        <div>
          <dt>顶板底座 X × Y × Z</dt>
          <dd>
            {mount.plateSize
              .map((size) => (size * 1000).toFixed(0))
              .join(" × ")}{" "}
            mm
          </dd>
        </div>
      </dl>
      <p>
        虚线为配置顶板参考面。接续座与吊杆同轴，顶板底座上表面到达参考面。安装座为原创布置示意，现场锚固和承载待核实。
      </p>
      <button disabled={!ready} onClick={onReturn}>
        {mount.source.kind === "tray-bay" ? "返回原支吊跨段" : "返回原端部支吊"}
      </button>
    </div>
  );
}
