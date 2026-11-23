import {
  condensate,
  condensateFloorY,
  drainStands,
  turn,
  elbow,
  rim,
  mouth,
} from "../condensate";

// 从柜体东侧观察，+Z 指向图左；纵横均按米使用同一比例。
export function DrainProfile({ selected }: { selected: string }) {
  const scale = 192;
  const x = (z: number) => 158 - (z - turn[2]) * scale;
  const y = (h: number) => 21 + (turn[1] - h) * scale;
  const floor = y(condensateFloorY);
  return (
    <svg
      className="drain-support-profile"
      viewBox="0 0 224 143"
      role="img"
      aria-label="排水管侧视图，从右侧上游弯头沿斜管到左侧斗口，两根支座落在地面上"
    >
      <path d={`M 30 ${floor} H 198`} stroke="#59707c" />
      <path
        d={`M ${x(turn[2])} ${y(turn[1])} L ${x(elbow[2])} ${y(elbow[1])} V ${y(mouth[1])}`}
        stroke="#c0d4d7"
        strokeWidth={4}
        fill="none"
      />
      <path
        d={`M ${x(rim[2]) - condensate.rimRadius * scale} ${y(rim[1])} L ${x(rim[2]) - condensate.stemRadius * scale} ${y(rim[1] - condensate.bowlDepth)} V ${floor} H ${x(rim[2]) + condensate.stemRadius * scale} V ${y(rim[1] - condensate.bowlDepth)} L ${x(rim[2]) + condensate.rimRadius * scale} ${y(rim[1])} Z`}
        fill="#708590"
      />
      {drainStands.map(({ id, name, axis, offset }) => (
        <g key={id} stroke={id === selected ? "#8ae7d6" : "#90a4ac"}>
          <line
            x1={x(axis[2])}
            x2={x(axis[2])}
            y1={y(axis[1])}
            y2={floor}
            strokeWidth={3}
          />
          <line
            x1={x(axis[2]) - 7}
            x2={x(axis[2]) + 7}
            y1={floor - 1}
            y2={floor - 1}
            strokeWidth={3}
          />
          <circle
            cx={x(axis[2])}
            cy={y(axis[1])}
            r={4}
            fill="none"
            strokeWidth={2}
          />
          <text
            x={x(axis[2]) + (offset < condensate.run / 2 ? 5 : -5)}
            y={y(axis[1]) + 48}
            textAnchor={offset < condensate.run / 2 ? "start" : "end"}
            fill="currentColor"
            fontSize={11}
            stroke="none"
          >
            {name.replace("排水管", "")}
          </text>
        </g>
      ))}
    </svg>
  );
}
