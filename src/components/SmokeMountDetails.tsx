import type { SmokeMountInspection } from "../smoke-mount";

export function SmokeMountDetails({
  pair,
  ready,
  onToggle,
  onTray,
}: {
  pair: SmokeMountInspection;
  ready: boolean;
  onToggle: () => void;
  onTray: () => void;
}) {
  const [smoke, tray] = pair.round.points;
  return (
    <div className="roof-entry-details">
      <p>
        {smoke.name} · {smoke.location} ·{" "}
        {pair.opened
          ? `本体下移 ${Math.round(pair.bodyDrop * 1000)} mm，吊座保留原位。`
          : "本体上表面贴合承托座。"}
      </p>
      <dl className="grille-seat-sizes">
        <div>
          <dt>顶板底面</dt>
          <dd>{pair.ceilingHeight.toFixed(3)} m</dd>
        </div>
        <div>
          <dt>承托座就位面</dt>
          <dd>{pair.seatHeight.toFixed(3)} m</dd>
        </div>
        <div>
          <dt>{pair.opened ? "本体上表面（下移后）" : "本体上表面"}</dt>
          <dd>{pair.bodyTop.toFixed(3)} m</dd>
        </div>
      </dl>
      <button disabled={!ready} onClick={onToggle}>
        {pair.opened ? "复位烟感本体" : "移开烟感本体"}
      </button>
      <button disabled={!ready} onClick={onTray}>
        同框核对烟感与{tray.name} ↗
      </button>
      <small>
        原创安装示意，标高取自样板场景。烟感信号未接入，探测范围未配置。
      </small>
    </div>
  );
}
