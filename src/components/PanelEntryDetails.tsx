import {
  panelPortCenter,
  panelPortNumbers,
  panelSettings,
  type PanelPort,
} from "../patch-panels";
import {
  panelEntryMeasure,
  racewaySections,
  racewayPanels,
  racewayTrunk,
  racewayAxisSpan,
} from "../panel-raceway";

const mm = (meters: number) => Math.round(meters * 1000);
const stops = [...racewayPanels, ...racewaySections].sort(
  (a, b) => a.position[0] - b.position[0],
);

export function PanelEntryDetails({
  selected,
  target,
  ready,
  onLocate,
}: {
  selected: string;
  target: PanelPort;
  ready: boolean;
  onLocate: (id: string) => void;
}) {
  const placement = panelEntryMeasure(selected, target);
  const { size, apertureSize } = panelSettings;
  return (
    <div className="panel-entry-layout">
      <label>
        布置位置
        <select
          disabled={!ready}
          value={selected}
          onChange={(e) => onLocate(e.target.value)}
        >
          {stops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {placement ? (
        <>
          <svg
            viewBox={[
              -mm(size[0]) / 2 - 12,
              -mm(size[1]) / 2 - 49,
              mm(size[0]) + 24,
              mm(size[1]) + 63,
            ].join(" ")}
            role="img"
            aria-label={placement.panel.name + "箱顶入盒与正面孔位局部立面"}
          >
            <rect
              className="entry-case"
              x={-mm(size[0]) / 2}
              y={-mm(placement.top)}
              width={mm(size[0])}
              height={mm(size[1])}
            />
            <rect
              className="entry-channel"
              x={mm(placement.entryX) - mm(placement.drop.sectionSize[0]) / 2}
              y={-mm(placement.top) - 42}
              width={mm(placement.drop.sectionSize[0])}
              height={42}
            />
            {panelPortNumbers.map((n) => {
              const [x, y] = panelPortCenter(n);
              return (
                <g key={n}>
                  <rect
                    className={
                      placement.hole?.endpoint.port === n
                        ? "entry-port active"
                        : "entry-port"
                    }
                    x={mm(x - apertureSize[0] / 2)}
                    y={-mm(y + apertureSize[1] / 2)}
                    width={mm(apertureSize[0])}
                    height={mm(apertureSize[1])}
                  />
                  <text x={mm(x)} y={-mm(y) - 16} textAnchor="middle">
                    {String(n).padStart(2, "0")}
                  </text>
                </g>
              );
            })}
            {placement.hole && (
              <path
                className="entry-projection"
                d={`M ${mm(placement.hole.x)} ${-mm(placement.hole.y)} V ${-mm(placement.top)} H ${mm(placement.entryX)}`}
              />
            )}
            <circle
              className="entry-center"
              cx={mm(placement.entryX)}
              cy={-mm(placement.top)}
              r={4}
            />
          </svg>
          <strong>
            {placement.panel.name} ·{" "}
            {placement.hole
              ? "孔 " + String(placement.hole.endpoint.port).padStart(2, "0")
              : "对端未登记"}
          </strong>
          {placement.hole && (
            <p>
              由孔心到箱顶入口，
              <span className="entry-offset">
                {Math.abs(placement.hole.dx) < 0.0005
                  ? "水平对齐"
                  : `向${placement.hole.dx > 0 ? "右" : "左"} ${mm(Math.abs(placement.hole.dx))} mm`}
              </span>
              、
              <span className="entry-offset">
                向上 {mm(placement.hole.rise)} mm
              </span>
              。
            </p>
          )}
          <small>
            入盒竖段高 {mm(placement.drop.sectionSize[1])}{" "}
            mm。按样板正立面量取，槽内敷线待核实。
          </small>
        </>
      ) : (
        <>
          <svg
            viewBox={[
              racewayTrunk.position[0] - racewayTrunk.sectionSize[0] / 2 - 0.5,
              -racewayTrunk.position[1] - 0.22,
              racewayTrunk.sectionSize[0] + 1,
              racewayTrunk.position[1] -
                Math.min(...racewayPanels.map((p) => p.position[1])) +
                0.55,
            ].join(" ")}
            role="img"
            aria-label="后墙两块面板、两段入盒线槽及横段正立面"
          >
            {stops.map((s) => {
              const [w, h] = "sectionSize" in s ? s.sectionSize : size;
              return (
                <rect
                  key={s.id}
                  x={s.position[0] - w / 2}
                  y={-s.position[1] - h / 2}
                  width={w}
                  height={h}
                  fill={s.id === selected ? "#93cfcd" : "#566e7a"}
                  stroke="#afc1cc"
                  strokeWidth={0.015}
                />
              );
            })}
          </svg>
          <strong>后墙横段</strong>
          <p>
            两侧入盒中心轴距 {mm(racewayAxisSpan)} mm，槽盖所在横段外缘跨度{" "}
            {mm(racewayTrunk.sectionSize[0])} mm。
          </p>
          <small>距离取自布置配置，实际线长待核实。</small>
        </>
      )}
    </div>
  );
}
