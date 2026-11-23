import { trayRelations } from "../cable-trays";
import type { FixtureCrossing } from "../fixture-crossing";

type LightingCrossing = Extract<
  FixtureCrossing,
  { kind: "light-tray" | "lighting-round" }
>;

export function LightingRoundDetails({
  pair,
  ready,
  onRack,
  onLocate,
  onHistory,
  onSource,
}: {
  pair: LightingCrossing;
  ready: boolean;
  onRack: (id: string) => void;
  onLocate: (id: string) => void;
  onHistory: (id: string) => void;
  onSource: () => void;
}) {
  const route = pair.kind === "lighting-round" ? pair : null;
  const source = pair.kind === "light-tray" ? pair : pair.source;
  return (
    <div className="lighting-round">
      {route && (
        <>
          <strong>
            {source.light.name} × {source.tray.name} × {route.lower.name}
          </strong>
          <dl>
            <div>
              <dt>灯罩底面 / 侧梁顶面</dt>
              <dd>
                {source.points[0].y.toFixed(3)} /{" "}
                {source.points[1].y.toFixed(3)} m
              </dd>
            </div>
            <div>
              <dt>横档底面 / 柜顶板</dt>
              <dd>
                {route.points[0].y.toFixed(3)} / {route.points[1].y.toFixed(3)}{" "}
                m
              </dd>
            </div>
          </dl>
          <p>
            从灯桥交叉处到柜顶横档，沿机房 X 方向偏移{" "}
            {route.alongX > 0 ? "+" : ""}
            {route.alongX.toFixed(3)} m。两处括线各量一对配置表面的高差。
          </p>
        </>
      )}
      <label>
        桥架下方机柜
        <select
          disabled={!ready}
          value={route?.lower.id ?? ""}
          onChange={(e) => onRack(e.target.value)}
        >
          <option value="" disabled>
            选择机柜同框核对
          </option>
          {trayRelations(source.tray.id).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <div className="lighting-locations">
        {[source.light, source.tray, ...(route ? [route.lower] : [])].map(
          (f) => (
            <button key={f.id} disabled={!ready} onClick={() => onLocate(f.id)}>
              定位{f.name}
            </button>
          ),
        )}
      </div>
      {route && (
        <>
          <button disabled={!ready} onClick={() => onHistory(route.lower.id)}>
            回看{route.lower.name}设备汇总 ↗
          </button>
          <button disabled={!ready} onClick={onSource}>
            再看灯桥交叉高度
          </button>
        </>
      )}
      <small>灯具、桥架和柜排为配置布置。照明开关、功率和照度均未接入。</small>
    </div>
  );
}
