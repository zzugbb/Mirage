import {
  racewaySections,
  type RacewayCornerInspection,
} from "../panel-raceway";

export function RacewayCornerDetails({
  check,
  ready,
  onEnd,
  onJoint,
  onCover,
  onPanel,
}: {
  check: RacewayCornerInspection;
  ready: boolean;
  onEnd: (id: string) => void;
  onJoint: (joint: RacewayCornerInspection["joint"]) => void;
  onCover: (opened: boolean) => void;
  onPanel: () => void;
}) {
  const atPanel = check.joint === "panel";
  return (
    <div className="lighting-round">
      <label>
        接合位置
        <select
          disabled={!ready}
          value={check.joint}
          onChange={(event) =>
            onJoint(event.target.value === "panel" ? "panel" : "turn")
          }
        >
          <option value="turn">竖槽与横槽转角</option>
          <option value="panel">竖槽与配线架箱顶</option>
        </select>
      </label>
      <label>
        核对接合端
        <select
          disabled={!ready}
          value={check.drop.id}
          onChange={(event) => onEnd(event.target.value)}
        >
          {racewaySections
            .filter((section) => "panelId" in section)
            .map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        槽盖状态
        <select
          disabled={!ready}
          value={check.opened ? "open" : "closed"}
          onChange={(event) => onCover(event.target.value === "open")}
        >
          <option value="closed">合盖</option>
          <option value="open">移开盖板</option>
        </select>
      </label>
      <dl>
        <div>
          <dt>接合口净宽</dt>
          <dd>{(check.openingWidth * 1000).toFixed(0)} mm</dd>
        </div>
        <div>
          <dt>{atPanel ? "开口净深" : "槽内净深"}</dt>
          <dd>{(check.clearDepth * 1000).toFixed(0)} mm</dd>
        </div>
        {check.joint === "panel" && (
          <div>
            <dt>箱顶浅腔深度</dt>
            <dd>{(check.recessDepth * 1000).toFixed(0)} mm</dd>
          </div>
        )}
      </dl>
      <small>
        {atPanel
          ? "移开本侧竖槽盖，可核对槽腔与箱顶的开口。浅腔为原创布置示意，实际箱内端接与敷线待核实。"
          : "移开横段和所选竖段的槽盖可查看接合口。槽腔取自样板尺寸，实际敷线与占用待核实。"}
      </small>
      <button disabled={!ready} onClick={onPanel}>
        定位 {check.panel.name} ↗
      </button>
    </div>
  );
}
