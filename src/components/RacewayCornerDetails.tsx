import {
  racewaySections,
  type RacewayCornerInspection,
} from "../panel-raceway";

export function RacewayCornerDetails({
  check,
  ready,
  onEnd,
  onCover,
  onPanel,
}: {
  check: RacewayCornerInspection;
  ready: boolean;
  onEnd: (id: string) => void;
  onCover: (opened: boolean) => void;
  onPanel: () => void;
}) {
  return (
    <div className="lighting-round">
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
          <dt>槽内净深</dt>
          <dd>{(check.clearDepth * 1000).toFixed(0)} mm</dd>
        </div>
      </dl>
      <small>
        移开横段和所选竖段的槽盖可查看接合口。槽腔取自样板尺寸，实际敷线与占用待核实。
      </small>
      <button disabled={!ready} onClick={onPanel}>
        定位 {check.panel.name} ↗
      </button>
    </div>
  );
}
