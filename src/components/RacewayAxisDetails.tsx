import { useEffect, useId, useRef } from "react";
import type { FixtureCrossing } from "../fixture-crossing";
import { panelPortLabel, panelTermination } from "../patch-panels";

type Inspection = Extract<FixtureCrossing, { kind: "raceway-axis" }>;

export function RacewayAxisDetails({
  inspection,
  ready,
  onPosition,
}: {
  inspection: Inspection;
  ready: boolean;
  onPosition: (basePanelId: string, station: number) => void;
}) {
  const { axis, origin } = inspection;
  const record = panelTermination(origin);
  const stationId = useId();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (input.current) input.current.value = axis.station.toFixed(3);
  }, [axis]);

  return (
    <div className="lighting-round">
      <div className="raceway-registration">
        <strong>{record ? `端接登记 · ${record.id}` : "对端孔未登记"}</strong>
        <small>
          {panelPortLabel(origin)}
          {record && ` ↔ ${panelPortLabel(record.peer)}`}
        </small>
      </div>
      <label>
        量取起点
        <select
          value={axis.basePanelId}
          disabled={!ready}
          onChange={(event) => {
            const base = event.target.value;
            onPosition(
              base,
              base === axis.panels[0].id ? axis.fromWest : axis.fromEast,
            );
          }}
        >
          {axis.panels.map((panel) => (
            <option key={panel.id} value={panel.id}>
              {panel.name.split(" ")[0]} 箱顶
            </option>
          ))}
        </select>
      </label>
      <label>
        核对槽段
        <select
          value={axis.index}
          disabled={!ready}
          onChange={(event) =>
            onPosition(
              axis.basePanelId,
              axis.segments[Number(event.target.value)].center,
            )
          }
        >
          {axis.segments.map(({ section, index, length }) => (
            <option key={section.id} value={index}>
              {section.name} · {length.toFixed(3)} m
            </option>
          ))}
        </select>
      </label>
      <form
        className="raceway-axis-distance"
        onSubmit={(event) => {
          event.preventDefault();
          const station = input.current?.valueAsNumber;
          if (ready && station !== undefined && Number.isFinite(station))
            onPosition(axis.basePanelId, station);
        }}
      >
        <label htmlFor={stationId}>沿轴里程（m）</label>
        <input
          ref={input}
          id={stationId}
          type="number"
          required
          min="0"
          max={Number(axis.total.toFixed(6))}
          step="0.001"
        />
        <button disabled={!ready} type="submit" aria-label="按里程定位">
          定位
        </button>
      </form>
      <dl>
        <div>
          <dt>距西侧箱顶 / 距东侧箱顶</dt>
          <dd>
            {axis.fromWest.toFixed(3)} / {axis.fromEast.toFixed(3)} m
          </dd>
        </div>
        <div>
          <dt>轴线总长</dt>
          <dd>{axis.total.toFixed(3)} m</dd>
        </div>
      </dl>
      <details>
        <summary>量取依据</summary>
        <p>
          尺线投到槽盖前方。里程沿两个箱顶入盒中心与横槽中线累计，转角中心归横槽。现场敷线与实际线长待核实。
        </p>
      </details>
    </div>
  );
}
