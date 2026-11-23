import { condensate, condensateSource, drainStands, rim } from "../condensate";
import { footCorners, type DrainStand } from "../drain-foot";
import type { Point } from "../planar-gap";
import { leakDetection } from "../leak-detection";

const path = leakDetection.sensingPoints;
const [cx, , cz] = condensateSource.position;
const [width, , depth] = condensateSource.size;
const minX = Math.min(
  cx - width / 2,
  rim[0] - condensate.rimRadius,
  ...path.map((p) => p[0]),
);
const maxX = Math.max(
  cx + width / 2,
  rim[0] + condensate.rimRadius,
  ...path.map((p) => p[0]),
);
const minZ = Math.min(
  cz - depth / 2,
  rim[2] - condensate.rimRadius,
  ...path.map((p) => p[2]),
);
const maxZ = Math.max(
  cz + depth / 2,
  rim[2] + condensate.rimRadius,
  ...path.map((p) => p[2]),
);
const scale = Math.min(216 / (maxX - minX), 130 / (maxZ - minZ));
// 与柜旁地面核对的固定俯视镜头同向：+X 向左，+Z 向上。
const x = (v: number) => 124 - (v - (maxX + minX) / 2) * scale;
const z = (v: number) => 82 - (v - (maxZ + minZ) / 2) * scale;

export function DrainFloorPlan({
  segment,
  point,
  stand,
  edge,
}: {
  segment: number;
  point: number[];
  stand?: DrainStand;
  edge?: Point;
}) {
  return (
    <svg
      className="drain-floor-plan"
      viewBox="0 0 248 170"
      role="img"
      aria-label={`${stand?.name ?? "接水斗"}与感应段 ${segment} 的地面投影，虚线连接量取位置和所选点`}
    >
      <text x={5} y={14}>
        ← X · Z ↑
      </text>
      <rect
        x={x(cx + width / 2)}
        y={z(cz + depth / 2)}
        width={width * scale}
        height={depth * scale}
        fill="#344c5b"
        stroke="#7e99a8"
      />
      <text x={x(cx)} y={z(cz) + 4} textAnchor="middle">
        制冷柜
      </text>
      {path.slice(1).map((end, i) => {
        const start = path[i];
        return (
          <g key={i}>
            <line
              x1={x(start[0])}
              y1={z(start[2])}
              x2={x(end[0])}
              y2={z(end[2])}
              stroke={segment === i + 1 ? "#a2e8db" : "#81959f"}
              strokeWidth={segment === i + 1 ? 3 : 1.5}
            />
            <text
              x={x((start[0] + end[0]) / 2) + (start[0] === end[0] ? -10 : 0)}
              y={
                z((start[2] + end[2]) / 2) +
                (start[2] === end[2] ? (start[2] > cz ? -5 : 14) : 4)
              }
              textAnchor="middle"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
      <circle
        cx={x(rim[0])}
        cy={z(rim[2])}
        r={condensate.rimRadius * scale}
        stroke="#d3bc8a"
        fill="#443e32"
      />
      {stand &&
        drainStands.map((s) => {
          const [, , max] = footCorners(s);
          const [w, , d] = condensate.supports.footSize;
          return (
            <rect
              key={s.id}
              x={x(max.x)}
              y={z(max.z)}
              width={w * scale}
              height={d * scale}
              fill={s.id === stand.id ? "#fedc92" : "#71939d"}
            />
          );
        })}
      <line
        x1={x(edge?.x ?? rim[0])}
        y1={z(edge?.z ?? rim[2])}
        x2={x(point[0])}
        y2={z(point[2])}
        stroke="#ead49f"
        strokeDasharray="3 2"
      />
      <circle
        cx={x(point[0])}
        cy={z(point[2])}
        r={3.5}
        fill="#fff0c3"
        stroke="#283333"
      />
      <text
        x={x(rim[0]) + condensate.rimRadius * scale + 4}
        y={z(rim[2]) + 4}
        textAnchor="start"
      >
        斗口
      </text>
    </svg>
  );
}
