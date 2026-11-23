import {
  type RearWallItem,
  rearWallItems,
  rearWallSize,
  rearWallNeighbor,
} from "../rear-wall";
import { roomLayoutMatches } from "../room-layout";

function AdjacentOutlines({
  item,
  near,
}: {
  item: RearWallItem;
  near: ReturnType<typeof rearWallNeighbor>;
}) {
  const pair = [item, near.peer];
  const left = Math.min(...pair.map((f) => f.x - f.width / 2)),
    right = Math.max(...pair.map((f) => f.x + f.width / 2));
  const bottom = Math.min(...pair.map((f) => f.height - f.boxHeight / 2)),
    top = Math.max(...pair.map((f) => f.height + f.boxHeight / 2));
  const scale = Math.min(222 / (right - left), 52 / (top - bottom));
  const x = (n: number) => 120 + (n - (left + right) / 2) * scale,
    y = (n: number) => 34 - (n - (bottom + top) / 2) * scale;
  return (
    <svg
      className="wall-inset"
      viewBox="0 0 240 68"
      aria-label={`${item.name}与${near.peer.name}的立面外缘`}
      role="img"
    >
      {pair.map((f) => (
        <rect
          key={f.id}
          className="wall-outline"
          data-active={f === item}
          data-peer={f !== item}
          x={x(f.x - f.width / 2)}
          y={y(f.height + f.boxHeight / 2)}
          width={f.width * scale}
          height={f.boxHeight * scale}
        />
      ))}
      <line
        className="wall-measure"
        x1={x(near.x1)}
        y1={y(near.y1)}
        x2={x(near.x2)}
        y2={y(near.y2)}
      />
    </svg>
  );
}

export function RearWallElevation({
  selected,
  query,
  ready,
  onPreview,
  onInspect,
}: {
  selected: string;
  query: string;
  ready: boolean;
  onPreview: (id: string) => void;
  onInspect: (origin: string, target: string) => void;
}) {
  const matches = rearWallItems.filter((f) => roomLayoutMatches(f, query));
  const current = matches.find((f) => f.id === selected);
  const near = current && rearWallNeighbor(current);
  const scale = 256 / rearWallSize.width;
  const floor = 24 + rearWallSize.height * scale;
  const x = (n: number) => 140 + n * scale,
    y = (n: number) => floor - n * scale;
  return (
    <section className="rear-wall" aria-label="后墙立面">
      <svg
        viewBox={`0 0 280 ${floor + 22}`}
        role="img"
        aria-label="从室内面向后墙的安装外轮廓"
      >
        <rect
          x={12}
          y={24}
          width={256}
          height={floor - 24}
          className="room-layout-boundary"
        />
        <text x={12} y={16}>
          西 · −X
        </text>
        <text x={268} y={16} textAnchor="end">
          东 · +X
        </text>
        {rearWallItems.map((f) => (
          <rect
            key={f.id}
            className="wall-outline"
            data-system={f.system}
            data-match={matches.includes(f)}
            onClick={matches.includes(f) ? () => onPreview(f.id) : undefined}
            data-wall-shape={f.id}
            data-active={f === current}
            data-peer={f.id === near?.peer.id}
            x={x(f.x - f.width / 2)}
            y={y(f.height + f.boxHeight / 2)}
            width={f.width * scale}
            height={f.boxHeight * scale}
          >
            <title>{f.name}</title>
          </rect>
        ))}
        {rearWallItems
          .filter((f) => f.shape === "面板" || f.shape === "洞口")
          .map((f) => (
            <text
              key={f.id}
              className="wall-label"
              x={x(f.x)}
              y={
                f.shape === "洞口"
                  ? y(f.height + f.boxHeight / 2) - 6
                  : y(f.height - f.boxHeight / 2) + 14
              }
              textAnchor={f.shape === "洞口" ? "end" : "middle"}
            >
              {f.shape === "洞口" ? "入口" : f.short}
            </text>
          ))}
        {near && (
          <line
            className="wall-measure"
            x1={x(near.x1)}
            y1={y(near.y1)}
            x2={x(near.x2)}
            y2={y(near.y2)}
          />
        )}
        <text x={12} y={floor + 15}>
          地面 · Y = 0 m
        </text>
        <path
          className="wall-scale"
          d={`M ${268 - scale},${floor + 9} v4 h${scale} v-4`}
        />
        <text x={264 - scale} y={floor + 16} textAnchor="end">
          1 m
        </text>
      </svg>
      <div className="wall-rows" aria-label="后墙设施名单">
        {matches.map((f) => (
          <div
            key={f.id}
            className="wall-row"
            data-selected={f.id === selected}
          >
            <button
              type="button"
              data-wall-row={f.id}
              aria-pressed={f.id === selected}
              onClick={() => onPreview(f.id)}
            >
              <strong>{f.name}</strong>
              <small>
                {f.shape}中心高 {f.height.toFixed(3)} m
              </small>
            </button>
            {f.id === selected && (
              <button
                disabled={!ready}
                aria-label={`定位 ${f.name}`}
                onClick={() => onInspect(f.id, f.id)}
              >
                定位 ↗
              </button>
            )}
            {current === f && near && (
              <section className="wall-neighbor" aria-label="跨组相邻布置">
                <AdjacentOutlines item={current} near={near} />
                <p>
                  最近的{near.peer.system}设施为「
                  {near.peer.name}」，两处外缘在立面相距{" "}
                  {near.distance.toFixed(3)} m。
                </p>
                <button
                  disabled={!ready}
                  onClick={() => onInspect(current.id, near.peer.id)}
                >
                  定位{near.peer.name} ↗
                </button>
              </section>
            )}
          </div>
        ))}
      </div>
      <p>
        按安装外缘投影到 X/Y
        平面。洞口含门框，灯具按箱体计；现场净距、走线与接线另行核实。
      </p>
    </section>
  );
}
